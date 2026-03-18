import { observer } from 'mobx-react-lite'
import { gameStore } from '../stores/GameStore'
import { ACHIEVEMENTS } from '../data/achievements'

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export const AchievementsPage = observer(function AchievementsPage() {
  const claimed = gameStore.claimedAchievements
  const total = ACHIEVEMENTS.length
  const done = claimed.length

  return (
    <div className="ach-page">
      <div className="page-title">🏆 Достижения</div>
      <div className="ach-progress-bar-wrap">
        <div className="ach-progress-label">{done} / {total} получено</div>
        <div className="ach-progress-track">
          <div className="ach-progress-fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <div className="ach-grid">
        {ACHIEVEMENTS.map(ach => {
          const isOwned = claimed.includes(ach.id)
          return (
            <div key={ach.id} className={`ach-card ${isOwned ? 'owned' : 'locked'}`}>
              <div className="ach-icon">{ach.icon}</div>
              <div className="ach-body">
                <div className="ach-name">{ach.name}</div>
                <div className="ach-desc">{ach.description}</div>
                <div className="ach-reward">
                  {ach.rewardCoins > 0 && <span>+{fmt(ach.rewardCoins)} 🪙</span>}
                  {ach.rewardDiamonds > 0 && <span>+{ach.rewardDiamonds} 💎</span>}
                </div>
              </div>
              <div className="ach-status">
                {isOwned ? <span className="ach-check">✓</span> : <span className="ach-lock">🔒</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
