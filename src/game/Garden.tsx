import { observer } from 'mobx-react-lite'
import { useState, useEffect, useCallback } from 'react'
import { gameStore } from '../stores/GameStore'
import { getTreeById, RARITY_COLORS } from '../data/trees'
import { TREE_IMAGES } from '../assets/treeImages'
import './Garden.css'

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

        {/* Удобрение */}
        <div className="fertilizer-section">
          <div className="fertilizer-level">
            🌿 Уровень удобрений: {' '}
            <span style={{ color: '#2ea043', fontWeight: 700 }}>
              {'★'.repeat(gameStore.getTreeEnhancement(treeId))}{'☆'.repeat(5 - gameStore.getTreeEnhancement(treeId))}
            </span>
            {gameStore.getTreeEnhancement(treeId) > 0 && (
              <span style={{ color: '#d29922', fontSize: '0.75rem', marginLeft: 6 }}>
                +{gameStore.getTreeEnhancement(treeId) * 10}% к доходу
              </span>
            )}
          </div>
          {gameStore.fertilizerCount > 0 && gameStore.getTreeEnhancement(treeId) < 5 && (
            <button
              className="fertilize-btn"
              onClick={() => {
                const ok = gameStore.fertilizeTree(treeId)
                if (ok) { setFlash('🌿 Удобрение применено! +10% дохода навсегда'); setTimeout(() => setFlash(null), 2500) }
              }}
            >
              🌿 Удобрить ({gameStore.fertilizerCount} шт.)
            </button>
          )}
          {gameStore.fertilizerCount === 0 && gameStore.getTreeEnhancement(treeId) < 5 && (
            <div style={{ fontSize: '0.72rem', color: '#484f58' }}>Собирай урожай — иногда выпадает удобрение</div>
          )}
          {gameStore.getTreeEnhancement(treeId) >= 5 && (
            <div style={{ fontSize: '0.72rem', color: '#2ea043' }}>Максимальный уровень!</div>
          )}
        </div>

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
  const [showPrestige, setShowPrestige] = useState(false)
  const [prestigeConfirmed, setPrestigeConfirmed] = useState(false)

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

      {/* Сезонный бонус */}
      {gameStore.seasonNumber > 1 && (
        <div className="season-banner">
          🌸 Сезон {gameStore.seasonNumber} · +{Math.round(gameStore.permanentBonus * 100)}% постоянный бонус
        </div>
      )}

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

      {/* Активные синергии */}
      {gameStore.activeSynergies.length > 0 && (
        <div className="synergies-panel">
          <div className="synergies-title">✨ Активные синергии</div>
          <div className="synergies-list">
            {gameStore.activeSynergies.map(s => (
              <div key={s.id} className="synergy-chip">
                <span>{s.emoji}</span>
                <span className="synergy-chip-name">{s.name}</span>
                <span className="synergy-chip-bonus">+{s.bonusPercent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Активные соперничества */}
      {gameStore.activeRivalries.length > 0 && (
        <div className="rivalries-panel">
          <div className="rivalries-title">⚔️ Конфликты деревьев</div>
          <div className="rivalries-list">
            {gameStore.activeRivalries.map(r => (
              <div key={r.id} className="rivalry-chip">{r.description}</div>
            ))}
          </div>
        </div>
      )}

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

      {/* Кнопка престижа */}
      {gameStore.level >= 25 && (
        <button className="prestige-btn" onClick={() => { setShowPrestige(true); setPrestigeConfirmed(false) }}>
          🌸 Завершить сезон {gameStore.seasonNumber}
          <span className="prestige-btn-hint">+5% постоянный бонус навсегда</span>
        </button>
      )}

      {selectedTreeId && (
        <UpgradeModal treeId={selectedTreeId} onClose={() => setSelectedTreeId(null)} />
      )}
      {showDailyBonus && (
        <DailyBonusModal onClose={() => setShowDailyBonus(false)} />
      )}
      {showPrestige && (
        <div className="modal-overlay" onClick={() => setShowPrestige(false)}>
          <div className="modal-box prestige-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🌸 Завершить сезон</span>
              <button className="modal-close" onClick={() => setShowPrestige(false)}>✕</button>
            </div>
            {!prestigeConfirmed ? (
              <>
                <div className="prestige-info">
                  <div className="prestige-reward">
                    <span className="prestige-reward-icon">✨</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f0f6fc' }}>+5% постоянный бонус к доходу</div>
                      <div style={{ fontSize: '0.78rem', color: '#8b949e' }}>
                        Будет: +{Math.round((gameStore.permanentBonus + 0.05) * 100)}% ко всем доходам навсегда
                      </div>
                    </div>
                  </div>
                  <div className="prestige-reward">
                    <span className="prestige-reward-icon">💎</span>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f0f6fc' }}>Алмазы сохранятся</div>
                      <div style={{ fontSize: '0.78rem', color: '#8b949e' }}>
                        {Math.round(gameStore.goldCoins)} 💎 перейдут в новый сезон
                      </div>
                    </div>
                  </div>
                  <div className="prestige-warning">
                    ⚠️ Монеты, деревья и уровень будут сброшены
                  </div>
                </div>
                <button className="prestige-confirm-btn" onClick={() => setPrestigeConfirmed(true)}>
                  Начать Сезон {gameStore.seasonNumber + 1}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.88rem', color: '#f85149', fontWeight: 700, textAlign: 'center', padding: '8px 0' }}>
                  Это действие необратимо! Весь прогресс будет сброшен.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #30363d', background: '#161b22', color: '#8b949e', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setShowPrestige(false)}
                  >
                    Отмена
                  </button>
                  <button
                    className="prestige-confirm-btn"
                    style={{ flex: 1 }}
                    onClick={() => { gameStore.startNewSeason(); setShowPrestige(false) }}
                  >
                    🌸 Да, начать сезон {gameStore.seasonNumber + 1}!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
  const rivalryPenalty = gameStore.getRivalryPenalty(treeId)
  const enhancement = gameStore.getTreeEnhancement(treeId)
  const isPure = tree.storageType === 'pure'

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
      {rivalryPenalty > 0 && (
        <div className="tree-rivalry-badge" title={`Конфликт: -${Math.round(rivalryPenalty * 100)}% дохода`}>⚔️</div>
      )}
      {isPure && (
        <div className="tree-pure-badge" title="Без склада">⚡</div>
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
      <span className="tree-card-income" style={{ color: boost ? '#ffd700' : rivalryPenalty > 0 ? '#f85149' : undefined }}>
        +{fmt(total)}/ч
      </span>
      {enhancement > 0 && (
        <span className="tree-enhancement-badge">{'🌿'.repeat(enhancement)}</span>
      )}
      <span className="tree-tap-hint">Тап для буста</span>
    </div>
  )
})
