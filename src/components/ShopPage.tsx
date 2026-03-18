import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { gameStore } from '../stores/GameStore'
import { TREES, RARITY_COLORS, RARITY_LABELS, type TreeRarity } from '../data/trees'
import { TREE_IMAGES } from '../assets/treeImages'

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

const FILTERS: { id: string; label: string }[] = [
  { id: 'all',       label: 'Все'        },
  { id: 'common',    label: 'Обычные'    },
  { id: 'uncommon',  label: 'Необычные'  },
  { id: 'rare',      label: 'Редкие'     },
  { id: 'epic',      label: 'Эпические'  },
  { id: 'legendary', label: 'Легендарные'},
]

export const ShopPage = observer(function ShopPage() {
  const [filter, setFilter] = useState('all')

  const items = TREES.filter(t =>
    t.costCurrency !== 'free' &&
    (filter === 'all' || t.rarity === filter)
  )

  function handleBuy(treeId: string) {
    gameStore.buyTree(treeId)
  }

  return (
    <div>
      <div className="page-title">🛒 Магазин деревьев</div>

      <div className="shop-balance-bar">
        <span>🪙 {fmt(gameStore.coins)}</span>
        <span>💎 {fmt(gameStore.goldCoins)}</span>
      </div>

      <div className="shop-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {items.map(tree => {
          const owned    = gameStore.treeCount(tree.id)
          const unlocked = gameStore.isUnlocked(tree.id)
          const afford   = gameStore.canAfford(tree.id)
          const rc       = RARITY_COLORS[tree.rarity as TreeRarity]

          return (
            <div
              key={tree.id}
              className={`shop-card ${!unlocked ? 'locked' : ''} ${!afford && unlocked ? 'cant-afford' : ''}`}
              style={{ borderColor: unlocked ? rc + '66' : undefined }}
            >
              <div className="rarity-badge" style={{ background: rc }}>
                {RARITY_LABELS[tree.rarity as TreeRarity]}
              </div>

              <div className="shop-tree-img-wrap">
                {TREE_IMAGES[tree.id] ? (
                  <img
                    src={TREE_IMAGES[tree.id]}
                    alt={tree.name}
                    className={`shop-tree-img ${!unlocked ? 'shop-img-locked' : ''}`}
                  />
                ) : (
                  <span style={{ fontSize: '2.4rem' }}>{tree.emoji}</span>
                )}
                {!unlocked && <div className="shop-lock-overlay">🔒</div>}
              </div>

              <div className="shop-tree-name">{tree.name}</div>

              {unlocked ? (
                <div className="shop-tree-stats">
                  <span>📈 {fmt(tree.incomePerHour)}/час</span>
                  <span>📦 +{fmt(tree.storageCapacity)} склад</span>
                </div>
              ) : (
                <div className="locked-label">Открывается на ур. {tree.unlockLevel}</div>
              )}

              {owned > 0 && <div className="owned-badge">У тебя: {owned} шт.</div>}

              <button
                className={`buy-btn ${tree.costCurrency === 'hard' ? 'hard' : ''}`}
                disabled={!unlocked || !afford}
                onClick={() => handleBuy(tree.id)}
              >
                {!unlocked
                  ? `Ур. ${tree.unlockLevel}`
                  : tree.costCurrency === 'hard'
                    ? `💎 ${fmt(tree.cost)}`
                    : `🪙 ${fmt(tree.cost)}`
                }
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
})
