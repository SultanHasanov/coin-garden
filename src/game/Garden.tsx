import { observer } from 'mobx-react-lite'
import { useState, useEffect, useCallback } from 'react'
import { gameStore } from '../stores/GameStore'
import { getTreeById, RARITY_COLORS } from '../data/trees'
import { TREE_IMAGES } from '../assets/treeImages'

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

interface Particle { id: number; x: number; y: number }
let pid = 0

// ─── Таймер обратного отсчёта ─────────────────────────────────────────────
function useCountdown(expiresAt: number) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()))
  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now())
      setRemaining(r)
      if (r === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// ─── Модал апгрейда ───────────────────────────────────────────────────────
const UpgradeModal = observer(function UpgradeModal({
  treeId,
  onClose,
}: { treeId: string; onClose: () => void }) {
  const tree = getTreeById(treeId)
  const boost = gameStore.getActiveBoost(treeId)
  const countdown = useCountdown(boost?.expiresAt ?? Date.now())
  const [flash, setFlash] = useState<string | null>(null)

  if (!tree) return null

  function handleUpgrade(tier: 'bronze' | 'silver' | 'gold') {
    const ok = gameStore.upgradeTree(treeId, tier)
    if (ok) { setFlash('Буст активирован! 🚀'); setTimeout(() => setFlash(null), 2000) }
    else { setFlash('Недостаточно ресурсов'); setTimeout(() => setFlash(null), 2000) }
  }

  const rc = RARITY_COLORS[tree.rarity]
  const tierColors = { bronze: '#cd7f32', silver: '#a8a9ad', gold: '#ffd700' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box upgrade-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{tree.emoji} {tree.name}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="upgrade-tree-info">
          <span style={{ color: rc, fontSize: '0.75rem', fontWeight: 700 }}>
            {tree.rarity.toUpperCase()}
          </span>
          <span className="upgrade-income-base">+{fmt(tree.incomePerHour)}/ч базовый доход</span>
        </div>

        {boost ? (
          <div className="boost-active-banner">
            <span className="boost-active-mult">×{boost.multiplier}</span>
            <div>
              <div style={{ fontWeight: 700, color: '#ffd700' }}>Буст активен!</div>
              <div style={{ fontSize: '0.78rem', color: '#8b949e' }}>Осталось: {countdown}</div>
            </div>
          </div>
        ) : (
          <div className="upgrade-tiers">
            {tree.upgrades.map(u => {
              const color = tierColors[u.tier]
              const canAfford = u.costCurrency === 'soft'
                ? gameStore.coins >= u.cost
                : gameStore.goldCoins >= u.cost

              return (
                <div key={u.tier} className="upgrade-tier-card" style={{ borderColor: color + '66' }}>
                  <div className="upgrade-tier-header" style={{ color }}>
                    {u.label}
                  </div>
                  <div className="upgrade-tier-stat">×{u.multiplier} доход • {u.durationMinutes} мин</div>
                  <div className="upgrade-tier-stat">
                    +{fmt(tree.incomePerHour * u.multiplier - tree.incomePerHour)}/ч прибавка
                  </div>
                  <button
                    className="upgrade-tier-btn"
                    style={{ background: canAfford ? color : '#21262d', color: canAfford ? '#000' : '#484f58' }}
                    disabled={!canAfford}
                    onClick={() => handleUpgrade(u.tier)}
                  >
                    {u.costCurrency === 'soft' ? '🪙' : '💎'} {fmt(u.cost)}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {flash && <div className="upgrade-flash">{flash}</div>}
      </div>
    </div>
  )
})

// ─── Модал ежедневного бонуса ─────────────────────────────────────────────
const DailyBonusModal = observer(function DailyBonusModal({
  onClose,
}: { onClose: () => void }) {
  const [claimed, setClaimed] = useState(false)
  const [reward, setReward] = useState<{ coins: number; diamonds: number } | null>(null)

  const DAILY_REWARDS = [
    { coins: 500,    diamonds: 0  },
    { coins: 1_000,  diamonds: 0  },
    { coins: 2_500,  diamonds: 1  },
    { coins: 5_000,  diamonds: 2  },
    { coins: 10_000, diamonds: 5  },
    { coins: 25_000, diamonds: 10 },
    { coins: 50_000, diamonds: 25 },
  ]

  function handleClaim() {
    const r = gameStore.claimDailyBonus()
    if (r) { setReward(r); setClaimed(true) }
  }

  const currentDay = Math.min(gameStore.dailyStreak + 1, 7)

  return (
    <div className="modal-overlay" onClick={claimed ? onClose : undefined}>
      <div className="modal-box daily-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🎁 Ежедневный бонус</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {claimed && reward ? (
          <div className="daily-claimed">
            <div className="daily-claimed-icon">🎉</div>
            <div className="daily-claimed-text">Получено!</div>
            {reward.coins > 0 && <div className="daily-reward-line">+{fmt(reward.coins)} 🪙</div>}
            {reward.diamonds > 0 && <div className="daily-reward-line">+{reward.diamonds} 💎</div>}
            <button className="daily-close-btn" onClick={onClose}>Забрать</button>
          </div>
        ) : (
          <>
            <div className="daily-streak-label">День {currentDay} из 7</div>
            <div className="daily-strip">
              {DAILY_REWARDS.map((r, i) => {
                const day = i + 1
                const past = day < currentDay
                const current = day === currentDay
                return (
                  <div
                    key={day}
                    className={`daily-day ${current ? 'current' : ''} ${past ? 'past' : ''}`}
                  >
                    <span className="daily-day-num">День {day}</span>
                    {r.diamonds > 0
                      ? <span className="daily-day-reward">💎{r.diamonds}</span>
                      : <span className="daily-day-reward">🪙{fmt(r.coins)}</span>
                    }
                    {past && <span className="daily-day-check">✓</span>}
                  </div>
                )
              })}
            </div>
            <button className="daily-claim-btn" onClick={handleClaim}>
              Получить бонус!
            </button>
          </>
        )}
      </div>
    </div>
  )
})

// ─── Карточка погоды ──────────────────────────────────────────────────────
const WeatherBanner = observer(function WeatherBanner() {
  const ev = gameStore.activeWeatherEvent
  const countdown = useCountdown(ev?.expiresAt ?? Date.now())
  if (!ev) return null
  const isPositive = ev.multiplier >= 1
  return (
    <div className={`weather-banner ${isPositive ? 'positive' : 'negative'}`}>
      <span className="weather-emoji">{ev.emoji}</span>
      <div className="weather-info">
        <span className="weather-label">{ev.label}</span>
        <span className="weather-mult">×{ev.multiplier} к доходу</span>
      </div>
      <span className="weather-timer">{countdown}</span>
    </div>
  )
})

// ─── Основной компонент сада ──────────────────────────────────────────────
export const Garden = observer(function Garden() {
  const [particles, setParticles] = useState<Particle[]>([])
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null)
  const [showDailyBonus, setShowDailyBonus] = useState(false)

  useEffect(() => {
    const h = (e: Event) => spawnCoins((e as CustomEvent<number>).detail)
    window.addEventListener('phaser:harvest', h)
    return () => window.removeEventListener('phaser:harvest', h)
  }, [])

  const spawnCoins = useCallback((amount: number) => {
    if (amount <= 0) return
    const count = Math.min(Math.ceil(amount / 50), 12)
    const batch: Particle[] = Array.from({ length: count }, () => ({
      id: pid++,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 70,
    }))
    setParticles(p => [...p, ...batch])
    setTimeout(() => setParticles(p => p.filter(x => !batch.some(b => b.id === x.id))), 1300)
  }, [])

  return (
    <div className="garden-page">
      {/* Ежедневный бонус */}
      {gameStore.isDailyBonusAvailable && (
        <button className="daily-bonus-banner" onClick={() => setShowDailyBonus(true)}>
          🎁 Ежедневный бонус доступен! Нажми для получения
        </button>
      )}

      {/* Погода */}
      <WeatherBanner />

      {/* Статистика сада */}
      <div className="garden-stats-bar">
        <div className="garden-stat-card">
          <span className="garden-stat-label">Деревьев</span>
          <span className="garden-stat-val">{gameStore.ownedTrees.reduce((s, t) => s + t.count, 0)}</span>
        </div>
        <div className="garden-stat-card">
          <span className="garden-stat-label">Доход/ч</span>
          <span className="garden-stat-val">+{fmt(gameStore.totalIncomePerHour)}</span>
        </div>
        <div className="garden-stat-card">
          <span className="garden-stat-label">Склад</span>
          <span className="garden-stat-val">{Math.floor(gameStore.storagePercent * 100)}%</span>
        </div>
      </div>

      {/* Грид деревьев */}
      <div className="tree-grid" style={{ position: 'relative' }}>
        {[...gameStore.ownedTrees, null].map((ot, i) => (
          <TreeCard
            key={i}
            treeId={ot?.treeId ?? null}
            count={ot?.count ?? 0}
            onSelect={id => setSelectedTreeId(id)}
          />
        ))}

        {particles.map(p => (
          <span
            key={p.id}
            className="coin-particle"
            style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: '20px' }}
          >
            🪙
          </span>
        ))}
      </div>

      {selectedTreeId && (
        <UpgradeModal treeId={selectedTreeId} onClose={() => setSelectedTreeId(null)} />
      )}
      {showDailyBonus && (
        <DailyBonusModal onClose={() => setShowDailyBonus(false)} />
      )}
    </div>
  )
})

// ─── Карточка дерева ─────────────────────────────────────────────────────
const TreeCard = observer(function TreeCard({
  treeId,
  count,
  onSelect,
}: {
  treeId: string | null
  count: number
  onSelect: (id: string) => void
}) {
  if (!treeId) {
    return (
      <div className="tree-card empty">
        <div className="tree-seedling">🌱</div>
        <span style={{ fontSize: '0.72rem', color: '#484f58' }}>Пусто</span>
      </div>
    )
  }

  const tree = getTreeById(treeId)
  if (!tree) return null

  const rc = RARITY_COLORS[tree.rarity]
  const boost = gameStore.getActiveBoost(treeId)
  const total = tree.incomePerHour * count * (boost?.multiplier ?? 1)

  return (
    <div
      className="tree-card filled"
      style={{ '--rc': rc } as React.CSSProperties}
      onClick={() => onSelect(treeId)}
    >
      {count > 1 && <div className="tree-count-badge">×{count}</div>}
      {boost && (
        <div className="tree-boost-badge" style={{ background: boost.tier === 'gold' ? '#ffd700' : boost.tier === 'silver' ? '#a8a9ad' : '#cd7f32' }}>
          ×{boost.multiplier}
        </div>
      )}
      <div className="tree-rarity-dot" />

      <div className="tree-card-img-wrap">
        {TREE_IMAGES[treeId] ? (
          <img src={TREE_IMAGES[treeId]} alt={tree.name} className="tree-card-img" />
        ) : (
          <span style={{ fontSize: '52px' }}>{tree.emoji}</span>
        )}
      </div>

      <span className="tree-card-name">{tree.name}</span>
      <span className="tree-card-income" style={{ color: boost ? '#ffd700' : undefined }}>
        +{fmt(total)}/ч
      </span>
      <span className="tree-tap-hint">Тап для буста</span>
    </div>
  )
})
