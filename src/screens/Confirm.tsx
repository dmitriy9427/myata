import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { Avatar } from '../components/Avatar'
import { masterById, serviceById, STUDIO } from '../data/studio'
import { formatDuration, formatFull, formatPrice, formatTime } from '../lib/dates'
import { useBookings } from '../store/bookings'
import { useDraft } from '../store/draft'
import { restartAt } from '../store/nav'
import { useMainButton } from '../telegram/hooks'
import { haptic, telegramUser, webApp } from '../telegram/telegram'

export function Confirm() {
  const draft = useDraft()
  const add = useBookings((s) => s.add)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const service = draft.serviceId ? serviceById(draft.serviceId) : undefined
  const master = draft.resolvedMasterId ? masterById(draft.resolvedMasterId) : undefined
  const user = telegramUser()

  // Пока запись не подтверждена — Telegram спросит «Закрыть?» при свайпе вниз.
  useEffect(() => {
    webApp?.enableClosingConfirmation()
    return () => webApp?.disableClosingConfirmation()
  }, [])

  async function submit() {
    if (!service || !master || !draft.date || draft.time === null) return
    setSaving(true)
    setError('')
    try {
      const id = await add({
        serviceId: service.id,
        masterId: master.id,
        date: draft.date,
        time: draft.time,
        comment: draft.comment.trim(),
      })
      haptic.success()
      // Черновик НЕ очищаем здесь: этот экран перерисовался бы с пустым
      // черновиком и успел бы увести на главную (<Navigate>) раньше, чем
      // сработает переход к успеху. Его очистит экран успеха.
      // История с нуля: «назад» с экрана успеха ведёт на главную, а не в форму.
      restartAt(`/done/${id}`)
    } catch {
      haptic.warning()
      setError('Не удалось сохранить запись. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  useMainButton(service ? { text: `Записаться · ${formatPrice(service.price)}`, loading: saving, onClick: submit } : null)

  if (!service || !master || !draft.date || draft.time === null) return <Navigate to="/" replace />

  return (
    <main className="screen">
      <header className="screen__head">
        <p className="eyebrow">Проверьте запись</p>
        <h1>{service.title}</h1>
      </header>

      <section className="summary">
        <div className="summary__row">
          <span className="summary__icon" aria-hidden="true">📅</span>
          <div>
            <b>{formatFull(draft.date)}</b>
            <span>
              {formatTime(draft.time)}–{formatTime(draft.time + service.duration)} · {formatDuration(service.duration)}
            </span>
          </div>
        </div>
        <div className="summary__row">
          <Avatar name={master.name} color={master.color} size={36} />
          <div>
            <b>{master.name}</b>
            <span>{master.role}</span>
          </div>
        </div>
        <div className="summary__row">
          <span className="summary__icon" aria-hidden="true">📍</span>
          <div>
            <b>{STUDIO.name}</b>
            <span>{STUDIO.address}</span>
          </div>
        </div>
        <div className="summary__total">
          <span>К оплате в студии</span>
          <b>{formatPrice(service.price)}</b>
        </div>
      </section>

      <section className="section">
        <label className="field-label" htmlFor="comment">
          Комментарий для мастера
        </label>
        <textarea
          id="comment"
          className="field"
          rows={3}
          maxLength={200}
          placeholder="Например: хочу нюдовый оттенок"
          value={draft.comment}
          onChange={(e) => draft.setComment(e.target.value)}
        />
        <p className="hint">Запишем на имя {user ? `${user.first_name} из Telegram` : 'гостя (демо-режим)'}.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}
