// Записи пользователя: тип, проверка, сортировка, упаковка для хранилища.

import { masterById, serviceById } from '../data/studio'
import { minutesNow, toDateValue } from './dates'
import type { Interval } from './schedule'

export type Booking = {
  id: string
  serviceId: string
  masterId: string
  /** YYYY-MM-DD */
  date: string
  /** Минуты от полуночи. */
  time: number
  comment: string
  createdAt: number
}

/** CloudStorage хранит строку до 4096 символов — держим не больше 20 записей. */
export const MAX_STORED = 20

/** Прошла ли запись (по окончании услуги). */
export function isPast(b: Booking, now: Date) {
  const today = toDateValue(now)
  if (b.date !== today) return b.date < today
  const duration = serviceById(b.serviceId)?.duration ?? 0
  return b.time + duration <= minutesNow(now)
}

const byStart = (a: Booking, b: Booking) => a.date.localeCompare(b.date) || a.time - b.time

export function splitBookings(list: Booking[], now: Date) {
  return {
    upcoming: list.filter((b) => !isPast(b, now)).sort(byStart),
    past: list.filter((b) => isPast(b, now)).sort((a, b) => byStart(b, a)),
  }
}

/** Свои записи к мастеру на дату — занятое время (чтобы не записаться дважды на одно). */
export function takenIntervals(list: Booking[], masterId: string, date: string): Interval[] {
  return list
    .filter((b) => b.masterId === masterId && b.date === date)
    .map((b) => ({ from: b.time, to: b.time + (serviceById(b.serviceId)?.duration ?? 0) }))
}

/** Разобрать сохранённое. В хранилище может лежать что угодно — пропускаем битое и неизвестное. */
export function parseBookings(raw: string | null): Booking[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(
      (b): b is Booking =>
        typeof b?.id === 'string' &&
        Boolean(serviceById(b.serviceId)) &&
        Boolean(masterById(b.masterId)) &&
        /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
        Number.isInteger(b.time) &&
        typeof b.comment === 'string',
    )
  } catch {
    return []
  }
}

/** Упаковать для хранилища: будущие — все, прошедшие — сколько влезет до MAX_STORED. */
export function serializeBookings(list: Booking[], now: Date) {
  const { upcoming, past } = splitBookings(list, now)
  const kept = [...upcoming, ...past].slice(0, MAX_STORED)
  return JSON.stringify(kept)
}
