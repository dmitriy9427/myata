import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Avatar } from '../components/Avatar'
import { masterById, mastersFor, serviceById } from '../data/studio'
import { takenIntervals } from '../lib/bookings'
import { formatDay, formatDuration, formatPrice, formatTime, nextDays, relativeDay } from '../lib/dates'
import { daySlots, isTooSoon, partOfDay } from '../lib/schedule'
import { useBookings } from '../store/bookings'
import { useDraft } from '../store/draft'
import { useMainButton } from '../telegram/hooks'
import { haptic } from '../telegram/telegram'

const DAYS = 14

export function Book() {
  const { serviceId = '' } = useParams()
  const service = serviceById(serviceId)
  const navigate = useNavigate()
  const draft = useDraft()
  const bookings = useBookings((s) => s.list)
  const now = useMemo(() => new Date(), [])
  const days = useMemo(() => nextDays(now, DAYS), [now])

  // Свободных окон на каждый день — для подписи под датой и выбора первого дня.
  const perDay = useMemo(() => {
    if (!service) return []
    return days.map((date) => ({
      date,
      free: daySlots(service, draft.masterId, date, now, (m) => takenIntervals(bookings, m, date)).filter((s) => s.free).length,
    }))
  }, [service, draft.masterId, days, now, bookings])

  // Выбираем ближайший день, где есть окна, если день ещё не выбран или там пусто.
  useEffect(() => {
    const current = perDay.find((d) => d.date === draft.date)
    if (!current?.free) {
      const first = perDay.find((d) => d.free)
      if (first) draft.setDate(first.date)
    }
  }, [perDay, draft])

  const slots = useMemo(
    () =>
      service && draft.date
        ? daySlots(service, draft.masterId, draft.date, now, (m) => takenIntervals(bookings, m, draft.date!))
        : [],
    [service, draft.masterId, draft.date, now, bookings],
  )
  const groups = useMemo(() => {
    const map = new Map<string, typeof slots>()
    // Прошедшее сегодня время не показываем; занятое — показываем бледным.
    for (const slot of slots) {
      if (draft.date && isTooSoon(draft.date, slot.time, now)) continue
      map.set(partOfDay(slot.time), [...(map.get(partOfDay(slot.time)) ?? []), slot])
    }
    return [...map]
  }, [slots, draft.date, now])

  useMainButton(
    draft.time !== null && draft.date
      ? { text: `Далее · ${formatDay(draft.date)}, ${formatTime(draft.time)}`, onClick: () => navigate('/confirm') }
      : null,
  )

  if (!service) return <Navigate to="/" replace />
  const masters = mastersFor(service)

  return (
    <main className="screen">
      <header className="screen__head">
        <p className="eyebrow">Запись</p>
        <h1>{service.title}</h1>
        <p className="hint">
          {formatDuration(service.duration)} · {formatPrice(service.price)}
        </p>
      </header>

      <section className="section" aria-labelledby="masters-title">
        <h2 id="masters-title">Мастер</h2>
        <div className="masters" role="radiogroup" aria-labelledby="masters-title">
          <button
            type="button"
            role="radio"
            aria-checked={draft.masterId === null}
            className="master"
            onClick={() => {
              haptic.select()
              draft.setMaster(null)
            }}
          >
            <span className="avatar avatar--any" aria-hidden="true">
              ⚡
            </span>
            <b>Любой</b>
            <small>ближайшее время</small>
          </button>
          {masters.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={draft.masterId === m.id}
              className="master"
              onClick={() => {
                haptic.select()
                draft.setMaster(m.id)
              }}
            >
              <Avatar name={m.name} color={m.color} />
              <b>{m.name}</b>
              <small>★ {m.rating.toFixed(1)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="days-title">
        <h2 id="days-title">День</h2>
        <div className="days" role="radiogroup" aria-labelledby="days-title">
          {perDay.map(({ date, free }) => (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={draft.date === date}
              disabled={!free}
              className="day"
              onClick={() => {
                haptic.select()
                draft.setDate(date)
              }}
            >
              <small>{relativeDay(date, now)}</small>
              <b>{formatDay(date).split(' ')[0]}</b>
              <small>{free ? `${free} окон` : 'нет'}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="time-title">
        <h2 id="time-title">Время</h2>
        {groups.map(([part, list]) => (
          <div key={part} className="times-group">
            <p className="hint">{part}</p>
            <div className="times" role="radiogroup" aria-label={part}>
              {list.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  role="radio"
                  aria-checked={draft.time === slot.time}
                  disabled={!slot.free}
                  className="time"
                  onClick={() => {
                    haptic.select()
                    draft.setTime(slot.time, slot.masterId!)
                  }}
                >
                  {formatTime(slot.time)}
                </button>
              ))}
            </div>
          </div>
        ))}
        {draft.masterId === null && draft.time !== null && draft.resolvedMasterId && (
          <p className="hint">Примет: {masterById(draft.resolvedMasterId)?.name}</p>
        )}
      </section>
    </main>
  )
}
