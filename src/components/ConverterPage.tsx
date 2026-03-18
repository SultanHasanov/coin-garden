import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { gameStore, COINS_PER_DIAMOND, DIAMONDS_PER_RUBLE } from '../stores/GameStore'

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

type Flash = { msg: string; ok: boolean } | null

export const ConverterPage = observer(function ConverterPage() {
  const [diamInput, setDiamInput]   = useState('')
  const [rubInput,  setRubInput]    = useState('')
  const [rubToCoinsInput, setRubToCoinsInput] = useState('')
  const [flash, setFlash] = useState<Flash>(null)

  function showFlash(msg: string, ok: boolean) {
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 2200)
  }

  function handleToDiamonds() {
    const n = parseInt(diamInput) || 0
    if (n <= 0) return
    const ok = gameStore.convertCoinsToDiamonds(n)
    ok ? showFlash(`+${n} 💎 алмазов`, true) : showFlash('Недостаточно монет', false)
    if (ok) setDiamInput('')
  }

  function handleToRubles() {
    const n = parseInt(rubInput) || 0
    if (n <= 0) return
    const ok = gameStore.convertDiamondsToRubles(n)
    ok ? showFlash(`+${n} ₽ зачислено`, true) : showFlash('Недостаточно алмазов', false)
    if (ok) setRubInput('')
  }

  function handleRublesToCoins() {
    const n = parseInt(rubToCoinsInput) || 0
    if (n <= 0) return
    const ok = gameStore.convertRublesToCoins(n)
    const earned = n * DIAMONDS_PER_RUBLE * COINS_PER_DIAMOND
    ok ? showFlash(`+${fmt(earned)} 🪙 получено`, true) : showFlash('Недостаточно рублей', false)
    if (ok) setRubToCoinsInput('')
  }

  const diamPreviewCost = (parseInt(diamInput) || 0) * COINS_PER_DIAMOND
  const rubPreviewCost  = (parseInt(rubInput)  || 0) * DIAMONDS_PER_RUBLE
  const rubToCoinsEarned = (parseInt(rubToCoinsInput) || 0) * DIAMONDS_PER_RUBLE * COINS_PER_DIAMOND

  return (
    <div className="conv-page">
      <div className="page-title">💱 Обменник</div>

      {/* Балансы */}
      <div className="conv-balances">
        <div className="conv-bal-card">
          <span className="conv-bal-icon">🪙</span>
          <div>
            <div className="conv-bal-label">Монеты</div>
            <div className="conv-bal-value">{fmt(gameStore.coins)}</div>
          </div>
        </div>
        <div className="conv-bal-card">
          <span className="conv-bal-icon">💎</span>
          <div>
            <div className="conv-bal-label">Алмазы</div>
            <div className="conv-bal-value">{fmt(gameStore.goldCoins)}</div>
          </div>
        </div>
        <div className="conv-bal-card">
          <span className="conv-bal-icon">₽</span>
          <div>
            <div className="conv-bal-label">Рубли</div>
            <div className="conv-bal-value">{fmt(gameStore.rubles)}</div>
          </div>
        </div>
      </div>

      {flash && (
        <div className={`conv-flash ${flash.ok ? '' : 'err'}`}>{flash.msg}</div>
      )}

      {/* Монеты → Алмазы */}
      <div className="conv-block">
        <div className="conv-block-title">
          🪙 Монеты → 💎 Алмазы
          <span className="conv-block-rate">курс {fmt(COINS_PER_DIAMOND)} : 1</span>
        </div>
        <div className="conv-row">
          <div className="conv-field">
            <label>Сколько алмазов получить</label>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={diamInput}
              onChange={e => setDiamInput(e.target.value)}
              className="conv-input"
            />
            {diamInput && <span className="conv-cost">Стоимость: {fmt(diamPreviewCost)} 🪙</span>}
          </div>
          <button
            className="conv-submit"
            onClick={handleToDiamonds}
            disabled={!diamInput || parseInt(diamInput) <= 0}
          >
            Обменять
          </button>
        </div>
        <div className="conv-hint">
          Доступно: {fmt(Math.floor(gameStore.coins / COINS_PER_DIAMOND))} алмазов
        </div>
      </div>

      {/* Алмазы → Рубли */}
      <div className="conv-block">
        <div className="conv-block-title">
          💎 Алмазы → ₽ Рубли
          <span className="conv-block-rate">курс {fmt(DIAMONDS_PER_RUBLE)} : 1</span>
        </div>
        <div className="conv-row">
          <div className="conv-field">
            <label>Сколько рублей вывести</label>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={rubInput}
              onChange={e => setRubInput(e.target.value)}
              className="conv-input"
            />
            {rubInput && <span className="conv-cost">Стоимость: {fmt(rubPreviewCost)} 💎</span>}
          </div>
          <button
            className="conv-submit gold"
            onClick={handleToRubles}
            disabled={!rubInput || parseInt(rubInput) <= 0}
          >
            Вывести
          </button>
        </div>
        <div className="conv-hint">
          Доступно: {fmt(Math.floor(gameStore.goldCoins / DIAMONDS_PER_RUBLE))} рублей
        </div>
      </div>

      {/* Рубли → Монеты */}
      <div className="conv-block">
        <div className="conv-block-title">
          ₽ Рубли → 🪙 Монеты
          <span className="conv-block-rate">1 ₽ = {fmt(DIAMONDS_PER_RUBLE * COINS_PER_DIAMOND)} монет</span>
        </div>
        <div className="conv-row">
          <div className="conv-field">
            <label>Сколько рублей обменять</label>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={rubToCoinsInput}
              onChange={e => setRubToCoinsInput(e.target.value)}
              className="conv-input"
            />
            {rubToCoinsInput && <span className="conv-cost">Получите: {fmt(rubToCoinsEarned)} 🪙</span>}
          </div>
          <button
            className="conv-submit rub"
            onClick={handleRublesToCoins}
            disabled={!rubToCoinsInput || parseInt(rubToCoinsInput) <= 0}
          >
            Обменять
          </button>
        </div>
        <div className="conv-hint">
          Доступно: {fmt(gameStore.rubles)} ₽
        </div>
      </div>

      <div className="conv-hint" style={{ fontSize: '0.72rem', color: '#30363d', textAlign: 'center' }}>
        Минимальный вывод: 1 ₽ = {fmt(DIAMONDS_PER_RUBLE)} алмазов = {fmt(DIAMONDS_PER_RUBLE * COINS_PER_DIAMOND)} монет
      </div>
    </div>
  )
})
