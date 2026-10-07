import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { masterById, serviceById } from '../data/studio'
import { formatFull, formatTime } from '../lib/dates'
import { useBookings } from '../store/bookings'
import { useDraft } from '../store/draft'
import { useMainButton } from '../telegram/hooks'
import { inTelegram } from '../telegram/telegram'

export function Done() {
  const { id } = useParams()
  const navigate = useNavigate()
  const booking = useBookings((s) => s.list.find((b) => b.id === id))
  const service = booking && serviceById(booking.serviceId)
  const master = booking && masterById(booking.masterId)

  // Запись сохранена — черновик больше не нужен.
  useEffect(() => {
    useDraft.getState().reset()
  }, [])

  useMainButton({ text: 'Готово', onClick: () => navigate(-1) })

  return (
    <main className="screen done">
      <div className="done__check" aria-hidden="true">
        <svg viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="24" />
          <path d="M15 27l7 7 15-16" />
        </svg>
      </div>
      <h1>Вы записаны!</h1>
      {booking && service && master && (
        <p className="done__text">
          {service.title}
          <br />
          {formatFull(booking.date)}, {formatTime(booking.time)} · {master.name}
        </p>
      )}
      <p className="hint">
        {inTelegram
          ? 'Запись сохранена в Telegram и видна на всех ваших устройствах.'
          : 'Демо-режим: запись сохранена в этом браузере.'}{' '}
        Отменить можно в «Моих записях».
      </p>
      <button type="button" className="link-button" onClick={() => navigate('/bookings')}>
        Мои записи
      </button>
    </main>
  )
}
