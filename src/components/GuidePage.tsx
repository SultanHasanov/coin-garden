import { TREES, RARITY_COLORS, RARITY_LABELS } from '../data/trees'
import { COINS_PER_DIAMOND, DIAMONDS_PER_RUBLE } from '../stores/GameStore'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export function GuidePage() {
  return (
    <div className="guide-page">
      <div className="page-title">📖 Как играть</div>

      {/* Основная механика */}
      <div className="guide-section">
        <div className="guide-section-title">Основная механика</div>
        <div className="guide-steps">
          {[
            'Тебе бесплатно даётся одна яблоня. Она автоматически приносит монеты каждый час.',
            'Монеты накапливаются на складе. Как только склад заполнится — доход останавливается.',
            'Заходи в игру, нажимай «Собрать урожай» — монеты переносятся в твой кошелёк.',
            'Покупай новые деревья в магазине, чтобы увеличить пассивный доход.',
            'Меняй монеты на алмазы, а алмазы — на рубли в разделе «Обменник».',
          ].map((text, i) => (
            <div key={i} className="guide-step">
              <span className="guide-step-num">{i + 1}</span>
              <span className="guide-step-text">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Склад */}
      <div className="guide-section">
        <div className="guide-section-title">Склад</div>
        <p className="guide-text">
          Каждое дерево добавляет объём к складу. Склад вмещает доход за 8 часов работы всех деревьев.
          Когда склад полон — деревья не приносят новых монет. Заходи хотя бы раз в 8 часов, чтобы не терять прибыль.
        </p>
        <p className="guide-text" style={{ marginTop: 6 }}>
          Покупая больше деревьев — ты увеличиваешь ёмкость склада пропорционально их производительности.
        </p>
      </div>

      {/* Деревья */}
      <div className="guide-section">
        <div className="guide-section-title">Деревья и редкости</div>
        <table className="guide-table">
          <thead>
            <tr>
              <th>Дерево</th>
              <th>Редкость</th>
              <th>Доход/ч</th>
              <th>Стоимость</th>
              <th>Ур.</th>
            </tr>
          </thead>
          <tbody>
            {TREES.map(t => (
              <tr key={t.id}>
                <td>
                  {t.emoji} {t.name}
                </td>
                <td>
                  <span style={{
                    background: RARITY_COLORS[t.rarity],
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 99,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    {RARITY_LABELS[t.rarity]}
                  </span>
                </td>
                <td style={{ color: '#d29922', fontWeight: 600 }}>+{fmt(t.incomePerHour)}</td>
                <td style={{ color: '#8b949e' }}>
                  {t.costCurrency === 'free'
                    ? '🎁 Бесплатно'
                    : t.costCurrency === 'hard'
                      ? `💎 ${fmt(t.cost)}`
                      : `🪙 ${fmt(t.cost)}`
                  }
                </td>
                <td style={{ color: '#8b949e' }}>{t.unlockLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Уровни */}
      <div className="guide-section">
        <div className="guide-section-title">Система уровней</div>
        <p className="guide-text">
          Уровень растёт автоматически по мере накопления монет. Каждый новый уровень открывает доступ к более редким деревьям.
          Нажми на кнопку уровня в нижней панели, чтобы увидеть прогресс и что открывается следующим.
        </p>
        <table className="guide-table" style={{ marginTop: 8 }}>
          <thead>
            <tr><th>Уровень</th><th>Нужно монет</th><th>Что открывается</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, i) => {
              const lvl = i + 1
              const trees = TREES.filter(t => t.unlockLevel === lvl + 1)
              return (
                <tr key={lvl}>
                  <td>Ур. {lvl} → {lvl + 1}</td>
                  <td style={{ color: '#8b949e' }}>{fmt(lvl * 1000)} 🪙</td>
                  <td style={{ color: '#8b949e' }}>
                    {trees.length > 0 ? trees.map(t => `${t.emoji} ${t.name}`).join(', ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Конвертация */}
      <div className="guide-section">
        <div className="guide-section-title">Конвертация валют</div>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="guide-step-num">1</span>
            <span className="guide-step-text">
              <b style={{ color: '#e2e8f0' }}>Монеты → Алмазы:</b> {fmt(COINS_PER_DIAMOND)} монет = 1 алмаз.
              Алмазы нужны для покупки эпических и легендарных деревьев.
            </span>
          </div>
          <div className="guide-step">
            <span className="guide-step-num">2</span>
            <span className="guide-step-text">
              <b style={{ color: '#e2e8f0' }}>Алмазы → Рубли:</b> {fmt(DIAMONDS_PER_RUBLE)} алмазов = 1 рубль.
              Рубли — это реальный вывод средств.
            </span>
          </div>
          <div className="guide-step">
            <span className="guide-step-num">3</span>
            <span className="guide-step-text">
              Итого для получения 1 рубля нужно: {fmt(COINS_PER_DIAMOND * DIAMONDS_PER_RUBLE)} монет.
              Это примерно {fmt(Math.ceil(COINS_PER_DIAMOND * DIAMONDS_PER_RUBLE / 10))} часов работы стартовой яблони.
            </span>
          </div>
        </div>
      </div>

      {/* Советы */}
      <div className="guide-section">
        <div className="guide-section-title">Советы</div>
        <div className="guide-steps">
          {[
            'Сначала купи несколько груш — они дают в 3 раза больше яблони за разумную цену.',
            'Расширяй сад равномерно: больше деревьев = больше склад = реже нужно заходить.',
            'Редкие деревья выгоднее покупать сразу несколько — доход суммируется, а бейдж ×N показывает сколько у тебя.',
            'Не держи склад полным — это прямые потери. Заходи хотя бы раз в день.',
            'Алмазы лучше копить на легендарное дерево — оно даёт x10 000 от яблони.',
          ].map((text, i) => (
            <div key={i} className="guide-step">
              <span className="guide-step-num">💡</span>
              <span className="guide-step-text">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
