import { makeAutoObservable, action } from 'mobx'
import { TREES, getTreeById } from '../data/trees'

export interface OwnedTree {
  treeId: string
  count: number
}

const SAVE_KEY = 'coin_garden_save'
const TICK_MS = 1000

// Курсы обмена
export const COINS_PER_DIAMOND = 1000   // 1000 монет = 1 алмаз
export const DIAMONDS_PER_RUBLE = 100   // 100 алмазов = 1 рубль

class GameStore {
  coins = 0
  goldCoins = 0
  rubles = 0
  level = 1
  ownedTrees: OwnedTree[] = []
  storageUsed = 0
  storageCapacity = 200 // базовый склад
  lastTickTime = Date.now()
  shopOpen = false

  constructor() {
    makeAutoObservable(this)
    this.load()
    this.startTicking()
  }

  // ─── Геттеры ───────────────────────────────────────────────────────────────

  get totalIncomePerHour(): number {
    return this.ownedTrees.reduce((sum, ot) => {
      const tree = getTreeById(ot.treeId)
      return sum + (tree?.incomePerHour ?? 0) * ot.count
    }, 0)
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

  // ─── Тик (пассивный доход) ─────────────────────────────────────────────────

  startTicking() {
    setInterval(action(() => {
      this.tick()
      this.save()
    }), TICK_MS)
  }

  tick() {
    if (this.storageUsed >= this.storageCapacity) return
    const now = Date.now()
    const deltaSeconds = (now - this.lastTickTime) / 1000
    const earned = this.incomePerSecond * deltaSeconds
    this.storageUsed = Math.min(this.storageUsed + earned, this.storageCapacity)
    this.lastTickTime = now
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
    this.checkLevelUp()
    return amount
  }

  // ─── Покупка дерева ────────────────────────────────────────────────────────

  buyTree(treeId: string): boolean {
    const tree = getTreeById(treeId)
    if (!tree) return false

    if (tree.costCurrency === 'free') {
      this.addOwnedTree(treeId)
      return true
    }
    if (tree.costCurrency === 'soft' && this.coins >= tree.cost) {
      this.coins -= tree.cost
      this.addOwnedTree(treeId)
      return true
    }
    if (tree.costCurrency === 'hard' && this.goldCoins >= tree.cost) {
      this.goldCoins -= tree.cost
      this.addOwnedTree(treeId)
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
    if (tree) {
      this.storageCapacity += tree.storageCapacity
    }
  }

  // ─── Уровень игрока ────────────────────────────────────────────────────────

  private checkLevelUp() {
    const nextLevelCoins = this.level * 1000
    if (this.coins >= nextLevelCoins) {
      this.level++
    }
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
    }))
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) {
        // Первый запуск — даём бесплатную яблоню
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
      // Считаем оффлайн заработок
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
    this.addOwnedTree('apple')
  }

  // Все доступные деревья в магазине (включая ещё не купленные)
  get shopTrees() {
    return TREES.filter(t => t.costCurrency !== 'free')
  }
}

export const gameStore = new GameStore()
