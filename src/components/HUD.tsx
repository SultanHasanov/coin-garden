import { observer } from 'mobx-react-lite'
import { useRef, useState } from 'react'
import { gameStore } from '../stores/GameStore'
import { TREES, RARITY_COLORS, RARITY_LABELS } from '../data/trees'
import type { Page } from '../App'

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

interface Props { onNavigate: (p: Page) => void }

export const HUD = observer(function HUD({ onNavigate }: Props) {
  const harvestBtnRef = useRef<HTMLButtonElement>(null)
  const [levelModal, setLevelModal] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function handleHarvest() {
    const amount = gameStore.harvest()
    if (amount <= 0) return
    harvestBtnRef.current?.classList.add('pop')
    setTimeout(() => harvestBtnRef.current?.classList.remove('pop'), 250)
    window.dispatchEvent(new CustomEvent('phaser:harvest', { detail: amount }))
  }

  const pct = gameStore.storagePercent * 100
  const storageColor = pct > 85 ? '#f85149' : pct > 60 ? '#d29922' : '#2ea043'

  // Для модалки уровня
  const nextLevel = gameStore.level + 1
  const coinsNeeded = gameStore.level * 1000
  const coinsProgress = Math.min(gameStore.coins / coinsNeeded, 1)
  const unlockAtNext = TREES.filter(t => t.unlockLevel === nextLevel)

  return (
    <>
      <div className="hud">
        {/* Раскрывающаяся панель статистики */}
        <div className={`hud-expandable ${expanded ? 'hud-expandable--open' : ''}`}>
          <div className="hud-expandable-inner">
            <div className="hud-stats">
              <div className="hud-stat">
                <span className="hud-stat-icon">🪙</span>
                <div>
                  <div className="hud-stat-label">Монеты</div>
                  <div className="hud-stat-val">{fmt(gameStore.coins)}</div>
                </div>
              </div>
              <div className="hud-stat">
                <span className="hud-stat-icon">💎</span>
                <div>
                  <div className="hud-stat-label">Алмазы</div>
                  <div className="hud-stat-val">{fmt(gameStore.goldCoins)}</div>
                </div>
              </div>
              <div className="hud-stat">
                <span className="hud-stat-icon">📈</span>
                <div>
                  <div className="hud-stat-label">Доход/ч</div>
                  <div className="hud-stat-val">+{fmt(gameStore.totalIncomePerHour)}</div>
                </div>
              </div>
              <button className="hud-level-btn" onClick={() => setLevelModal(true)}>
                Ур.&nbsp;{gameStore.level}
              </button>
            </div>

            <div className="hud-storage">
              <div className="hud-storage-top">
                <span className="hud-storage-label">Склад: {fmt(gameStore.storageUsed)} / {fmt(gameStore.storageCapacity)}</span>
                {gameStore.storageFull && <span className="hud-storage-warn">⚠ Склад полон</span>}
              </div>
              <div className="storage-track">
                <div className="storage-fill" style={{ width: `${pct}%`, backgroundColor: storageColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* Всегда видимая строка: кнопка урожая + тоггл */}
        <div className="hud-harvest-row">
          <button
            ref={harvestBtnRef}
            className={`harvest-btn ${gameStore.storageFull ? 'full' : ''}`}
            onClick={handleHarvest}
            disabled={!gameStore.canHarvest}
          >
            Собрать урожай
            {gameStore.canHarvest && (
              <span className="harvest-amount">+{fmt(gameStore.storageUsed)} 🪙</span>
            )}
          </button>
          <button
            className={`hud-toggle-btn ${expanded ? 'hud-toggle-btn--open' : ''}`}
            onClick={() => setExpanded(v => !v)}
            title="Статистика"
          >
            📊
          </button>
        </div>
      </div>

      {levelModal && (
        <div className="modal-overlay" onClick={() => setLevelModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Прогресс уровня</span>
              <button className="modal-close" onClick={() => setLevelModal(false)}>✕</button>
            </div>

            <div className="level-progress-row">
              <span className="level-badge">Ур. {gameStore.level}</span>
              <div className="level-progress-bar">
                <div className="level-progress-fill" style={{ width: `${coinsProgress * 100}%` }} />
              </div>
              <span className="level-badge">Ур. {nextLevel}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>
              {fmt(gameStore.coins)} / {fmt(coinsNeeded)} монет до следующего уровня
            </div>

            {unlockAtNext.length > 0 && (
              <div>
                <div className="modal-section-title">Открывается на уровне {nextLevel}</div>
                <div className="unlock-list">
                  {unlockAtNext.map(t => (
                    <div key={t.id} className="unlock-item">
                      <span className="unlock-item-icon">{t.emoji}</span>
                      <div>
                        <div className="unlock-item-name">{t.name}</div>
                        <div className="unlock-item-income">+{fmt(t.incomePerHour)}/час</div>
                      </div>
                      <span
                        className="unlock-item-rarity"
                        style={{ background: RARITY_COLORS[t.rarity] }}
                      >
                        {RARITY_LABELS[t.rarity]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unlockAtNext.length === 0 && (
              <div style={{ fontSize: '0.82rem', color: '#484f58' }}>
                На уровне {nextLevel} новых деревьев не открывается.
              </div>
            )}

            <button
              style={{ background: '#2ea043', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => { setLevelModal(false); onNavigate('shop') }}
            >
              Перейти в магазин
            </button>
          </div>
        </div>
      )}
    </>
  )
})
