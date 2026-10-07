import { useNavigate } from 'react-router'
import { Avatar } from '../components/Avatar'
import { masterById, serviceById } from '../data/studio'
import { splitBookings, type Booking } from '../lib/bookings'
import { formatDay, formatPrice, formatTime, relativeDay } from '../lib/dates'
import { useBookings } from '../store/bookings'
import { useDraft } from '../store/draft'
import { useMainButton } from '../telegram/hooks'
import { confirmDialog, haptic } from '../telegram/telegram'

function BookingCard({ booking, past }: { booking: Booking; past?: boolean }) {
  const cancel = useBookings((s) => s.cancel)
  const start = useDraft((s) => s.start)
  const navigate = useNavigate()
  const service = serviceById(booking.serviceId)!
  const master = masterById(booking.masterId)!
  const now = new Date()

  async function onCancel() {
    if (await confirmDialog(`Отменить запись «${service.title}» ${formatDay(booking.date)} в ${formatTime(booking.time)}?`)) {
      await cancel(booking.id)
      haptic.success()
    }
  }

  return (
    <article className="booking" data-past={past || undefined}>
      <div className="booking__date">
        <small>{relativeDay(booking.date, now)}</small>
        <b>{formatDay(booking.date)}</b>
        <span>{formatTime(booking.time)}</span>
      </div>
      <div className="booking__body">
        <b>{service.title}</b>
        <span className="booking__master">
          <Avatar name={master.name} color={master.color} size={22} /> {master.name} · {formatPrice(service.price)}
        </span>
        {booking.comment && <p className="booking__comment">«{booking.comment}»</p>}
        {past ? (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              start(service.id)
              useDraft.getState().setMaster(master.id)
              navigate(`/book/${service.id}`)
            }}
          >
            Записаться снова
          </button>
        ) : (
          <button type="button" className="link-button link-button--danger" onClick={onCancel}>
            Отменить
          </button>
        )}
      </div>
    </article>
  )
}

export function Bookings() {
  const list = useBookings((s) => s.list)
  const navigate = useNavigate()
  const { upcoming, past } = splitBookings(list, new Date())

  useMainButton(upcoming.length ? null : { text: 'Записаться', onClick: () => navigate('/', { replace: true }) })

  return (
    <main className="screen">
      <header className="screen__head">
        <h1>Мои записи</h1>
      </header>
      {upcoming.length === 0 && (
        <div className="empty">
          <p aria-hidden="true">🌿</p>
          <b>Будущих записей нет</b>
          <span className="hint">Выберите услугу — свободные окна есть уже на сегодня.</span>
        </div>
      )}
      <div className="bookings">
        {upcoming.map((b) => (
          <BookingCard key={b.id} booking={b} />
        ))}
      </div>
      {past.length > 0 && (
        <section className="section">
          <h2>Прошедшие</h2>
          <div className="bookings">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} past />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
