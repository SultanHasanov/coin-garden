export type TreeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type CurrencyType = 'soft' | 'hard' | 'free'

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
}

export const TREES: Tree[] = [
  {
    id: 'apple',
    name: 'Яблоня',
    emoji: '🍎',
    rarity: 'common',
    unlockLevel: 1,
    cost: 0,
    costCurrency: 'free',
    incomePerHour: 10,
    storageCapacity: 80,       // 8 часов × 10
    harvestIntervalHours: 8,
    description: 'Твоё первое дерево. Скромный, но надёжный доход.',
    fruit: 'Яблоко',
    imagePrompt: `Cute cartoon apple tree with round red apples, game asset style,
      bright green leaves, white blossom, pastel colors, transparent background,
      2D flat art, mobile game UI art style, chibi cute proportions,
      soft shadows, --ar 1:1 --style cute`,
  },
  {
    id: 'pear',
    name: 'Груша',
    emoji: '🍐',
    rarity: 'common',
    unlockLevel: 1,
    cost: 500,
    costCurrency: 'soft',
    incomePerHour: 28,
    storageCapacity: 224,
    harvestIntervalHours: 8,
    description: 'Груши зреют медленнее, но их больше.',
    fruit: 'Груша',
    imagePrompt: `Cute cartoon pear tree with golden yellow pears hanging from branches,
      game asset style, lush green leaves, soft warm colors, transparent background,
      2D flat art, mobile game UI art style, chibi cute proportions,
      gentle glow around fruits, --ar 1:1 --style cute`,
  },
  {
    id: 'cherry',
    name: 'Вишня',
    emoji: '🍒',
    rarity: 'uncommon',
    unlockLevel: 3,
    cost: 2000,
    costCurrency: 'soft',
    incomePerHour: 80,
    storageCapacity: 640,
    harvestIntervalHours: 8,
    description: 'Маленькие ягоды, большой доход. Вишни любят все.',
    fruit: 'Вишня',
    imagePrompt: `Adorable cartoon cherry tree covered in bright red cherries in pairs,
      game asset style, deep pink blossoms, vibrant colors, transparent background,
      2D flat art, mobile game UI art style, small cute proportions,
      sparkle effects on cherries, --ar 1:1 --style cute`,
  },
  {
    id: 'orange',
    name: 'Апельсин',
    emoji: '🍊',
    rarity: 'uncommon',
    unlockLevel: 5,
    cost: 10000,
    costCurrency: 'soft',
    incomePerHour: 300,
    storageCapacity: 2400,
    harvestIntervalHours: 8,
    description: 'Экзотика! Сочные апельсины ценятся дороже.',
    fruit: 'Апельсин',
    imagePrompt: `Cute cartoon orange tree with big juicy oranges, tropical feel,
      game asset style, glossy bright orange fruits, dark green waxy leaves,
      transparent background, 2D flat art, mobile game UI art,
      sun rays hitting the fruits, warm golden glow, --ar 1:1 --style cute`,
  },
  {
    id: 'mango',
    name: 'Манго',
    emoji: '🥭',
    rarity: 'rare',
    unlockLevel: 8,
    cost: 50000,
    costCurrency: 'soft',
    incomePerHour: 1200,
    storageCapacity: 9600,
    harvestIntervalHours: 8,
    description: 'Король фруктов. Высокий доход, но требует терпения.',
    fruit: 'Манго',
    imagePrompt: `Majestic cartoon mango tree with large golden-red mangoes,
      game asset style, lush tropical leaves, exotic feel, transparent background,
      2D flat art, mobile game UI art, premium glow effects,
      golden particles falling from tree, rich warm palette, --ar 1:1 --style cute`,
  },
  {
    id: 'coconut',
    name: 'Кокосовая пальма',
    emoji: '🥥',
    rarity: 'rare',
    unlockLevel: 12,
    cost: 200000,
    costCurrency: 'soft',
    incomePerHour: 4500,
    storageCapacity: 36000,
    harvestIntervalHours: 8,
    description: 'Высокая пальма видит далеко. Огромный пассивный доход.',
    fruit: 'Кокос',
    imagePrompt: `Tall cute cartoon palm tree with big brown coconuts at the top,
      game asset style, long swaying palm leaves, tropical island vibe,
      transparent background, 2D flat art, mobile game UI art,
      ocean breeze effect, turquoise highlights, --ar 1:1 --style cute`,
  },
  {
    id: 'dragon_fruit',
    name: 'Питахайя',
    emoji: '🐉',
    rarity: 'epic',
    unlockLevel: 18,
    cost: 500,
    costCurrency: 'hard',
    incomePerHour: 18000,
    storageCapacity: 144000,
    harvestIntervalHours: 8,
    description: 'Мистическое дерево. Только за золотые монеты.',
    fruit: 'Дракон-фрукт',
    imagePrompt: `Magical fantasy cactus dragon fruit plant with glowing pink exotic fruits,
      game asset style, purple and pink neon glow, mystical aura,
      transparent background, 2D flat art, mobile game UI art,
      magical sparkles and stars, dark fantasy meets cute art style,
      premium feel, --ar 1:1 --style fantasy`,
  },
  {
    id: 'golden_tree',
    name: 'Золотое дерево',
    emoji: '✨',
    rarity: 'legendary',
    unlockLevel: 99,
    cost: 5000,
    costCurrency: 'hard',
    incomePerHour: 100000,
    storageCapacity: 800000,
    harvestIntervalHours: 8,
    description: 'Легендарное дерево. Листья из золота, плоды — монеты.',
    fruit: 'Золотой плод',
    imagePrompt: `Legendary glowing golden tree with golden coin-shaped fruits,
      game asset style, entire tree made of shimmering gold,
      radiant light emanating from trunk, divine aura,
      transparent background, 2D flat art, mobile game UI art,
      epic legendary feel, rainbow shimmer, coin particles raining down,
      --ar 1:1 --style fantasy --quality 2`,
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
