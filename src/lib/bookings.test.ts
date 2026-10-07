import { describe, expect, it } from 'vitest'
import { isPast, MAX_STORED, parseBookings, serializeBookings, splitBookings, takenIntervals, type Booking } from './bookings'

const b = (id: string, date: string, time: number, serviceId = 'mani'): Booking => ({
  id,
  serviceId,
  masterId: 'alina',
  date,
  time,
  comment: '',
  createdAt: 0,
})
const now = new Date(2026, 9, 7, 15, 0)

describe('записи', () => {
  it('прошедшая — когда услуга закончилась', () => {
    expect(isPast(b('1', '2026-10-06', 600), now)).toBe(true)
    expect(isPast(b('2', '2026-10-07', 14 * 60 + 30), now)).toBe(false) // идёт до 15:30
    expect(isPast(b('3', '2026-10-07', 13 * 60), now)).toBe(true)
    expect(isPast(b('4', '2026-10-08', 600), now)).toBe(false)
  })

  it('будущие — по возрастанию, прошедшие — свежие первыми', () => {
    const list = [b('a', '2026-10-09', 600), b('b', '2026-10-08', 600), b('c', '2026-10-01', 600), b('d', '2026-10-05', 600)]
    const { upcoming, past } = splitBookings(list, now)
    expect(upcoming.map((x) => x.id)).toEqual(['b', 'a'])
    expect(past.map((x) => x.id)).toEqual(['d', 'c'])
  })

  it('свои записи к мастеру занимают время на нужную длительность', () => {
    expect(takenIntervals([b('a', '2026-10-08', 600)], 'alina', '2026-10-08')).toEqual([{ from: 600, to: 660 }])
    expect(takenIntervals([b('a', '2026-10-08', 600)], 'vera', '2026-10-08')).toEqual([])
  })

  it('из хранилища берёт только корректные записи', () => {
    const raw = JSON.stringify([b('ok', '2026-10-08', 600), { id: 'x', serviceId: 'nope' }, 42, b('bad', 'вчера', 600)])
    expect(parseBookings(raw).map((x) => x.id)).toEqual(['ok'])
    expect(parseBookings('не json')).toEqual([])
    expect(parseBookings(null)).toEqual([])
  })

  it('упаковка влезает в лимит CloudStorage (4096 символов)', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ ...b(`id${i}`, '2026-09-01', 600), comment: 'к'.repeat(60) }))
    const packed = serializeBookings(many, now)
    expect(JSON.parse(packed)).toHaveLength(MAX_STORED)
    expect(packed.length).toBeLessThan(4096)
  })
})
