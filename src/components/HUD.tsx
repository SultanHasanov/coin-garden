import { observer } from 'mobx-react-lite'
import { useRef, useState, useEffect } from 'react'
import { gameStore } from '../stores/GameStore'
import type { Page } from '../App'

// Непрерывный lerp — постоянно догоняет цель без пауз между тиками
function useAnimatedNumber(target: number) {
  const [displayed, setDisplayed] = useState(target)
  const ref = useRef({ cur: target, target })
  const rafRef = useRef<number>(0)
  const prevTarget = useRef(target)

  // Обновляем цель; при резком падении (сбор урожая) — мгновенный сброс
  useEffect(() => {
    const prev = prevTarget.current
    prevTarget.current = target
    if (target < prev * 0.5 && prev - target > 10) {
      ref.current.cur = target
      ref.current.target = target
      setDisplayed(target)
    } else {
      ref.current.target = target
    }
  }, [target])

  // Один RAF-цикл, живёт на всё время жизни компонента
  useEffect(() => {
    let last = performance.now()
    function tick(now: number) {
      const dt = Math.min(now - last, 50) // ограничиваем при потере фокуса
      last = now
      const { cur, target } = ref.current
      const diff = target - cur
      if (Math.abs(diff) > 0.5) {
        // экспоненциальный lerp с tau=120ms — плавно и без рывков
        const next = cur + diff * (1 - Math.exp(-dt / 120))
        ref.current.cur = next
        setDisplayed(next)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, []) // eslint-disable-line

  return displayed
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

interface Props { onNavigate: (p: Page) => void }

export const HUD = observer(function HUD({ onNavigate: _onNavigate }: Props) {
  const harvestBtnRef = useRef<HTMLButtonElement>(null)
  const animStorageUsed = useAnimatedNumber(gameStore.storageUsed)

  function handleHarvest() {
    const result = gameStore.harvest()
    if (result.amount <= 0) return
    harvestBtnRef.current?.classList.add('pop')
    setTimeout(() => harvestBtnRef.current?.classList.remove('pop'), 250)
    window.dispatchEvent(new CustomEvent('phaser:harvest', { detail: result.amount }))
    if (result.fertilizerDrop) {
      window.dispatchEvent(new CustomEvent('fertilizer:drop'))
    }
  }

  const pct = gameStore.storagePercent * 100
  const storageColor = pct > 85 ? '#f85149' : pct > 60 ? '#d29922' : '#2ea043'

  return (
    <div className="hud">
      <div className="hud-storage">
        <div className="hud-storage-top">
          <span className="hud-storage-label">Склад: {fmt(gameStore.storageUsed)} / {fmt(gameStore.storageCapacity)}</span>
          {gameStore.storageFull && <span className="hud-storage-warn">⚠ Склад полон</span>}
        </div>
        <div className="storage-track">
          <div className="storage-fill" style={{ width: `${pct}%`, backgroundColor: storageColor }} />
        </div>
      </div>

      <button
        ref={harvestBtnRef}
        className={`harvest-btn ${gameStore.storageFull ? 'full' : ''} ${gameStore.isPrecisionZone ? 'precision' : ''}`}
        onClick={handleHarvest}
        disabled={!gameStore.canHarvest}
      >
        {gameStore.isPrecisionZone ? '⚡ Точный сбор!' : 'Собрать урожай'}
        {gameStore.canHarvest && (
          <span className="harvest-amount">
            +{fmt(gameStore.isPrecisionZone ? Math.floor(animStorageUsed * 1.2) : animStorageUsed)} 🪙
          </span>
        )}
      </button>
    </div>
  )
})
