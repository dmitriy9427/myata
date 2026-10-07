// Даты записи — строки YYYY-MM-DD по МЕСТНОМУ времени (день в календаре, а не
// момент времени). Время — минуты от полуночи: 630 = 10:30.

export function toDateValue(d: Date) {
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** '2026-10-06' → Date на полночь по местному времени. */
export function fromDateValue(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** Ближайшие `count` дней начиная с сегодняшнего. */
export function nextDays(now: Date, count: number) {
  return Array.from({ length: count }, (_, i) => toDateValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)))
}

export const weekday = (value: string) => fromDateValue(value).getDay()

export const minutesNow = (now: Date) => now.getHours() * 60 + now.getMinutes()

export const formatTime = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`

const fmtDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const fmtWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const fmtFull = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

/** «6 октября» */
export const formatDay = (value: string) => fmtDay.format(fromDateValue(value))
/** «пн» */
export const formatWeekday = (value: string) => fmtWeekday.format(fromDateValue(value)).replace('.', '')
/** «понедельник, 6 октября» */
export const formatFull = (value: string) => fmtFull.format(fromDateValue(value))

/** «Сегодня», «Завтра» или день недели. */
export function relativeDay(value: string, now: Date) {
  const today = toDateValue(now)
  const tomorrow = toDateValue(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  if (value === today) return 'Сегодня'
  if (value === tomorrow) return 'Завтра'
  return formatWeekday(value)
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

export const formatPrice = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
