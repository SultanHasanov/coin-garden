export type TreeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type CurrencyType = 'soft' | 'hard' | 'free'

export interface TreeUpgradeTier {
  tier: 'bronze' | 'silver' | 'gold'
  label: string
  multiplier: number
  durationMinutes: number
  cost: number
  costCurrency: 'soft' | 'hard'
}

export interface Tree {
  id: string
  name: string
  emoji: string
  rarity: TreeRarity
  unlockLevel: number
  cost: number
  costCurrency: CurrencyType
  incomePerHour: number        // монет в час
  storageCapacity: number      // сколько монет вмещает это дерево
  harvestIntervalHours: number // через сколько часов склад заполняется
  description: string
  fruit: string                // название плода
  imagePrompt: string          // промпт для генерации арта
  upgrades: TreeUpgradeTier[]
}

function softUpgrades(inc: number): TreeUpgradeTier[] {
  return [
    { tier: 'bronze', label: '⚡ Бронза', multiplier: 2, durationMinutes: 30, cost: Math.max(50, inc * 5), costCurrency: 'soft' },
    { tier: 'silver', label: '🥈 Серебро', multiplier: 3, durationMinutes: 60, cost: Math.max(120, inc * 12), costCurrency: 'soft' },
    { tier: 'gold',   label: '🥇 Золото',  multiplier: 5, durationMinutes: 120, cost: Math.min(1000, Math.max(2, Math.ceil(inc / 500))), costCurrency: 'hard' },
  ]
}

function hardUpgrades(inc: number): TreeUpgradeTier[] {
  return [
    { tier: 'bronze', label: '⚡ Бронза', multiplier: 2, durationMinutes: 30, cost: Math.max(5,  Math.ceil(inc / 1000)), costCurrency: 'hard' },
    { tier: 'silver', label: '🥈 Серебро', multiplier: 3, durationMinutes: 60, cost: Math.max(10, Math.ceil(inc / 500)),  costCurrency: 'hard' },
    { tier: 'gold',   label: '🥇 Золото',  multiplier: 5, durationMinutes: 120, cost: Math.max(25, Math.ceil(inc / 250)), costCurrency: 'hard' },
  ]
}

export const TREES: Tree[] = [
  // ─── Common ────────────────────────────────────────────────────────────────
  {
    id: 'apple', name: 'Яблоня', emoji: '🍎', rarity: 'common',
    unlockLevel: 1, cost: 0, costCurrency: 'free',
    incomePerHour: 10, storageCapacity: 80, harvestIntervalHours: 8,
    description: 'Твоё первое дерево. Скромный, но надёжный доход.',
    fruit: 'Яблоко',
    imagePrompt: `Cute cartoon apple tree with round red apples, game asset style,
      bright green leaves, white blossom, pastel colors, transparent background,
      2D flat art, mobile game UI art style, chibi cute proportions,
      soft shadows, --ar 1:1 --style cute`,
    upgrades: softUpgrades(10),
  },
  {
    id: 'pear', name: 'Груша', emoji: '🍐', rarity: 'common',
    unlockLevel: 1, cost: 500, costCurrency: 'soft',
    incomePerHour: 28, storageCapacity: 224, harvestIntervalHours: 8,
    description: 'Груши зреют медленнее, но их больше.',
    fruit: 'Груша',
    imagePrompt: `Cute cartoon pear tree with golden yellow pears hanging from branches,
      game asset style, lush green leaves, soft warm colors, transparent background,
      2D flat art, mobile game UI art style, chibi cute proportions,
      gentle glow around fruits, --ar 1:1 --style cute`,
    upgrades: softUpgrades(28),
  },
  // ─── Uncommon ──────────────────────────────────────────────────────────────
  {
    id: 'cherry', name: 'Вишня', emoji: '🍒', rarity: 'uncommon',
    unlockLevel: 3, cost: 2000, costCurrency: 'soft',
    incomePerHour: 80, storageCapacity: 640, harvestIntervalHours: 8,
    description: 'Маленькие ягоды, большой доход. Вишни любят все.',
    fruit: 'Вишня',
    imagePrompt: `Adorable cartoon cherry tree covered in bright red cherries in pairs,
      game asset style, deep pink blossoms, vibrant colors, transparent background,
      2D flat art, mobile game UI art style, small cute proportions,
      sparkle effects on cherries, --ar 1:1 --style cute`,
    upgrades: softUpgrades(80),
  },
  {
    id: 'orange', name: 'Апельсин', emoji: '🍊', rarity: 'uncommon',
    unlockLevel: 5, cost: 10000, costCurrency: 'soft',
    incomePerHour: 300, storageCapacity: 2400, harvestIntervalHours: 8,
    description: 'Экзотика! Сочные апельсины ценятся дороже.',
    fruit: 'Апельсин',
    imagePrompt: `Cute cartoon orange tree with big juicy oranges, tropical feel,
      game asset style, glossy bright orange fruits, dark green waxy leaves,
      transparent background, 2D flat art, mobile game UI art,
      sun rays hitting the fruits, warm golden glow, --ar 1:1 --style cute`,
    upgrades: softUpgrades(300),
  },
  {
    id: 'lemon', name: 'Лимон', emoji: '🍋', rarity: 'uncommon',
    unlockLevel: 15, cost: 500_000, costCurrency: 'soft',
    incomePerHour: 12_000, storageCapacity: 96_000, harvestIntervalHours: 8,
    description: 'Кислый, но прибыльный. Лимоны всегда в цене.',
    fruit: 'Лимон',
    imagePrompt: `Cute cartoon lemon tree with bright yellow lemons, cheerful style,
      game asset style, shiny lemons with green leaves, transparent background,
      2D flat art, mobile game UI art, warm sunny glow, --ar 1:1 --style cute`,
    upgrades: softUpgrades(12_000),
  },
  // ─── Rare ──────────────────────────────────────────────────────────────────
  {
    id: 'mango', name: 'Манго', emoji: '🥭', rarity: 'rare',
    unlockLevel: 8, cost: 50000, costCurrency: 'soft',
    incomePerHour: 1200, storageCapacity: 9600, harvestIntervalHours: 8,
    description: 'Король фруктов. Высокий доход, но требует терпения.',
    fruit: 'Манго',
    imagePrompt: `Majestic cartoon mango tree with large golden-red mangoes,
      game asset style, lush tropical leaves, exotic feel, transparent background,
      2D flat art, mobile game UI art, premium glow effects,
      golden particles falling from tree, rich warm palette, --ar 1:1 --style cute`,
    upgrades: softUpgrades(1200),
  },
  {
    id: 'coconut', name: 'Кокосовая пальма', emoji: '🥥', rarity: 'rare',
    unlockLevel: 12, cost: 200000, costCurrency: 'soft',
    incomePerHour: 4500, storageCapacity: 36000, harvestIntervalHours: 8,
    description: 'Высокая пальма видит далеко. Огромный пассивный доход.',
    fruit: 'Кокос',
    imagePrompt: `Tall cute cartoon palm tree with big brown coconuts at the top,
      game asset style, long swaying palm leaves, tropical island vibe,
      transparent background, 2D flat art, mobile game UI art,
      ocean breeze effect, turquoise highlights, --ar 1:1 --style cute`,
    upgrades: softUpgrades(4500),
  },
  {
    id: 'fig', name: 'Инжир', emoji: '🫐', rarity: 'rare',
    unlockLevel: 17, cost: 1_500_000, costCurrency: 'soft',
    incomePerHour: 35_000, storageCapacity: 280_000, harvestIntervalHours: 8,
    description: 'Древний плод мудрости. Древние знали толк в прибыли.',
    fruit: 'Инжир',
    imagePrompt: `Cute cartoon fig tree with purple figs, ancient feel,
      game asset style, rich purple fruits, dense green foliage, transparent background,
      2D flat art, mobile game UI art, --ar 1:1 --style cute`,
    upgrades: softUpgrades(35_000),
  },
  {
    id: 'pomegranate', name: 'Гранат', emoji: '🍑', rarity: 'rare',
    unlockLevel: 20, cost: 5_000_000, costCurrency: 'soft',
    incomePerHour: 100_000, storageCapacity: 800_000, harvestIntervalHours: 8,
    description: 'Каждое зёрнышко — монетка. Гранат — дерево богатства.',
    fruit: 'Гранат',
    imagePrompt: `Cartoon pomegranate tree with red jewel-like fruits, lush and vibrant,
      game asset style, rich red fruits glowing, transparent background,
      2D flat art, mobile game UI art, --ar 1:1 --style cute`,
    upgrades: softUpgrades(100_000),
  },
  {
    id: 'durian', name: 'Дуриан', emoji: '🌵', rarity: 'rare',
    unlockLevel: 25, cost: 15_000_000, costCurrency: 'soft',
    incomePerHour: 320_000, storageCapacity: 2_560_000, harvestIntervalHours: 8,
    description: 'Король фруктов Азии. Острый запах — сладкая прибыль.',
    fruit: 'Дуриан',
    imagePrompt: `Cartoon durian tree with spiky green-yellow fruits, tropical,
      game asset style, exotic spiky fruits hanging, lush jungle foliage,
      transparent background, 2D flat art, mobile game UI art, --ar 1:1 --style cute`,
    upgrades: softUpgrades(320_000),
  },
  {
    id: 'cacao', name: 'Какао', emoji: '🍫', rarity: 'rare',
    unlockLevel: 30, cost: 50_000_000, costCurrency: 'soft',
    incomePerHour: 950_000, storageCapacity: 7_600_000, harvestIntervalHours: 8,
    description: 'Шоколадное дерево. Буквально растёт золото.',
    fruit: 'Какао-боб',
    imagePrompt: `Cute cartoon cacao tree with large brown cacao pods, chocolate vibe,
      game asset style, rich brown pods on dark trunk, tropical leaves,
      transparent background, 2D flat art, mobile game UI art, --ar 1:1 --style cute`,
    upgrades: softUpgrades(950_000),
  },
  // ─── Epic ──────────────────────────────────────────────────────────────────
  {
    id: 'dragon_fruit', name: 'Питахайя', emoji: '🐉', rarity: 'epic',
    unlockLevel: 18, cost: 500, costCurrency: 'hard',
    incomePerHour: 18_000, storageCapacity: 144_000, harvestIntervalHours: 8,
    description: 'Мистическое дерево. Только за золотые монеты.',
    fruit: 'Дракон-фрукт',
    imagePrompt: `Magical fantasy cactus dragon fruit plant with glowing pink exotic fruits,
      game asset style, purple and pink neon glow, mystical aura,
      transparent background, 2D flat art, mobile game UI art,
      magical sparkles and stars, dark fantasy meets cute art style,
      premium feel, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(18_000),
  },
  {
    id: 'star_fruit', name: 'Карамбола', emoji: '⭐', rarity: 'epic',
    unlockLevel: 35, cost: 2_000, costCurrency: 'hard',
    incomePerHour: 3_000_000, storageCapacity: 24_000_000, harvestIntervalHours: 8,
    description: 'Звёздный плод из другого измерения. Прибыль внеземная.',
    fruit: 'Карамбола',
    imagePrompt: `Magical cartoon star fruit tree with glowing star-shaped fruits,
      game asset style, golden starlight glow, cosmic shimmer,
      transparent background, 2D flat art, mobile game UI art,
      epic purple and gold palette, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(3_000_000),
  },
  {
    id: 'jackfruit', name: 'Джекфрут', emoji: '🎋', rarity: 'epic',
    unlockLevel: 45, cost: 6_000, costCurrency: 'hard',
    incomePerHour: 10_000_000, storageCapacity: 80_000_000, harvestIntervalHours: 8,
    description: 'Гигантский плод силы. Один джекфрут кормит армию.',
    fruit: 'Джекфрут',
    imagePrompt: `Epic cartoon jackfruit tree with massive glowing green fruits,
      game asset style, giant golden-green fruits with aura,
      transparent background, 2D flat art, mobile game UI art,
      powerful epic feel, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(10_000_000),
  },
  {
    id: 'rainbow_tree', name: 'Радужное дерево', emoji: '🌈', rarity: 'epic',
    unlockLevel: 55, cost: 15_000, costCurrency: 'hard',
    incomePerHour: 35_000_000, storageCapacity: 280_000_000, harvestIntervalHours: 8,
    description: 'На конце радуги — монеты. И это буквально.',
    fruit: 'Радужный плод',
    imagePrompt: `Magical rainbow cartoon tree with colorful prismatic fruits,
      game asset style, every branch a different color, rainbow light beams,
      transparent background, 2D flat art, mobile game UI art,
      vibrant spectrum colors, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(35_000_000),
  },
  // ─── Legendary ─────────────────────────────────────────────────────────────
  {
    id: 'golden_tree', name: 'Золотое дерево', emoji: '✨', rarity: 'legendary',
    unlockLevel: 40, cost: 5000, costCurrency: 'hard',
    incomePerHour: 100_000, storageCapacity: 800_000, harvestIntervalHours: 8,
    description: 'Легендарное дерево. Листья из золота, плоды — монеты.',
    fruit: 'Золотой плод',
    imagePrompt: `Legendary glowing golden tree with golden coin-shaped fruits,
      game asset style, entire tree made of shimmering gold,
      radiant light emanating from trunk, divine aura,
      transparent background, 2D flat art, mobile game UI art,
      epic legendary feel, rainbow shimmer, coin particles raining down,
      --ar 1:1 --style fantasy --quality 2`,
    upgrades: hardUpgrades(100_000),
  },
  {
    id: 'moon_fruit', name: 'Лунный плод', emoji: '🌙', rarity: 'legendary',
    unlockLevel: 65, cost: 30_000, costCurrency: 'hard',
    incomePerHour: 120_000_000, storageCapacity: 960_000_000, harvestIntervalHours: 8,
    description: 'Растёт только при лунном свете. Доход как прилив.',
    fruit: 'Лунный плод',
    imagePrompt: `Ethereal cartoon moon tree with glowing silver-blue fruits,
      game asset style, moonlight streaming from branches, mystical glow,
      transparent background, 2D flat art, mobile game UI art,
      celestial silver and blue, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(120_000_000),
  },
  {
    id: 'crystal_tree', name: 'Кристальное дерево', emoji: '💠', rarity: 'legendary',
    unlockLevel: 75, cost: 60_000, costCurrency: 'hard',
    incomePerHour: 400_000_000, storageCapacity: 3_200_000_000, harvestIntervalHours: 8,
    description: 'Дерево из чистых кристаллов. Каждая ветка — алмаз.',
    fruit: 'Кристалл',
    imagePrompt: `Majestic crystal tree made entirely of glowing blue crystals,
      game asset style, faceted gem-like trunk, prismatic light reflections,
      transparent background, 2D flat art, mobile game UI art,
      icy blue and white, legendary tier, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(400_000_000),
  },
  {
    id: 'cosmic_tree', name: 'Космическое дерево', emoji: '🌌', rarity: 'legendary',
    unlockLevel: 90, cost: 120_000, costCurrency: 'hard',
    incomePerHour: 1_400_000_000, storageCapacity: 11_200_000_000, harvestIntervalHours: 8,
    description: 'Корни в земле, крона в галактике. Доход бесконечен.',
    fruit: 'Звезда',
    imagePrompt: `Cosmic cartoon tree with galaxy inside the trunk, stars as fruits,
      game asset style, nebula clouds for leaves, deep space background cutout,
      transparent background, 2D flat art, mobile game UI art,
      deep purple and cyan cosmic palette, --ar 1:1 --style fantasy`,
    upgrades: hardUpgrades(1_400_000_000),
  },
  {
    id: 'world_tree', name: 'Мировое дерево', emoji: '🌍', rarity: 'legendary',
    unlockLevel: 99, cost: 500_000, costCurrency: 'hard',
    incomePerHour: 5_000_000_000, storageCapacity: 40_000_000_000, harvestIntervalHours: 8,
    description: 'Иггдрасиль. Держит миры. Твой доход — всё.',
    fruit: 'Планета',
    imagePrompt: `The world tree Yggdrasil as a cute cartoon, branches holding planets,
      game asset style, massive trunk with glowing runes, divine golden light,
      transparent background, 2D flat art, mobile game UI art,
      ultimate legendary tier, --ar 1:1 --style fantasy --quality 2`,
    upgrades: hardUpgrades(5_000_000_000),
  },
]

// Вспомогательные функции
export const getTreeById = (id: string) => TREES.find(t => t.id === id)

export const getTreesByRarity = (rarity: TreeRarity) =>
  TREES.filter(t => t.rarity === rarity)

export const getAvailableTrees = (playerLevel: number) =>
  TREES.filter(t => t.unlockLevel <= playerLevel)

export const RARITY_COLORS: Record<TreeRarity, string> = {
  common:    '#9E9E9E',
  uncommon:  '#4CAF50',
  rare:      '#2196F3',
  epic:      '#9C27B0',
  legendary: '#FF9800',
}

export const RARITY_LABELS: Record<TreeRarity, string> = {
  common:    'Обычное',
  uncommon:  'Необычное',
  rare:      'Редкое',
  epic:      'Эпическое',
  legendary: 'Легендарное',
}
