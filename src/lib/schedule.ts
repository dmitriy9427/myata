// Расписание: какие окна свободны у мастера в выбранный день.
//
// Занятость «других клиентов» в демо генерируется детерминированно (одинаково
// при каждом открытии): генератор случайных чисел с зерном из id мастера и
// даты. В настоящем проекте занятость приходит с сервера.

import { MASTERS, STUDIO, type Master, type Service } from '../data/studio'
import { minutesNow, toDateValue, weekday } from './dates'

export const STEP = 30
/** Записаться на сегодня можно не раньше, чем за час до начала. */
export const LEAD_MINUTES = 60

/** Отрезок времени [from, to) в минутах от полуночи. */
export type Interval = { from: number; to: number }

export type Slot = { time: number; free: boolean; masterId: string | null }

export const overlaps = (a: Interval, b: Interval) => a.from < b.to && b.from < a.to

/** mulberry32: одинаковое зерно → одинаковая последовательность. */
function seeded(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export const worksOn = (master: Master, date: string) => master.workdays.includes(weekday(date))

/** Записи «других клиентов» мастера на день — 3–5 отрезков по 1–2 часа. */
export function busyIntervals(masterId: string, date: string): Interval[] {
  const rnd = seeded(hash(`${masterId}:${date}`))
  const count = 3 + Math.floor(rnd() * 3)
  const slots = (STUDIO.close - STUDIO.open) / STEP
  const result: Interval[] = []
  for (let i = 0; i < count; i++) {
    const from = STUDIO.open + Math.floor(rnd() * slots) * STEP
    const length = (2 + Math.floor(rnd() * 3)) * STEP
    result.push({ from, to: Math.min(STUDIO.close, from + length) })
  }
  return result
}

/**
 * Время начала, свободное у мастера для услуги длительностью `duration`.
 * `taken` — свои записи пользователя к этому мастеру (тоже занимают время).
 */
export function freeStarts(master: Master, date: string, duration: number, now: Date, taken: Interval[] = []) {
  if (!worksOn(master, date)) return new Set<number>()
  const busy = [...busyIntervals(master.id, date), ...taken]
  const earliest = date === toDateValue(now) ? minutesNow(now) + LEAD_MINUTES : -1
  const result = new Set<number>()
  for (let t = STUDIO.open; t + duration <= STUDIO.close; t += STEP) {
    const want = { from: t, to: t + duration }
    if (t >= earliest && !busy.some((b) => overlaps(b, want))) result.add(t)
  }
  return result
}

/**
 * Сетка времени на день. masterId = null — «любой мастер»: время свободно,
 * если свободен хоть кто-то из подходящих (берём самого высокого по рейтингу).
 */
export function daySlots(
  service: Service,
  masterId: string | null,
  date: string,
  now: Date,
  takenBy: (masterId: string) => Interval[] = () => [],
): Slot[] {
  const masters = MASTERS.filter((m) => m.categories.includes(service.category) && (!masterId || m.id === masterId)).sort(
    (a, b) => b.rating - a.rating,
  )
  const free = masters.map((m) => ({ id: m.id, starts: freeStarts(m, date, service.duration, now, takenBy(m.id)) }))
  const slots: Slot[] = []
  for (let t = STUDIO.open; t + service.duration <= STUDIO.close; t += STEP) {
    const who = free.find((f) => f.starts.has(t))
    slots.push({ time: t, free: Boolean(who), masterId: who?.id ?? null })
  }
  return slots
}

/** Слишком рано для записи (сегодня и до начала меньше часа) — такое время не показываем вовсе. */
export const isTooSoon = (date: string, time: number, now: Date) =>
  date === toDateValue(now) && time < minutesNow(now) + LEAD_MINUTES

/** Утро / день / вечер — для группировки кнопок времени. */
export function partOfDay(minutes: number) {
  if (minutes < 12 * 60) return 'Утро'
  if (minutes < 17 * 60) return 'День'
  return 'Вечер'
}
