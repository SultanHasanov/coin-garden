import Phaser from 'phaser'
import { gameStore } from '../../stores/GameStore'
import { getTreeById, RARITY_COLORS } from '../../data/trees'
import { TREE_IMAGES } from '../../assets/treeImages'

// Слоты 3×2, чуть меньше чтобы влезли все
const COLS = 3
const ROWS = 2
const SLOT_W = 180
const SLOT_H = 175
const GAP_X = 18
const GAP_Y = 14

interface TreeSlot {
  x: number
  y: number
  container: Phaser.GameObjects.Container
  bgGfx: Phaser.GameObjects.Graphics
  treeSprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text
  nameText: Phaser.GameObjects.Text
  incomeText: Phaser.GameObjects.Text
  mask?: Phaser.Display.Masks.GeometryMask
  currentTreeId: string | null
  glowTween?: Phaser.Tweens.Tween
  swayTween?: Phaser.Tweens.Tween
}

export class GardenScene extends Phaser.Scene {
  private slots: TreeSlot[] = []
  private updateTimer = 0

  constructor() {
    super({ key: 'GardenScene' })
  }

  preload() {
    Object.entries(TREE_IMAGES).forEach(([key, url]) => {
      this.load.image(`tree_${key}`, url)
    })
  }

  create() {
    this.drawBackground()
    this.createSlots()
    this.refreshSlots()
    window.addEventListener('phaser:harvest', this.onWindowHarvest)
    window.addEventListener('phaser:treeBought', this.onWindowTreeBought)
  }

  update(_time: number, delta: number) {
    this.updateTimer += delta
    if (this.updateTimer > 2000) {
      this.updateTimer = 0
      this.refreshSlots()
    }
  }

  // ─── Фон ───────────────────────────────────────────────────────────────────

  private drawBackground() {
    const W = this.scale.width
    const H = this.scale.height

    // Небо
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x64B5F6, 0x64B5F6, 0xB3E5FC, 0xB3E5FC, 1)
    sky.fillRect(0, 0, W, H)

    // Солнце с лучами
    const sun = this.add.graphics()
    sun.fillStyle(0xFFF176, 0.35)
    sun.fillCircle(W - 68, 62, 58)
    sun.fillStyle(0xFFEE58, 1)
    sun.fillCircle(W - 68, 62, 38)

    // Облака
    this.makeCloud(90, 52, 1.0)
    this.makeCloud(W / 2 - 20, 30, 0.75)
    this.makeCloud(W - 210, 58, 0.85)

    // Земля — три слоя для глубины
    const g = this.add.graphics()
    // Тёмная земля
    g.fillStyle(0x33691E, 1)
    g.fillRect(0, H - 80, W, 80)
    // Средний слой
    g.fillGradientStyle(0x558B2F, 0x558B2F, 0x33691E, 0x33691E, 1)
    g.fillRect(0, H * 0.62, W, H * 0.38)
    // Верхняя полоска травы
    g.fillStyle(0x8BC34A, 1)
    g.fillRect(0, H * 0.60, W, 22)
    g.fillStyle(0xAED581, 1)
    g.fillRect(0, H * 0.595, W, 10)

    // Декор: маленькие цветы на траве
    const flowers = ['🌸', '🌼', '🌺', '🌻']
    for (let i = 0; i < 8; i++) {
      const fx = 40 + i * (W - 80) / 7
      const fy = H * 0.60 + 4
      this.add.text(fx, fy, flowers[i % flowers.length], {
        fontSize: '18px',
      }).setOrigin(0.5, 1).setAlpha(0.9)
    }
  }

  private makeCloud(cx: number, cy: number, scale: number) {
    const g = this.add.graphics()
    const s = scale
    g.fillStyle(0xFFFFFF, 0.92)
    g.fillEllipse(cx,       cy,      90 * s, 36 * s)
    g.fillEllipse(cx + 32 * s, cy - 14 * s, 64 * s, 32 * s)
    g.fillEllipse(cx - 28 * s, cy - 6 * s,  50 * s, 28 * s)
    // Анимация плавного движения
    this.tweens.add({
      targets: g,
      x: `+=${12 * s}`,
      duration: 6000 + Math.random() * 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  // ─── Слоты ─────────────────────────────────────────────────────────────────

  private createSlots() {
    const W = this.scale.width
    const H = this.scale.height

    const totalW = COLS * SLOT_W + (COLS - 1) * GAP_X
    const totalH = ROWS * SLOT_H + (ROWS - 1) * GAP_Y

    const startX = (W - totalW) / 2 + SLOT_W / 2
    const startY = H * 0.08 + SLOT_H / 2 + (H * 0.55 - H * 0.08 - totalH) / 2

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = startX + col * (SLOT_W + GAP_X)
        const y = startY + row * (SLOT_H + GAP_Y)

        const container = this.add.container(x, y)

        const bgGfx = this.add.graphics()
        this.drawSlotBg(bgGfx, 0, 0, null)
        container.add(bgGfx)

        const treeSprite = this.add.text(0, -10, '🌱', {
          fontSize: '48px',
        }).setOrigin(0.5)
        container.add(treeSprite)

        const nameText = this.add.text(0, 58, 'Пустой слот', {
          fontSize: '12px',
          color: '#90A4AE',
          fontStyle: 'bold',
        }).setOrigin(0.5)
        container.add(nameText)

        const incomeText = this.add.text(0, 74, 'Купи дерево', {
          fontSize: '10px',
          color: '#607D8B',
        }).setOrigin(0.5)
        container.add(incomeText)

        this.slots.push({
          x, y, container, bgGfx,
          treeSprite, nameText, incomeText,
          currentTreeId: null,
        })
      }
    }
  }

  private drawSlotBg(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rarityHex: string | null) {
    g.clear()
    const hw = SLOT_W / 2 - 4
    const hh = SLOT_H / 2 - 4

    // Тень под слотом
    g.fillStyle(0x000000, 0.25)
    g.fillRoundedRect(cx - hw + 4, cy - hh + 5, SLOT_W - 8, SLOT_H - 8, 18)

    // Основной фон — тёмно-зелёный
    g.fillStyle(0x1B5E20, 0.7)
    g.fillRoundedRect(cx - hw, cy - hh, SLOT_W - 8, SLOT_H - 8, 18)

    // Внутренний светлый блик сверху
    g.fillStyle(0xFFFFFF, 0.07)
    g.fillRoundedRect(cx - hw + 4, cy - hh + 4, SLOT_W - 16, (SLOT_H - 8) * 0.4, 14)

    // Рамка — цвет редкости или обычная зелёная
    const border = rarityHex ? parseInt(rarityHex.replace('#', ''), 16) : 0x4CAF50
    const alpha = rarityHex ? 1.0 : 0.5
    g.lineStyle(rarityHex ? 3 : 2, border, alpha)
    g.strokeRoundedRect(cx - hw, cy - hh, SLOT_W - 8, SLOT_H - 8, 18)

    // Свечение для редких
    if (rarityHex) {
      g.lineStyle(8, border, 0.15)
      g.strokeRoundedRect(cx - hw - 4, cy - hh - 4, SLOT_W, SLOT_H, 22)
    }
  }

  // ─── Обновление слотов ─────────────────────────────────────────────────────

  private refreshSlots() {
    const treesFlat: string[] = []
    for (const ot of gameStore.ownedTrees) {
      for (let i = 0; i < ot.count; i++) treesFlat.push(ot.treeId)
    }

    this.slots.forEach((slot, i) => {
      const treeId = treesFlat[i] ?? null
      if (slot.currentTreeId === treeId) return
      slot.currentTreeId = treeId

      slot.glowTween?.stop()
      slot.swayTween?.stop()
      slot.glowTween = undefined
      slot.swayTween = undefined
      slot.treeSprite.destroy()
      slot.mask?.destroy()
      slot.mask = undefined

      if (!treeId) {
        this.drawSlotBg(slot.bgGfx, 0, 0, null)
        const sp = this.add.text(0, -10, '🌱', { fontSize: '48px' }).setOrigin(0.5)
        slot.container.add(sp)
        slot.treeSprite = sp
        slot.nameText.setText('Пустой слот').setColor('#90A4AE')
        slot.incomeText.setText('Купи дерево').setColor('#607D8B')
        return
      }

      const tree = getTreeById(treeId)
      if (!tree) return

      const rarityColor = RARITY_COLORS[tree.rarity]
      this.drawSlotBg(slot.bgGfx, 0, 0, rarityColor)
      slot.nameText.setText(tree.name).setColor('#FFFFFF')
      slot.incomeText.setText(`+${tree.incomePerHour}/час`).setColor('#FFD700')

      const key = `tree_${treeId}`
      if (this.textures.exists(key)) {
        const img = this.add.image(0, -8, key)

        // Вписываем в слот с учётом отступов и текстов снизу
        const maxW = SLOT_W - 28
        const maxH = SLOT_H - 60
        const scl = Math.min(maxW / img.width, maxH / img.height)
        img.setScale(scl)

        // Маска — обрезаем изображение по форме слота, убирает белый фон по краям
        const maskGfx = this.make.graphics({ x: slot.x, y: slot.y })
        maskGfx.fillStyle(0xffffff)
        maskGfx.fillRoundedRect(
          -(SLOT_W / 2 - 10),
          -(SLOT_H / 2 - 10),
          SLOT_W - 20,
          SLOT_H - 52,
          14
        )
        const mask = maskGfx.createGeometryMask()
        img.setMask(mask)
        slot.mask = mask

        slot.container.add(img)
        slot.treeSprite = img

        // Анимации по редкости
        this.applyTreeAnimation(slot, tree.rarity)
      } else {
        const sp = this.add.text(0, -10, tree.emoji, { fontSize: '60px' }).setOrigin(0.5)
        slot.container.add(sp)
        slot.treeSprite = sp
        this.applyTreeAnimation(slot, tree.rarity)
      }
    })
  }

  private applyTreeAnimation(slot: TreeSlot, rarity: string) {
    const t = slot.treeSprite
    const baseScaleX = t.scaleX
    const baseScaleY = t.scaleY

    if (rarity === 'legendary') {
      slot.glowTween = this.tweens.add({
        targets: t,
        scaleX: baseScaleX * 1.06,
        scaleY: baseScaleY * 1.06,
        duration: 800,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      })
      this.addGoldenParticles(slot.container)
    } else if (rarity === 'epic') {
      slot.glowTween = this.tweens.add({
        targets: t,
        scaleX: baseScaleX * 1.04,
        scaleY: baseScaleY * 1.04,
        duration: 1000,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      })
    } else {
      slot.swayTween = this.tweens.add({
        targets: t,
        angle: { from: -3, to: 3 },
        duration: 2000 + Math.random() * 1000,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }

  private addGoldenParticles(container: Phaser.GameObjects.Container) {
    for (let i = 0; i < 5; i++) {
      const px = Phaser.Math.Between(-55, 55)
      const py = Phaser.Math.Between(-55, 30)
      const star = this.add.text(px, py, '✨', { fontSize: '13px' })
        .setOrigin(0.5).setAlpha(0)
      container.add(star)
      this.tweens.add({
        targets: star,
        y: py - 28, alpha: { from: 1, to: 0 },
        duration: 1800, delay: i * 360,
        repeat: -1, ease: 'Sine.easeOut',
      })
    }
  }

  // ─── Анимация сбора монет ──────────────────────────────────────────────────

  private onHarvest = (amount: number) => {
    if (amount <= 0) return
    const count = Math.min(Math.ceil(amount / 50), 14)
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(60, this.scale.width - 60)
      const y = Phaser.Math.Between(60, this.scale.height - 100)
      const coin = this.add.text(x, y, '🪙', { fontSize: '24px' }).setOrigin(0.5)
      this.tweens.add({
        targets: coin,
        y: y - 85, alpha: { from: 1, to: 0 },
        scaleX: 1.5, scaleY: 1.5,
        duration: 1100, delay: i * 65,
        ease: 'Power2',
        onComplete: () => coin.destroy(),
      })
    }

    const label = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 20,
      `+${amount} 🪙`,
      {
        fontSize: '32px', color: '#FFD700',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
      }
    ).setOrigin(0.5).setDepth(20)

    this.tweens.add({
      targets: label, y: label.y - 60, alpha: 0,
      duration: 1400, ease: 'Power2',
      onComplete: () => label.destroy(),
    })
  }

  private onWindowHarvest = (e: Event) => this.onHarvest((e as CustomEvent).detail)
  private onWindowTreeBought = () => this.refreshSlots()

  shutdown() {
    window.removeEventListener('phaser:harvest', this.onWindowHarvest)
    window.removeEventListener('phaser:treeBought', this.onWindowTreeBought)
  }
}
