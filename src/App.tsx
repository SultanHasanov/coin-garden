import { observer } from 'mobx-react-lite'
import { useState, useRef, useEffect } from 'react'

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}
import { Garden } from './game/Garden'
import { HUD } from './components/HUD'
import { ShopPage } from './components/ShopPage'
import { ConverterPage } from './components/ConverterPage'
import { MarketPage } from './components/MarketPage'
import { GuidePage } from './components/GuidePage'
import { AchievementsPage } from './components/AchievementsPage'
import { gameStore } from './stores/GameStore'
import type { Achievement } from './data/achievements'
import './App.css'

export type Page = 'garden' | 'shop' | 'converter' | 'market' | 'guide' | 'achievements'

const NAV = [
  { id: 'garden',       icon: '🌱', label: 'Сад'       },
  { id: 'shop',         icon: '🛒', label: 'Магазин'   },
  { id: 'converter',    icon: '💱', label: 'Обменник'  },
  { id: 'market',       icon: '🏪', label: 'Рынок'     },
  { id: 'achievements', icon: '🏆', label: 'Успехи'    },
  { id: 'guide',        icon: '📖', label: 'Гайд'      },
] as const

interface TgUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

function getTelegramUser(): TgUser | null {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg) { tg.ready(); tg.expand(); return tg.initDataUnsafe?.user ?? null }
  } catch {}
  return null
}

interface Toast { id: number; ach: Achievement }
let toastId = 0

const App = observer(function App() {
  const [page, setPage] = useState<Page>('garden')
  const [tgUser] = useState<TgUser | null>(() => getTelegramUser())

  // Инициализация API-синхронизации при наличии Telegram-пользователя
  useEffect(() => {
    if (tgUser) {
      const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
      gameStore.initFromApi(tgUser.id, name)
    }
  }, []) // eslint-disable-line
  const [toasts, setToasts] = useState<Toast[]>([])

  // Secret tap counter
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [secretOpen, setSecretOpen] = useState(false)
  const [secretInput, setSecretInput] = useState('')

  function handleBrandTap() {
    tapCount.current++
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 2500)
    if (tapCount.current >= 7) { tapCount.current = 0; setSecretOpen(true) }
  }

  function handleSecretSubmit() {
    const n = parseInt(secretInput) || 0
    if (n > 0) gameStore.cheat(n)
    setSecretInput('')
    setSecretOpen(false)
  }

  // Achievement toasts
  useEffect(() => {
    const handler = (e: Event) => {
      const ach = (e as CustomEvent<Achievement>).detail
      const id = toastId++
      setToasts(t => [...t, { id, ach }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    }
    window.addEventListener('achievement:unlocked', handler)
    return () => window.removeEventListener('achievement:unlocked', handler)
  }, [])

  useEffect(() => {
    return () => { if (tapTimer.current) clearTimeout(tapTimer.current) }
  }, [])

  const hasNewAch = gameStore.claimedAchievements.length > 0

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-brand" onClick={handleBrandTap} style={{ cursor: 'default', userSelect: 'none' }}>
            <span className="app-brand-icon">🌳</span>
            <span className="app-brand-name">Coin Garden</span>
          </div>

          {tgUser && (
            <div className="tg-user">
              {tgUser.photo_url && <img className="tg-user-avatar" src={tgUser.photo_url} alt="" />}
              <span className="tg-user-name">
                {tgUser.first_name}{tgUser.last_name ? ' ' + tgUser.last_name : ''}
              </span>
            </div>
          )}
        </div>

        {(() => {
          const coinsNeeded = gameStore.level * 1000
          const coinsProgress = Math.min(gameStore.coins / coinsNeeded, 1)
          return (
            <div className="app-level-bar">
              <span className="app-level-label">Ур. {gameStore.level}</span>
              <div className="app-level-track">
                <div className="app-level-fill" style={{ width: `${coinsProgress * 100}%` }} />
              </div>
              <span className="app-level-coins">{fmt(gameStore.coins)} / {fmt(coinsNeeded)}</span>
            </div>
          )
        })()}
      </header>

      <main className="app-main">
        {page === 'garden'       && <Garden />}
        {page === 'shop'         && <ShopPage />}
        {page === 'converter'    && <ConverterPage />}
        {page === 'market'       && <MarketPage />}
        {page === 'achievements' && <AchievementsPage />}
        {page === 'guide'        && <GuidePage />}
      </main>

      <HUD onNavigate={setPage} />

      <nav className="app-bottom-nav">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`bottom-nav-tab ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id as Page)}
          >
            <span className="bottom-nav-tab-icon">{n.icon}</span>
            <span className="bottom-nav-tab-label">{n.label}</span>
            {n.id === 'garden' && gameStore.isDailyBonusAvailable && (
              <span className="nav-dot" />
            )}
            {n.id === 'achievements' && hasNewAch && page !== 'achievements' && (
              <span className="nav-dot gold" />
            )}
          </button>
        ))}
      </nav>

      {/* Achievement toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span className="toast-icon">{t.ach.icon}</span>
            <div>
              <div className="toast-title">Достижение!</div>
              <div className="toast-name">{t.ach.name}</div>
            </div>
          </div>
        ))}
      </div>

      {secretOpen && (
        <div className="modal-overlay" onClick={() => setSecretOpen(false)}>
          <div className="modal-box secret-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔐 Секретное место</span>
              <button className="modal-close" onClick={() => setSecretOpen(false)}>✕</button>
            </div>
            <p className="secret-hint">Введи число монет для зачисления:</p>
            <input
              className="secret-input"
              type="number"
              min="1"
              placeholder="например 999999"
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSecretSubmit()}
            />
            <button className="secret-submit" onClick={handleSecretSubmit}>Зачислить</button>
          </div>
        </div>
      )}
    </div>
  )
})

export default App
