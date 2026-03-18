export interface AchievementCheck {
  coins: number
  goldCoins: number
  level: number
  ownedTrees: { treeId: string; count: number }[]
  treeBoosts: { treeId: string }[]
  dailyStreak: number
  totalHarvested: number
}

export interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  condition: (s: AchievementCheck) => boolean
  rewardCoins: number
  rewardDiamonds: number
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_harvest',
    name: 'Первый урожай',
    icon: '🌾',
    description: 'Собери первый урожай',
    condition: s => s.totalHarvested >= 1,
    rewardCoins: 200,
    rewardDiamonds: 0,
  },
  {
    id: 'coins_1k',
    name: 'Копилка',
    icon: '💰',
    description: 'Накопи 1 000 монет',
    condition: s => s.coins >= 1_000,
    rewardCoins: 500,
    rewardDiamonds: 0,
  },
  {
    id: 'coins_100k',
    name: 'Богач',
    icon: '🤑',
    description: 'Накопи 100 000 монет',
    condition: s => s.coins >= 100_000,
    rewardCoins: 10_000,
    rewardDiamonds: 0,
  },
  {
    id: 'millionaire',
    name: 'Миллионер',
    icon: '🏦',
    description: 'Накопи 1 000 000 монет',
    condition: s => s.coins >= 1_000_000,
    rewardCoins: 0,
    rewardDiamonds: 10,
  },
  {
    id: 'trees_3',
    name: 'Маленький сад',
    icon: '🌳',
    description: 'Купи 3 дерева',
    condition: s => s.ownedTrees.reduce((n, t) => n + t.count, 0) >= 3,
    rewardCoins: 1_000,
    rewardDiamonds: 0,
  },
  {
    id: 'trees_10',
    name: 'Лесник',
    icon: '🌲',
    description: 'Купи 10 деревьев',
    condition: s => s.ownedTrees.reduce((n, t) => n + t.count, 0) >= 10,
    rewardCoins: 0,
    rewardDiamonds: 5,
  },
  {
    id: 'level_5',
    name: 'Садовод',
    icon: '⭐',
    description: 'Достигни 5 уровня',
    condition: s => s.level >= 5,
    rewardCoins: 5_000,
    rewardDiamonds: 0,
  },
  {
    id: 'level_10',
    name: 'Мастер сада',
    icon: '🌟',
    description: 'Достигни 10 уровня',
    condition: s => s.level >= 10,
    rewardCoins: 0,
    rewardDiamonds: 5,
  },
  {
    id: 'level_25',
    name: 'Легенда',
    icon: '👑',
    description: 'Достигни 25 уровня',
    condition: s => s.level >= 25,
    rewardCoins: 0,
    rewardDiamonds: 50,
  },
  {
    id: 'diamonds_50',
    name: 'Алмазный фонд',
    icon: '💎',
    description: 'Накопи 50 алмазов',
    condition: s => s.goldCoins >= 50,
    rewardCoins: 0,
    rewardDiamonds: 10,
  },
  {
    id: 'first_boost',
    name: 'Форсаж',
    icon: '⚡',
    description: 'Активируй первый буст',
    condition: s => s.treeBoosts.length > 0,
    rewardCoins: 2_000,
    rewardDiamonds: 0,
  },
  {
    id: 'streak_3',
    name: 'Привычка',
    icon: '🔥',
    description: 'Войди 3 дня подряд',
    condition: s => s.dailyStreak >= 3,
    rewardCoins: 5_000,
    rewardDiamonds: 1,
  },
  {
    id: 'streak_7',
    name: 'Неделя садовода',
    icon: '🗓️',
    description: 'Войди 7 дней подряд',
    condition: s => s.dailyStreak >= 7,
    rewardCoins: 0,
    rewardDiamonds: 25,
  },
  {
    id: 'harvest_100',
    name: 'Жнец',
    icon: '🪙',
    description: 'Собери урожай 100 раз',
    condition: s => s.totalHarvested >= 100,
    rewardCoins: 0,
    rewardDiamonds: 15,
  },
]
