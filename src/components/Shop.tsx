import { observer } from 'mobx-react-lite'
import { gameStore } from '../stores/GameStore'
import { TREES, RARITY_COLORS } from '../data/trees'
import { TREE_IMAGES } from '../assets/treeImages'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export const Shop = observer(function Shop() {
  if (!gameStore.shopOpen) return null

  function handleBuy(treeId: string) {
    const ok = gameStore.buyTree(treeId)
    if (ok) {
      window.dispatchEvent(new CustomEvent('phaser:treeBought', { detail: treeId }))
    }
  }

  // Деревья кроме бесплатной яблони
  const shopItems = TREES.filter(t => t.costCurrency !== 'free')

  return (
    <div className="shop-overlay" onClick={e => e.target === e.currentTarget && gameStore.closeShop()}>
      <div className="shop-modal">
        <div className="shop-header">
          <h2>🌳 Магазин деревьев</h2>
          <button className="shop-close" onClick={() => gameStore.closeShop()}>✕</button>
        </div>

        <div className="shop-balance">
          <span>🪙 {formatNumber(gameStore.coins)}</span>
          <span>💎 {formatNumber(gameStore.goldCoins)}</span>
        </div>

        <div className="shop-grid">
          {shopItems.map(tree => {
            const owned = gameStore.treeCount(tree.id)
            const unlocked = gameStore.isUnlocked(tree.id)
            const affordable = gameStore.canAfford(tree.id)
            const rarityColor = RARITY_COLORS[tree.rarity]

            return (
              <div
                key={tree.id}
                className={`shop-card ${!unlocked ? 'locked' : ''} ${!affordable && unlocked ? 'cant-afford' : ''}`}
                style={{ borderColor: rarityColor }}
              >
                {/* Бейдж редкости */}
                {/* <div className="rarity-badge" style={{ backgroundColor: rarityColor }}>
                  {RARITY_LABELS[tree.rarity]}
                </div> */}

                {/* Картинка дерева (всегда показываем) */}
                <div className="shop-tree-img-wrap">
                  {TREE_IMAGES[tree.id] ? (
                    <img
                      src={TREE_IMAGES[tree.id]}
                      alt={tree.name}
                      className={`shop-tree-img ${!unlocked ? 'shop-img-locked' : ''}`}
                    />
                  ) : (
                    <span className="tree-emoji-large">{tree.emoji}</span>
                  )}
                  {!unlocked && (
                    <div className="shop-lock-overlay">🔒</div>
                  )}
                </div>

                {/* Название */}
                <div className="tree-card-name">{tree.name}</div>

                {/* Характеристики */}
                {unlocked && (
                  <div className="tree-stats">
                    <div>📈 {formatNumber(tree.incomePerHour)}/час</div>
                    <div>🏚 +{formatNumber(tree.storageCapacity)} склад</div>
                  </div>
                )}

                {/* Уровень разблокировки */}
                {!unlocked && (
                  <div className="locked-label">
                    Ур. {tree.unlockLevel} для открытия
                  </div>
                )}

                {/* Количество куплено */}
                {owned > 0 && (
                  <div className="owned-badge">У тебя: {owned} шт.</div>
                )}

                {/* Кнопка покупки */}
                <button
                  className={`buy-btn ${!unlocked || !affordable ? 'disabled' : ''}`}
                  disabled={!unlocked || !affordable}
                  onClick={() => handleBuy(tree.id)}
                >
                  {!unlocked
                    ? `Ур. ${tree.unlockLevel}`
                    : tree.costCurrency === 'hard'
                      ? `💎 ${formatNumber(tree.cost)}`
                      : `🪙 ${formatNumber(tree.cost)}`
                  }
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
