import { observer } from 'mobx-react-lite'
import { useState } from 'react'
import { gameStore, COINS_PER_DIAMOND, DIAMONDS_PER_RUBLE } from '../stores/GameStore'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export const Converter = observer(function Converter() {
  const [coinsInput, setCoinsInput] = useState('')
  const [diamondsInput, setDiamondsInput] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  function showFlash(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2000)
  }

  function handleCoinsToDiamonds() {
    const amount = parseInt(coinsInput) || 0
    if (amount <= 0) return
    const ok = gameStore.convertCoinsToDiamonds(amount)
    if (ok) {
      showFlash(`+${amount} 💎`)
      setCoinsInput('')
    } else {
      showFlash('Недостаточно монет!')
    }
  }

  function handleDiamondsToRubles() {
    const amount = parseInt(diamondsInput) || 0
    if (amount <= 0) return
    const ok = gameStore.convertDiamondsToRubles(amount)
    if (ok) {
      showFlash(`+${amount} ₽`)
      setDiamondsInput('')
    } else {
      showFlash('Недостаточно алмазов!')
    }
  }

  const diamondsPreview = Math.floor((parseInt(coinsInput) || 0))
  const rublesPreview = Math.floor((parseInt(diamondsInput) || 0))

  return (
    <div className="converter">
      <h2 className="converter-title">💱 Конвертер</h2>

      {flash && <div className="converter-flash">{flash}</div>}

      {/* ── Баланс ── */}
      <div className="converter-balances">
        <div className="conv-balance">
          <span className="conv-bal-icon">🪙</span>
          <div>
            <div className="conv-bal-label">Монеты</div>
            <div className="conv-bal-value">{fmt(gameStore.coins)}</div>
          </div>
        </div>
        <div className="conv-arrow">→</div>
        <div className="conv-balance">
          <span className="conv-bal-icon">💎</span>
          <div>
            <div className="conv-bal-label">Алмазы</div>
            <div className="conv-bal-value">{fmt(gameStore.goldCoins)}</div>
          </div>
        </div>
        <div className="conv-arrow">→</div>
        <div className="conv-balance">
          <span className="conv-bal-icon">₽</span>
          <div>
            <div className="conv-bal-label">Рубли</div>
            <div className="conv-bal-value">{fmt(gameStore.rubles)}</div>
          </div>
        </div>
      </div>

      {/* ── Строка 1: монеты → алмазы ── */}
      <div className="conv-row">
        <div className="conv-row-label">
          🪙 Монеты → 💎 Алмазы
          <span className="conv-rate">курс: {fmt(COINS_PER_DIAMOND)} : 1</span>
        </div>
        <div className="conv-inputs">
          <div className="conv-field">
            <input
              type="number"
              min="1"
              placeholder="Кол-во алмазов"
              value={coinsInput}
              onChange={e => setCoinsInput(e.target.value)}
              className="conv-input"
            />
            <span className="conv-cost">
              = {fmt(diamondsPreview * COINS_PER_DIAMOND)} 🪙
            </span>
          </div>
          <button
            className="conv-btn"
            onClick={handleCoinsToDiamonds}
            disabled={!coinsInput || parseInt(coinsInput) <= 0}
          >
            Обменять
          </button>
        </div>
      </div>

      {/* ── Строка 2: алмазы → рубли ── */}
      <div className="conv-row">
        <div className="conv-row-label">
          💎 Алмазы → ₽ Рубли
          <span className="conv-rate">курс: {fmt(DIAMONDS_PER_RUBLE)} : 1</span>
        </div>
        <div className="conv-inputs">
          <div className="conv-field">
            <input
              type="number"
              min="1"
              placeholder="Кол-во рублей"
              value={diamondsInput}
              onChange={e => setDiamondsInput(e.target.value)}
              className="conv-input"
            />
            <span className="conv-cost">
              = {fmt(rublesPreview * DIAMONDS_PER_RUBLE)} 💎
            </span>
          </div>
          <button
            className="conv-btn"
            onClick={handleDiamondsToRubles}
            disabled={!diamondsInput || parseInt(diamondsInput) <= 0}
          >
            Вывести
          </button>
        </div>
      </div>

      <p className="converter-hint">
        Минимальный вывод: 1 ₽ = {fmt(DIAMONDS_PER_RUBLE)} алмазов = {fmt(DIAMONDS_PER_RUBLE * COINS_PER_DIAMOND)} монет
      </p>
    </div>
  )
})
