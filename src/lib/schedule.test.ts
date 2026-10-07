import { describe, expect, it } from 'vitest'
import { MASTERS, serviceById, STUDIO } from '../data/studio'
import { busyIntervals, daySlots, freeStarts, isTooSoon, overlaps, worksOn } from './schedule'

const alina = MASTERS.find((m) => m.id === 'alina')!
const mani = serviceById('mani-gel')! // 120 минут
// Среда, 7 октября 2026: Алина работает (пн–пт).
const DAY = '2026-10-07'
const before = new Date(2026, 9, 6, 12, 0) // накануне — сегодняшнее ограничение не действует

describe('расписание', () => {
  it('пересечение отрезков', () => {
    expect(overlaps({ from: 600, to: 660 }, { from: 630, to: 700 })).toBe(true)
    expect(overlaps({ from: 600, to: 660 }, { from: 660, to: 720 })).toBe(false)
  })

  it('мастер не работает в выходной', () => {
    expect(worksOn(alina, '2026-10-11')).toBe(false) // воскресенье
    expect(freeStarts(alina, '2026-10-11', 60, before).size).toBe(0)
  })

  it('занятость «других клиентов» одинакова при каждом вызове', () => {
    expect(busyIntervals('alina', DAY)).toEqual(busyIntervals('alina', DAY))
    expect(busyIntervals('alina', DAY)).not.toEqual(busyIntervals('alina', '2026-10-08'))
  })

  it('свободное начало не пересекается с занятым и укладывается до закрытия', () => {
    const busy = busyIntervals('alina', DAY)
    for (const t of freeStarts(alina, DAY, mani.duration, before)) {
      expect(t + mani.duration).toBeLessThanOrEqual(STUDIO.close)
      expect(busy.some((b) => overlaps(b, { from: t, to: t + mani.duration }))).toBe(false)
    }
  })

  it('своя запись тоже занимает время', () => {
    const free = [...freeStarts(alina, DAY, 60, before)]
    const t = free[0]!
    const after = freeStarts(alina, DAY, 60, before, [{ from: t, to: t + 60 }])
    expect(after.has(t)).toBe(false)
  })

  it('на сегодня — не раньше чем через час', () => {
    const now = new Date(2026, 9, 7, 14, 10)
    for (const t of freeStarts(alina, DAY, 60, now)) expect(t).toBeGreaterThanOrEqual(15 * 60 + 10)
    expect(isTooSoon(DAY, 15 * 60, now)).toBe(true)
    expect(isTooSoon(DAY, 15 * 60 + 30, now)).toBe(false)
    expect(isTooSoon('2026-10-08', 600, now)).toBe(false)
  })

  it('«любой мастер» — время свободно, если свободен хоть кто-то, и назначает его', () => {
    const any = daySlots(mani, null, DAY, before)
    const alinaOnly = daySlots(mani, 'alina', DAY, before)
    expect(any.filter((s) => s.free).length).toBeGreaterThanOrEqual(alinaOnly.filter((s) => s.free).length)
    for (const slot of any.filter((s) => s.free)) expect(['alina', 'vera']).toContain(slot.masterId)
  })
})
