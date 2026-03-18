import { observer } from 'mobx-react-lite'
import { useState, useEffect, useCallback } from 'react'
import { gameStore } from '../stores/GameStore'
import { getListings, type MarketListing } from '../services/api'
import { getTreeById, RARITY_COLORS } from '../data/trees'

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

function EnhancementStars({ level }: { level: number }) {
  return (
    <span className="mkt-stars">
      {'★'.repeat(level)}{'☆'.repeat(5 - level)}
    </span>
  )
}

// ─── Карточка листинга ───────────────────────────────────────────────────────
const ListingCard = observer(function ListingCard({
  listing,
  onAction,
  isMine,
}: {
  listing: MarketListing
  onAction: (listing: MarketListing) => void
  isMine: boolean
}) {
  const tree = getTreeById(listing.treeId)
  const rc = tree ? RARITY_COLORS[tree.rarity] : '#8b949e'
  const canAfford = gameStore.rubles >= listing.priceRubles

  return (
    <div className="mkt-card" style={{ borderColor: rc + '55' }}>
      <div className="mkt-card-header">
        <span className="mkt-card-emoji">{listing.treeEmoji}</span>
        <div className="mkt-card-info">
          <div className="mkt-card-name">{listing.treeName}</div>
          <div className="mkt-card-meta">
            <span className="mkt-card-count">×{listing.count} шт.</span>
            {listing.enhancementLevel > 0 && (
              <EnhancementStars level={listing.enhancementLevel} />
            )}
          </div>
          {tree && (
            <div className="mkt-card-income">
              +{fmt(tree.incomePerHour * listing.count * (1 + listing.enhancementLevel * 0.1))}/ч
            </div>
          )}
        </div>
        <div className="mkt-card-right">
          <div className="mkt-card-price">{fmt(listing.priceRubles)} ₽</div>
          <div className="mkt-card-seller">от {listing.sellerName}</div>
        </div>
      </div>

      {isMine ? (
        <button className="mkt-btn mkt-btn--cancel" onClick={() => onAction(listing)}>
          Отозвать
        </button>
      ) : (
        <button
          className={`mkt-btn mkt-btn--buy ${canAfford ? '' : 'disabled'}`}
          disabled={!canAfford}
          onClick={() => onAction(listing)}
        >
          {canAfford ? `Купить за ${fmt(listing.priceRubles)} ₽` : `Нужно ещё ${fmt(listing.priceRubles - gameStore.rubles)} ₽`}
        </button>
      )}
    </div>
  )
})

// ─── Форма выставления ───────────────────────────────────────────────────────
const SellForm = observer(function SellForm({ onListed }: { onListed: () => void }) {
  const [treeId, setTreeId] = useState('')
  const [count, setCount] = useState('1')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sellableTrees = gameStore.ownedTrees.filter(t => t.count > 0)
  const selected = sellableTrees.find(t => t.treeId === treeId)
  const selectedTree = treeId ? getTreeById(treeId) : null
  const maxCount = selected?.count ?? 1

  async function handleSubmit() {
    if (!treeId || !price) return
    const cnt = parseInt(count) || 1
    const prc = parseInt(price) || 0
    setLoading(true)
    setError(null)
    const err = await gameStore.listForSale(treeId, cnt, prc)
    setLoading(false)
    if (err) {
      setError(err)
    } else {
      setTreeId('')
      setCount('1')
      setPrice('')
      onListed()
    }
  }

  return (
    <div className="mkt-sell-form">
      <div className="mkt-sell-title">Выставить на продажу</div>

      {sellableTrees.length === 0 ? (
        <div className="mkt-empty">У тебя нет деревьев для продажи</div>
      ) : (
        <>
          {/* Выбор дерева */}
          <div className="mkt-field">
            <label>Дерево</label>
            <select
              className="mkt-select"
              value={treeId}
              onChange={e => { setTreeId(e.target.value); setCount('1') }}
            >
              <option value="">— выбрать —</option>
              {sellableTrees.map(t => {
                const tree = getTreeById(t.treeId)
                const enh = gameStore.getTreeEnhancement(t.treeId)
                return (
                  <option key={t.treeId} value={t.treeId}>
                    {tree?.emoji} {tree?.name} ×{t.count}{enh > 0 ? ` ★${enh}` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {selectedTree && (
            <div className="mkt-selected-info">
              <span>{selectedTree.emoji} {selectedTree.name}</span>
              {gameStore.getTreeEnhancement(treeId) > 0 && (
                <EnhancementStars level={gameStore.getTreeEnhancement(treeId)} />
              )}
              <span className="mkt-selected-income">
                +{fmt(selectedTree.incomePerHour)}/ч базовый
              </span>
            </div>
          )}

          {/* Количество */}
          <div className="mkt-field">
            <label>Количество (макс. {maxCount})</label>
            <input
              type="number"
              min={1}
              max={maxCount}
              className="mkt-input"
              value={count}
              onChange={e => setCount(String(Math.min(parseInt(e.target.value) || 1, maxCount)))}
              disabled={!treeId}
            />
          </div>

          {/* Цена */}
          <div className="mkt-field">
            <label>Цена в рублях</label>
            <input
              type="number"
              min={1}
              className="mkt-input"
              placeholder="0 ₽"
              value={price}
              onChange={e => setPrice(e.target.value)}
              disabled={!treeId}
            />
            {price && count && (
              <span className="mkt-field-hint">
                {fmt(parseInt(price) / (parseInt(count) || 1))} ₽ за штуку
              </span>
            )}
          </div>

          {error && <div className="mkt-error">{error}</div>}

          <button
            className="mkt-btn mkt-btn--submit"
            disabled={!treeId || !price || parseInt(price) <= 0 || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Размещаю...' : '📦 Выставить на продажу'}
          </button>
        </>
      )}
    </div>
  )
})

// ─── Основной компонент ──────────────────────────────────────────────────────
export const MarketPage = observer(function MarketPage() {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(false)
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getListings()
    setListings(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showFlash(msg: string, ok: boolean) {
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 2500)
  }

  async function handleBuy(listing: MarketListing) {
    const err = await gameStore.buyListing(listing)
    if (err) {
      showFlash(err, false)
    } else {
      showFlash(`✅ Куплено: ${listing.treeEmoji} ${listing.treeName} ×${listing.count}`, true)
      setListings(prev => prev.filter(l => l.id !== listing.id))
    }
  }

  async function handleCancel(listing: MarketListing) {
    const err = await gameStore.cancelListing(listing)
    if (err) {
      showFlash(err, false)
    } else {
      showFlash('Объявление отозвано', true)
      setListings(prev => prev.filter(l => l.id !== listing.id))
    }
  }

  if (!gameStore.telegramId) {
    return (
      <div className="mkt-page">
        <div className="page-title">🏪 Рынок</div>
        <div className="mkt-no-auth">
          <div className="mkt-no-auth-icon">🔒</div>
          <div className="mkt-no-auth-text">
            Для доступа к рынку необходима авторизация через Telegram Mini App
          </div>
        </div>
      </div>
    )
  }

  const myListings = listings.filter(l => l.sellerId === gameStore.telegramId)
  const otherListings = listings.filter(l => l.sellerId !== gameStore.telegramId)

  return (
    <div className="mkt-page">
      <div className="page-title">🏪 Рынок деревьев</div>

      {/* Баланс рублей */}
      <div className="mkt-balance">
        <span className="mkt-balance-icon">₽</span>
        <div>
          <div className="mkt-balance-label">Ваши рубли</div>
          <div className="mkt-balance-value">{fmt(gameStore.rubles)} ₽</div>
        </div>
      </div>

      {flash && (
        <div className={`mkt-flash ${flash.ok ? '' : 'err'}`}>{flash.msg}</div>
      )}

      {/* Табы */}
      <div className="mkt-tabs">
        <button
          className={`mkt-tab ${tab === 'buy' ? 'active' : ''}`}
          onClick={() => setTab('buy')}
        >
          🛒 Купить
          {otherListings.length > 0 && (
            <span className="mkt-tab-count">{otherListings.length}</span>
          )}
        </button>
        <button
          className={`mkt-tab ${tab === 'sell' ? 'active' : ''}`}
          onClick={() => setTab('sell')}
        >
          📦 Мои объявления
          {myListings.length > 0 && (
            <span className="mkt-tab-count">{myListings.length}</span>
          )}
        </button>
      </div>

      {/* ── Вкладка Купить ── */}
      {tab === 'buy' && (
        <div className="mkt-list">
          <div className="mkt-list-header">
            <span className="mkt-list-count">
              {loading ? 'Загрузка...' : `${otherListings.length} объявлений`}
            </span>
            <button className="mkt-refresh" onClick={load} disabled={loading}>
              🔄 Обновить
            </button>
          </div>

          {!loading && otherListings.length === 0 && (
            <div className="mkt-empty">
              Пока нет объявлений. Стань первым продавцом!
            </div>
          )}

          {otherListings.map(l => (
            <ListingCard key={l.id} listing={l} onAction={handleBuy} isMine={false} />
          ))}
        </div>
      )}

      {/* ── Вкладка Мои объявления ── */}
      {tab === 'sell' && (
        <div className="mkt-sell-tab">
          <SellForm onListed={() => { load(); showFlash('Объявление выставлено!', true) }} />

          {myListings.length > 0 && (
            <>
              <div className="mkt-my-title">Активные объявления</div>
              {myListings.map(l => (
                <ListingCard key={l.id} listing={l} onAction={handleCancel} isMine />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
})
