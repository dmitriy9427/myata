import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CATEGORIES, SERVICES, STUDIO, serviceById, type CategoryId } from '../data/studio'
import { splitBookings } from '../lib/bookings'
import { formatDuration, formatPrice, formatTime, relativeDay } from '../lib/dates'
import { useBookings } from '../store/bookings'
import { useDraft } from '../store/draft'
import { haptic, telegramUser } from '../telegram/telegram'

export function Home() {
  const navigate = useNavigate()
  const start = useDraft((s) => s.start)
  const bookings = useBookings((s) => s.list)
  const upcoming = splitBookings(bookings, new Date()).upcoming
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const user = telegramUser()
  const services = SERVICES.filter((s) => category === 'all' || s.category === category)

  return (
    <main className="screen">
      <section className="studio">
        <p className="studio__hello">{user ? `Привет, ${user.first_name}!` : 'Привет!'}</p>
        <h1 className="studio__name">{STUDIO.name}</h1>
        <p className="studio__tagline">{STUDIO.tagline}</p>
        <p className="studio__meta">
          <span>★ {STUDIO.rating}</span>
          <span>{STUDIO.address}</span>
        </p>
        <span className="studio__leaf" aria-hidden="true" />
      </section>

      {upcoming[0] && (
        <button type="button" className="next-visit" onClick={() => navigate('/bookings')}>
          <span className="next-visit__body">
            <small>Ближайшая запись</small>
            <b>
              {relativeDay(upcoming[0].date, new Date())}, {formatTime(upcoming[0].time)} ·{' '}
              {serviceById(upcoming[0].serviceId)?.title}
            </b>
          </span>
          <span className="next-visit__all">Все · {upcoming.length}</span>
        </button>
      )}

      <div className="chips" role="radiogroup" aria-label="Категории">
        {[{ id: 'all' as const, title: 'Все', emoji: '🌿' }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={category === c.id}
            className="chip"
            onClick={() => {
              haptic.select()
              setCategory(c.id)
            }}
          >
            <span aria-hidden="true">{c.emoji}</span> {c.title}
          </button>
        ))}
      </div>

      <ul className="services">
        {services.map((s, i) => (
          <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
            <button
              type="button"
              className="service"
              onClick={() => {
                start(s.id)
                navigate(`/book/${s.id}`)
              }}
            >
              <span className="service__body">
                <b>{s.title}</b>
                <span>{s.text}</span>
                <small>{formatDuration(s.duration)}</small>
              </span>
              <span className="service__price">{formatPrice(s.price)}</span>
            </button>
          </li>
        ))}
      </ul>

      {!upcoming[0] && bookings.length > 0 && (
        <button type="button" className="link-button" onClick={() => navigate('/bookings')}>
          История записей
        </button>
      )}
    </main>
  )
}
