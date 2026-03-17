import { observer } from 'mobx-react-lite'
import { useState, useEffect, useCallback } from 'react'
import { gameStore } from '../stores/GameStore'
import { getTreeById, RARITY_COLORS } from '../data/trees'
import { TREE_IMAGES } from '../assets/treeImages'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

interface Particle { id: number; x: number; y: number }
let pid = 0

export const Garden = observer(function Garden() {
  const [particles, setParticles] = useState<Particle[]>([])

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

      {/* Грид деревьев — показываем все купленные + 1 пустой слот */}
      <div className="tree-grid" style={{ position: 'relative' }}>
        {[...gameStore.ownedTrees, null].map((ot, i) => (
          <TreeCard key={i} treeId={ot?.treeId ?? null} count={ot?.count ?? 0} />
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
    </div>
  )
})

const TreeCard = observer(function TreeCard({ treeId, count }: { treeId: string | null; count: number }) {
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
  const total = tree.incomePerHour * count

  return (
    <div
      className="tree-card filled"
      style={{ '--rc': rc } as React.CSSProperties}
    >
      {count > 1 && <div className="tree-count-badge">×{count}</div>}
      <div className="tree-rarity-dot" />

      <div className="tree-card-img-wrap">
        {TREE_IMAGES[treeId] ? (
          <img src={TREE_IMAGES[treeId]} alt={tree.name} className="tree-card-img" />
        ) : (
          <span style={{ fontSize: '52px' }}>{tree.emoji}</span>
        )}
      </div>

      <span className="tree-card-name">{tree.name}</span>
      <span className="tree-card-income">+{fmt(total)}/ч</span>
    </div>
  )
})
