import { makeAutoObservable, action, runInAction } from 'mobx'
import { TREES, SYNERGIES, RIVALRIES, getTreeById } from '../data/trees'
import { ACHIEVEMENTS, type AchievementCheck } from '../data/achievements'
import {
  getPlayer,
  createPlayer,
  patchPlayer,
  creditSellerRubles,
  postListing,
  deleteListing,
  type MarketListing,
} from '../services/api'

export interface OwnedTree {
  treeId: string
  count: number
}

export interface ActiveBoost {
  treeId: string
  tier: 'bronze' | 'silver' | 'gold'
  multiplier: number
  expiresAt: number
}

export interface WeatherEvent {
  type: 'sunny' | 'rain' | 'storm' | 'frost'
  label: string
  emoji: string
  multiplier: number
  expiresAt: number
}

const SAVE_KEY = 'coin_garden_save'
const TICK_MS = 1000

export const COINS_PER_DIAMOND = 1000
export const DIAMONDS_PER_RUBLE = 100

const WEATHER_EVENTS: Omit<WeatherEvent, 'expiresAt'>[] = [
  { type: 'sunny', label: 'Солнечно',  emoji: '☀️',  multiplier: 1.3 },
  { type: 'rain',  label: 'Дождь',     emoji: '🌧️', multiplier: 1.5 },
  { type: 'storm', label: 'Гроза',     emoji: '⛈️',  multiplier: 2.0 },
  { type: 'frost', label: 'Мороз',     emoji: '❄️',  multiplier: 0.7 },
]

const DAILY_REWARDS = [
  { coins: 500,    diamonds: 0  },
  { coins: 1_000,  diamonds: 0  },
  { coins: 2_500,  diamonds: 1  },
  { coins: 5_000,  diamonds: 2  },
  { coins: 10_000, diamonds: 5  },
  { coins: 25_000, diamonds: 10 },
  { coins: 50_000, diamonds: 25 },
]

class GameStore {
  coins = 0
  goldCoins = 0
  rubles = 0
  level = 1
  ownedTrees: OwnedTree[] = []
  storageUsed = 0
  storageCapacity = 200
  lastTickTime = Date.now()
  shopOpen = false

  treeBoosts: ActiveBoost[] = []

  activeWeatherEvent: WeatherEvent | null = null
  private lastWeatherCheck = 0

  dailyStreak = 0
  lastDailyClaimDate = ''

  claimedAchievements: string[] = []
  totalHarvested = 0

  fertilizerCount = 0
  treeEnhancements: Record<string, number> = {}
  seasonNumber = 1
  permanentBonus = 0

  // ── API-поля ──────────────────────────────────────────────────────────────
  telegramId: number | null = null
  playerName = ''
  playerRecordId: number | null = null
  apiSynced = false

  private apiSaveTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeAutoObservable(this)
    this.load()
    this.startTicking()
  }

  // ─── Геттеры ───────────────────────────────────────────────────────────────

  get totalIncomePerHour(): number {
    const now = Date.now()
    const weatherMult = (this.activeWeatherEvent && this.activeWeatherEvent.expiresAt > now)
      ? this.activeWeatherEvent.multiplier
      : 1

    const synergyBonus = this.activeSynergies.reduce((sum, s) => sum + s.bonusPercent, 0)
    const synergyMult = 1 + synergyBonus / 100
    const permanentMult = 1 + this.permanentBonus

    const base = this.ownedTrees.reduce((sum, ot) => {
      const tree = getTreeById(ot.treeId)
      if (!tree) return sum
      const boost = this.treeBoosts.find(b => b.treeId === ot.treeId && b.expiresAt > now)
      const boostMult = boost ? boost.multiplier : 1
      const enhancement = this.treeEnhancements[ot.treeId] ?? 0
      const enhanceMult = 1 + enhancement * 0.1
      const rivalryPenalty = this.getRivalryPenalty(ot.treeId)
      const rivalryMult = 1 - rivalryPenalty / 100
      return sum + tree.incomePerHour * ot.count * boostMult * enhanceMult * rivalryMult
    }, 0)

    return base * weatherMult * synergyMult * permanentMult
  }

  get incomePerSecond(): number {
    return this.totalIncomePerHour / 3600
  }

  get storagePercent(): number {
    return Math.min(this.storageUsed / this.storageCapacity, 1)
  }

  get storageFull(): boolean {
    return this.storageUsed >= this.storageCapacity
  }

  get canHarvest(): boolean {
    return this.storageUsed >= 1
  }

  get isDailyBonusAvailable(): boolean {
    const today = new Date().toISOString().slice(0, 10)
    return this.lastDailyClaimDate !== today
  }

  get isPrecisionZone(): boolean {
    return this.storagePercent >= 0.80 && this.storagePercent < 0.95
  }

  get activeSynergies() {
    const ownedIds = new Set(this.ownedTrees.map(ot => ot.treeId))
    return SYNERGIES.filter(s => s.requiredTreeIds.every(id => ownedIds.has(id)))
  }

  getActiveBoost(treeId: string): ActiveBoost | null {
    const now = Date.now()
    return this.treeBoosts.find(b => b.treeId === treeId && b.expiresAt > now) ?? null
  }

  getRivalryPenalty(treeId: string): number {
    const ownedIds = new Set(this.ownedTrees.map(ot => ot.treeId))
    return RIVALRIES.reduce((penalty, r) => {
      if (r.treeA === treeId && ownedIds.has(r.treeB)) return penalty + r.penaltyA
      if (r.treeB === treeId && ownedIds.has(r.treeA)) return penalty + r.penaltyB
      return penalty
    }, 0)
  }

  get activeRivalries() {
    const ownedIds = new Set(this.ownedTrees.map(ot => ot.treeId))
    return RIVALRIES.filter(r => ownedIds.has(r.treeA) && ownedIds.has(r.treeB))
  }

  // ─── Тик ───────────────────────────────────────────────────────────────────

  startTicking() {
    setInterval(action(() => {
      this.tick()
      this.saveLocal() // только localStorage, чтобы не спамить API каждую секунду
    }), TICK_MS)

    // Фоновая синхронизация с API раз в 60 секунд
    setInterval(() => {
      if (this.telegramId) this.performApiSave()
    }, 60_000)
  }

  tick() {
    if (this.storageUsed < this.storageCapacity) {
      const now = Date.now()
      const deltaSeconds = (now - this.lastTickTime) / 1000
      const earned = this.incomePerSecond * deltaSeconds
      this.storageUsed = Math.min(this.storageUsed + earned, this.storageCapacity)
      this.lastTickTime = now
    }
    this.pruneExpiredBoosts()
    this.tickWeather()
    this.checkAchievements()
  }

  applyOfflineEarnings() {
    const now = Date.now()
    const deltaSeconds = (now - this.lastTickTime) / 1000
    if (deltaSeconds < 5) return 0
    const earned = this.incomePerSecond * deltaSeconds
    const available = this.storageCapacity - this.storageUsed
    const actual = Math.min(earned, available)
    this.storageUsed += actual
    this.lastTickTime = now
    return Math.floor(actual)
  }

  // ─── Сбор урожая ───────────────────────────────────────────────────────────

  harvest(): { amount: number; precision: boolean; fertilizerDrop: boolean } {
    if (!this.canHarvest) return { amount: 0, precision: false, fertilizerDrop: false }

    const precision = this.isPrecisionZone
    let amount = Math.floor(this.storageUsed)
    if (precision) amount = Math.floor(amount * 1.2)

    const fertChance = precision ? 0.16 : 0.08
    const fertilizerDrop = Math.random() < fertChance
    if (fertilizerDrop) this.fertilizerCount++

    this.coins += amount
    this.storageUsed = 0
    this.totalHarvested++
    this.checkLevelUp()
    this.checkAchievements()
    this.save()
    return { amount, precision, fertilizerDrop }
  }

  // ─── Покупка дерева ────────────────────────────────────────────────────────

  buyTree(treeId: string): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false

    if (tree.costCurrency === 'free') {
      this.addOwnedTree(treeId)
      this.checkAchievements()
      this.save()
      return true
    }
    if (tree.costCurrency === 'soft' && this.coins >= tree.cost) {
      this.coins -= tree.cost
      this.addOwnedTree(treeId)
      this.checkAchievements()
      this.save()
      return true
    }
    if (tree.costCurrency === 'hard' && this.goldCoins >= tree.cost) {
      this.goldCoins -= tree.cost
      this.addOwnedTree(treeId)
      this.checkAchievements()
      this.save()
      return true
    }
    return false
  }

  canAfford(treeId: string): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false
    if (tree.costCurrency === 'free') return true
    if (tree.costCurrency === 'soft') return this.coins >= tree.cost
    if (tree.costCurrency === 'hard') return this.goldCoins >= tree.cost
    return false
  }

  isUnlocked(treeId: string): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false
    return this.level >= tree.unlockLevel
  }

  treeCount(treeId: string): number {
    return this.ownedTrees.find(t => t.treeId === treeId)?.count ?? 0
  }

  private addOwnedTree(treeId: string) {
    const existing = this.ownedTrees.find(t => t.treeId === treeId)
    if (existing) {
      existing.count++
    } else {
      this.ownedTrees.push({ treeId, count: 1 })
    }
    const tree = getTreeById(treeId)
    if (tree) this.storageCapacity += tree.storageCapacity
  }

  // ─── Удобрение ─────────────────────────────────────────────────────────────

  fertilizeTree(treeId: string): boolean {
    if (this.fertilizerCount <= 0) return false
    const current = this.treeEnhancements[treeId] ?? 0
    if (current >= 5) return false
    this.fertilizerCount--
    this.treeEnhancements = { ...this.treeEnhancements, [treeId]: current + 1 }
    this.checkAchievements()
    this.save()
    return true
  }

  getTreeEnhancement(treeId: string): number {
    return this.treeEnhancements[treeId] ?? 0
  }

  // ─── Апгрейд деревьев ──────────────────────────────────────────────────────

  upgradeTree(treeId: string, tier: 'bronze' | 'silver' | 'gold'): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false
    const tierDef = tree.upgrades.find(u => u.tier === tier)
    if (!tierDef) return false

    const existing = this.getActiveBoost(treeId)
    if (existing) return false

    if (tierDef.costCurrency === 'soft' && this.coins < tierDef.cost) return false
    if (tierDef.costCurrency === 'hard' && this.goldCoins < tierDef.cost) return false

    if (tierDef.costCurrency === 'soft') this.coins -= tierDef.cost
    else this.goldCoins -= tierDef.cost

    this.treeBoosts = this.treeBoosts.filter(b => b.treeId !== treeId)
    this.treeBoosts.push({
      treeId,
      tier,
      multiplier: tierDef.multiplier,
      expiresAt: Date.now() + tierDef.durationMinutes * 60 * 1000,
    })

    window.dispatchEvent(new CustomEvent('phaser:treeUpgraded', { detail: { treeId, tier } }))
    this.checkAchievements()
    this.save()
    return true
  }

  private pruneExpiredBoosts() {
    const now = Date.now()
    const before = this.treeBoosts.length
    this.treeBoosts = this.treeBoosts.filter(b => b.expiresAt > now)
    if (this.activeWeatherEvent && this.activeWeatherEvent.expiresAt <= now) {
      this.activeWeatherEvent = null
    }
    if (before !== this.treeBoosts.length) this.save()
  }

  // ─── Уровень ───────────────────────────────────────────────────────────────

  private checkLevelUp() {
    const nextLevelCoins = this.level * 1000
    if (this.coins >= nextLevelCoins) {
      this.level++
    }
  }

  // ─── Ежедневный бонус ──────────────────────────────────────────────────────

  claimDailyBonus(): { coins: number; diamonds: number } | null {
    if (!this.isDailyBonusAvailable) return null
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

    if (this.lastDailyClaimDate === yesterday) {
      this.dailyStreak++
    } else {
      this.dailyStreak = 1
    }
    this.lastDailyClaimDate = today

    const day = Math.min(this.dailyStreak, 7)
    const reward = DAILY_REWARDS[day - 1]
    this.coins += reward.coins
    this.goldCoins += reward.diamonds
    this.checkAchievements()
    this.save()
    return reward
  }

  // ─── Сезонный престиж ─────────────────────────────────────────────────────

  startNewSeason() {
    const savedGoldCoins = this.goldCoins
    const newSeasonNumber = this.seasonNumber + 1
    const newPermanentBonus = Math.min(this.permanentBonus + 0.05, 0.50)

    this.coins = 50
    this.goldCoins = savedGoldCoins
    this.rubles = 0
    this.level = 1
    this.ownedTrees = []
    this.storageUsed = 0
    this.storageCapacity = 200
    this.lastTickTime = Date.now()
    this.treeBoosts = []
    this.activeWeatherEvent = null
    this.dailyStreak = 0
    this.lastDailyClaimDate = ''
    this.claimedAchievements = []
    this.totalHarvested = 0
    this.fertilizerCount = 0
    this.treeEnhancements = {}

    this.seasonNumber = newSeasonNumber
    this.permanentBonus = newPermanentBonus

    this.addOwnedTree('apple')
    this.checkAchievements()
    this.save()
  }

  // ─── Достижения ────────────────────────────────────────────────────────────

  private checkAchievements() {
    const snap: AchievementCheck = {
      coins: this.coins,
      goldCoins: this.goldCoins,
      level: this.level,
      ownedTrees: this.ownedTrees,
      treeBoosts: this.treeBoosts,
      dailyStreak: this.dailyStreak,
      totalHarvested: this.totalHarvested,
      fertilizerCount: this.fertilizerCount,
      activeSynergiesCount: this.activeSynergies.length,
      seasonNumber: this.seasonNumber,
    }
    for (const ach of ACHIEVEMENTS) {
      if (this.claimedAchievements.includes(ach.id)) continue
      if (ach.condition(snap)) {
        this.claimedAchievements.push(ach.id)
        this.coins += ach.rewardCoins
        this.goldCoins += ach.rewardDiamonds
        window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: ach }))
      }
    }
  }

  // ─── Погода ────────────────────────────────────────────────────────────────

  private tickWeather() {
    const now = Date.now()
    if (now - this.lastWeatherCheck < 30_000) return
    this.lastWeatherCheck = now

    if (!this.activeWeatherEvent && Math.random() < 0.05) {
      this.triggerWeatherEvent()
    }
  }

  triggerWeatherEvent() {
    const ev = WEATHER_EVENTS[Math.floor(Math.random() * WEATHER_EVENTS.length)]
    this.activeWeatherEvent = {
      ...ev,
      expiresAt: Date.now() + 30 * 60 * 1000,
    }
    window.dispatchEvent(new CustomEvent('weather:changed', { detail: this.activeWeatherEvent }))
    this.save()
  }

  // ─── Магазин ───────────────────────────────────────────────────────────────

  openShop() { this.shopOpen = true }
  closeShop() { this.shopOpen = false }

  // ─── Сохранение / загрузка ─────────────────────────────────────────────────

  private getStateSnapshot() {
    return {
      coins: this.coins,
      goldCoins: this.goldCoins,
      rubles: this.rubles,
      level: this.level,
      ownedTrees: this.ownedTrees.slice(),
      storageUsed: this.storageUsed,
      storageCapacity: this.storageCapacity,
      lastTickTime: Date.now(),
      treeBoosts: this.treeBoosts.slice(),
      activeWeatherEvent: this.activeWeatherEvent,
      dailyStreak: this.dailyStreak,
      lastDailyClaimDate: this.lastDailyClaimDate,
      claimedAchievements: this.claimedAchievements.slice(),
      totalHarvested: this.totalHarvested,
      fertilizerCount: this.fertilizerCount,
      treeEnhancements: { ...this.treeEnhancements },
      seasonNumber: this.seasonNumber,
      permanentBonus: this.permanentBonus,
    }
  }

  saveLocal() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.getStateSnapshot()))
  }

  /** Сохраняет в localStorage + планирует отправку в API (дебаунс 3с) */
  save() {
    this.saveLocal()
    if (this.telegramId) this.scheduleApiSave()
  }

  private scheduleApiSave() {
    if (this.apiSaveTimer) clearTimeout(this.apiSaveTimer)
    this.apiSaveTimer = setTimeout(() => this.performApiSave(), 3_000)
  }

  private async performApiSave() {
    if (!this.telegramId) return
    const snapshot = this.getStateSnapshot()
    if (this.playerRecordId) {
      await patchPlayer(this.playerRecordId, { state: snapshot })
    } else {
      const record = await createPlayer(this.telegramId, this.playerName, snapshot)
      if (record) runInAction(() => { this.playerRecordId = record.id })
    }
  }

  private loadFromData(data: Record<string, unknown>) {
    this.coins               = (data.coins as number)              ?? 0
    this.goldCoins           = (data.goldCoins as number)          ?? 0
    this.rubles              = (data.rubles as number)             ?? 0
    this.level               = (data.level as number)              ?? 1
    this.ownedTrees          = (data.ownedTrees as OwnedTree[])    ?? []
    this.storageUsed         = (data.storageUsed as number)        ?? 0
    this.storageCapacity     = (data.storageCapacity as number)    ?? 200
    this.lastTickTime        = (data.lastTickTime as number)       ?? Date.now()
    this.treeBoosts          = (data.treeBoosts as ActiveBoost[])  ?? []
    this.activeWeatherEvent  = (data.activeWeatherEvent as WeatherEvent | null) ?? null
    this.dailyStreak         = (data.dailyStreak as number)        ?? 0
    this.lastDailyClaimDate  = (data.lastDailyClaimDate as string) ?? ''
    this.claimedAchievements = (data.claimedAchievements as string[]) ?? []
    this.totalHarvested      = (data.totalHarvested as number)     ?? 0
    this.fertilizerCount     = (data.fertilizerCount as number)    ?? 0
    this.treeEnhancements    = (data.treeEnhancements as Record<string, number>) ?? {}
    this.seasonNumber        = (data.seasonNumber as number)       ?? 1
    this.permanentBonus      = (data.permanentBonus as number)     ?? 0
    this.applyOfflineEarnings()
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) {
        this.addOwnedTree('apple')
        this.coins = 50
        return
      }
      this.loadFromData(JSON.parse(raw))
    } catch {
      this.addOwnedTree('apple')
      this.coins = 50
    }
  }

  /**
   * Вызывается из App.tsx после получения Telegram-пользователя.
   * Загружает данные из API; если запись новее локальной — заменяет состояние.
   */
  async initFromApi(telegramId: number, name: string) {
    runInAction(() => {
      this.telegramId = telegramId
      this.playerName = name
    })

    const record = await getPlayer(telegramId)

    runInAction(() => {
      if (record) {
        this.playerRecordId = record.id
        const localRaw = localStorage.getItem(SAVE_KEY)
        const localTime = localRaw ? ((JSON.parse(localRaw).lastTickTime as number) ?? 0) : 0
        const apiTime   = ((record.state.lastTickTime as number) ?? 0)

        if (apiTime > localTime) {
          // API-сохранение свежее — загружаем его
          this.loadFromData(record.state)
        }
        // Иначе оставляем локальное и при следующем save() обновим API
      }
      this.apiSynced = true
    })

    // Убеждаемся, что запись в API актуальна
    this.scheduleApiSave()
  }

  // ─── Конвертация ──────────────────────────────────────────────────────────

  convertCoinsToDiamonds(amount: number): boolean {
    const cost = amount * COINS_PER_DIAMOND
    if (this.coins < cost) return false
    this.coins -= cost
    this.goldCoins += amount
    this.save()
    return true
  }

  convertDiamondsToRubles(amount: number): boolean {
    const cost = amount * DIAMONDS_PER_RUBLE
    if (this.goldCoins < cost) return false
    this.goldCoins -= cost
    this.rubles += amount
    this.save()
    return true
  }

  convertRublesToCoins(amount: number): boolean {
    if (this.rubles < amount) return false
    const coins = amount * DIAMONDS_PER_RUBLE * COINS_PER_DIAMOND
    this.rubles -= amount
    this.coins += coins
    this.save()
    return true
  }

  cheat(coins?: number) {
    this.coins += coins ?? 999_999
    this.save()
  }

  resetSave() {
    localStorage.removeItem(SAVE_KEY)
    this.coins = 50
    this.goldCoins = 0
    this.rubles = 0
    this.level = 1
    this.ownedTrees = []
    this.storageUsed = 0
    this.storageCapacity = 200
    this.lastTickTime = Date.now()
    this.treeBoosts = []
    this.activeWeatherEvent = null
    this.dailyStreak = 0
    this.lastDailyClaimDate = ''
    this.claimedAchievements = []
    this.totalHarvested = 0
    this.fertilizerCount = 0
    this.treeEnhancements = {}
    this.seasonNumber = 1
    this.permanentBonus = 0
    this.addOwnedTree('apple')
  }

  get shopTrees() {
    return TREES.filter(t => t.costCurrency !== 'free')
  }

  // ─── Рынок ─────────────────────────────────────────────────────────────────

  /**
   * Выставляет деревья на продажу: вычитает из инвентаря, создаёт объявление.
   * Возвращает null при успехе или строку с ошибкой.
   */
  async listForSale(
    treeId: string,
    count: number,
    priceRubles: number,
  ): Promise<string | null> {
    if (!this.telegramId) return 'Требуется авторизация через Telegram'

    const tree = getTreeById(treeId)
    if (!tree) return 'Дерево не найдено'

    const owned = this.ownedTrees.find(t => t.treeId === treeId)
    if (!owned || owned.count < count) return 'Недостаточно деревьев'
    if (count <= 0 || priceRubles <= 0) return 'Некорректные значения'

    const enhancement = this.treeEnhancements[treeId] ?? 0

    // Вычитаем из инвентаря
    runInAction(() => {
      if (owned.count === count) {
        this.ownedTrees = this.ownedTrees.filter(t => t.treeId !== treeId)
      } else {
        owned.count -= count
      }
      this.storageCapacity = Math.max(200, this.storageCapacity - tree.storageCapacity * count)
      this.saveLocal()
    })

    const listing = await postListing({
      sellerId: this.telegramId,
      sellerName: this.playerName,
      treeId,
      treeName: tree.name,
      treeEmoji: tree.emoji,
      count,
      priceRubles,
      enhancementLevel: enhancement,
      createdAt: Date.now(),
    })

    if (!listing) {
      // Откат: возвращаем деревья
      runInAction(() => {
        const ex = this.ownedTrees.find(t => t.treeId === treeId)
        if (ex) ex.count += count
        else this.ownedTrees.push({ treeId, count })
        this.storageCapacity += tree.storageCapacity * count
        this.saveLocal()
      })
      return 'Ошибка сети. Попробуй ещё раз'
    }

    this.save()
    return null
  }

  /**
   * Покупает объявление с рынка: списывает рубли, добавляет деревья,
   * зачисляет рубли продавцу и удаляет объявление.
   * Возвращает null при успехе или строку с ошибкой.
   */
  async buyListing(listing: MarketListing): Promise<string | null> {
    if (!this.telegramId) return 'Требуется авторизация через Telegram'
    if (listing.sellerId === this.telegramId) return 'Нельзя купить своё объявление'
    if (this.rubles < listing.priceRubles) return 'Недостаточно рублей'

    const tree = getTreeById(listing.treeId)

    // Оптимистичное обновление
    runInAction(() => {
      this.rubles -= listing.priceRubles
      const ex = this.ownedTrees.find(t => t.treeId === listing.treeId)
      if (ex) ex.count += listing.count
      else this.ownedTrees.push({ treeId: listing.treeId, count: listing.count })
      if (tree) {
        this.storageCapacity += tree.storageCapacity * listing.count
        // Применяем уровень удобрений листинга, если он выше
        if (listing.enhancementLevel > 0) {
          const cur = this.treeEnhancements[listing.treeId] ?? 0
          if (listing.enhancementLevel > cur) {
            this.treeEnhancements = {
              ...this.treeEnhancements,
              [listing.treeId]: listing.enhancementLevel,
            }
          }
        }
      }
      this.saveLocal()
    })

    // Удаляем объявление и зачисляем продавцу
    const [deleted] = await Promise.all([
      deleteListing(listing.id),
      creditSellerRubles(listing.sellerId, listing.priceRubles),
    ])

    if (!deleted) {
      // Объявление уже недоступно — откат
      runInAction(() => {
        this.rubles += listing.priceRubles
        const ex = this.ownedTrees.find(t => t.treeId === listing.treeId)
        if (ex) {
          ex.count -= listing.count
          if (ex.count <= 0) this.ownedTrees = this.ownedTrees.filter(t => t.treeId !== listing.treeId)
        }
        if (tree) this.storageCapacity = Math.max(200, this.storageCapacity - tree.storageCapacity * listing.count)
        this.saveLocal()
      })
      return 'Объявление уже недоступно'
    }

    await this.performApiSave()
    return null
  }

  /**
   * Отзывает своё объявление с рынка и возвращает деревья в инвентарь.
   */
  async cancelListing(listing: MarketListing): Promise<string | null> {
    if (listing.sellerId !== this.telegramId) return 'Нет доступа'

    const deleted = await deleteListing(listing.id)
    if (!deleted) return 'Не удалось отозвать объявление'

    const tree = getTreeById(listing.treeId)
    runInAction(() => {
      const ex = this.ownedTrees.find(t => t.treeId === listing.treeId)
      if (ex) ex.count += listing.count
      else this.ownedTrees.push({ treeId: listing.treeId, count: listing.count })
      if (tree) this.storageCapacity += tree.storageCapacity * listing.count
      this.save()
    })

    return null
  }
}

export const gameStore = new GameStore()
