import { observer } from 'mobx-react-lite'
import { useState, useRef, useEffect } from 'react'
import { Garden } from './game/Garden'
import { HUD } from './components/HUD'
import { ShopPage } from './components/ShopPage'
import { ConverterPage } from './components/ConverterPage'
import { GuidePage } from './components/GuidePage'
import { gameStore } from './stores/GameStore'
import './App.css'

export type Page = 'garden' | 'shop' | 'converter' | 'guide'

const NAV = [
  { id: 'garden',    icon: '🌱', label: 'Сад'       },
  { id: 'shop',      icon: '🛒', label: 'Магазин'   },
  { id: 'converter', icon: '💱', label: 'Обменник'  },
  { id: 'guide',     icon: '📖', label: 'Гайд'      },
] as const

// Telegram WebApp type
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
    if (tg) {
      tg.ready()
      tg.expand()
      return tg.initDataUnsafe?.user ?? null
    }
  } catch {}
  return null
}

const App = observer(function App() {
  const [page, setPage] = useState<Page>('garden')
  const [tgUser] = useState<TgUser | null>(() => getTelegramUser())

  // Secret tap counter on brand icon
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [secretOpen, setSecretOpen] = useState(false)
  const [secretInput, setSecretInput] = useState('')

  function handleBrandTap() {
    tapCount.current++
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 2500)
    if (tapCount.current >= 7) {
      tapCount.current = 0
      setSecretOpen(true)
    }
  }

  function handleSecretSubmit() {
    const n = parseInt(secretInput) || 0
    if (n > 0) {
      gameStore.cheat(n)
    }
    setSecretInput('')
    setSecretOpen(false)
  }

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current)
    }
  }, [])

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-brand" onClick={handleBrandTap} style={{ cursor: 'default', userSelect: 'none' }}>
          <span className="app-brand-icon">🌳</span>
          <span className="app-brand-name">Coin Garden</span>
        </div>

        {tgUser && (
          <div className="tg-user">
            {tgUser.photo_url && (
              <img className="tg-user-avatar" src={tgUser.photo_url} alt="" />
            )}
            <span className="tg-user-name">
              {tgUser.first_name}{tgUser.last_name ? ' ' + tgUser.last_name : ''}
            </span>
          </div>
        )}

        <nav className="app-nav">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-tab ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id as Page)}
            >
              <span className="nav-tab-icon">{n.icon}</span>
              <span className="nav-tab-label">{n.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {page === 'garden'    && <Garden />}
        {page === 'shop'      && <ShopPage />}
        {page === 'converter' && <ConverterPage />}
        {page === 'guide'     && <GuidePage />}
      </main>

      <HUD onNavigate={setPage} />

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
            <button className="secret-submit" onClick={handleSecretSubmit}>
              Зачислить
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default App
