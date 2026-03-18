import { makeAutoObservable, action } from 'mobx'
import { TREES, getTreeById } from '../data/trees'
import { ACHIEVEMENTS, type AchievementCheck } from '../data/achievements'

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

// Курсы обмена
export const COINS_PER_DIAMOND = 1000   // 1000 монет = 1 алмаз
export const DIAMONDS_PER_RUBLE = 100   // 100 алмазов = 1 рубль

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

  // Бусты деревьев
  treeBoosts: ActiveBoost[] = []

  // Погода
  activeWeatherEvent: WeatherEvent | null = null
  private lastWeatherCheck = 0

  // Ежедневный бонус
  dailyStreak = 0
  lastDailyClaimDate = ''

  // Достижения
  claimedAchievements: string[] = []
  totalHarvested = 0

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

    return this.ownedTrees.reduce((sum, ot) => {
      const tree = getTreeById(ot.treeId)
      if (!tree) return sum
      const boost = this.treeBoosts.find(b => b.treeId === ot.treeId && b.expiresAt > now)
      const boostMult = boost ? boost.multiplier : 1
      return sum + tree.incomePerHour * ot.count * boostMult
    }, 0) * weatherMult
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

  getActiveBoost(treeId: string): ActiveBoost | null {
    const now = Date.now()
    return this.treeBoosts.find(b => b.treeId === treeId && b.expiresAt > now) ?? null
  }

  // ─── Тик ───────────────────────────────────────────────────────────────────

  startTicking() {
    setInterval(action(() => {
      this.tick()
      this.save()
    }), TICK_MS)
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

  // ─── Оффлайн доход ─────────────────────────────────────────────────────────

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

  harvest() {
    if (!this.canHarvest) return 0
    const amount = Math.floor(this.storageUsed)
    this.coins += amount
    this.storageUsed = 0
    this.totalHarvested++
    this.checkLevelUp()
    this.checkAchievements()
    return amount
  }

  // ─── Покупка дерева ────────────────────────────────────────────────────────

  buyTree(treeId: string): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false

    if (tree.costCurrency === 'free') {
      this.addOwnedTree(treeId)
      this.checkAchievements()
      return true
    }
    if (tree.costCurrency === 'soft' && this.coins >= tree.cost) {
      this.coins -= tree.cost
      this.addOwnedTree(treeId)
      this.checkAchievements()
      return true
    }
    if (tree.costCurrency === 'hard' && this.goldCoins >= tree.cost) {
      this.goldCoins -= tree.cost
      this.addOwnedTree(treeId)
      this.checkAchievements()
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

  // ─── Апгрейд деревьев ──────────────────────────────────────────────────────

  upgradeTree(treeId: string, tier: 'bronze' | 'silver' | 'gold'): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false
    const tierDef = tree.upgrades.find(u => u.tier === tier)
    if (!tierDef) return false

    // Проверяем, нет ли активного буста
    const existing = this.getActiveBoost(treeId)
    if (existing) return false

    // Списываем стоимость
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

  // ─── Уровень игрока ────────────────────────────────────────────────────────

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

  // ─── Погодные события ──────────────────────────────────────────────────────

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

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: this.coins,
      goldCoins: this.goldCoins,
      rubles: this.rubles,
      level: this.level,
      ownedTrees: this.ownedTrees,
      storageUsed: this.storageUsed,
      storageCapacity: this.storageCapacity,
      lastTickTime: Date.now(),
      treeBoosts: this.treeBoosts,
      activeWeatherEvent: this.activeWeatherEvent,
      dailyStreak: this.dailyStreak,
      lastDailyClaimDate: this.lastDailyClaimDate,
      claimedAchievements: this.claimedAchievements,
      totalHarvested: this.totalHarvested,
    }))
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) {
        this.addOwnedTree('apple')
        this.coins = 50
        return
      }
      const data = JSON.parse(raw)
      this.coins = data.coins ?? 0
      this.goldCoins = data.goldCoins ?? 0
      this.rubles = data.rubles ?? 0
      this.level = data.level ?? 1
      this.ownedTrees = data.ownedTrees ?? []
      this.storageUsed = data.storageUsed ?? 0
      this.storageCapacity = data.storageCapacity ?? 200
      this.lastTickTime = data.lastTickTime ?? Date.now()
      this.treeBoosts = data.treeBoosts ?? []
      this.activeWeatherEvent = data.activeWeatherEvent ?? null
      this.dailyStreak = data.dailyStreak ?? 0
      this.lastDailyClaimDate = data.lastDailyClaimDate ?? ''
      this.claimedAchievements = data.claimedAchievements ?? []
      this.totalHarvested = data.totalHarvested ?? 0
      this.applyOfflineEarnings()
    } catch {
      this.addOwnedTree('apple')
      this.coins = 50
    }
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
    this.addOwnedTree('apple')
  }

  get shopTrees() {
    return TREES.filter(t => t.costCurrency !== 'free')
  }
}

export const gameStore = new GameStore()
