// Черновик записи, пока пользователь идёт по шагам: услуга → мастер → день → время.

import { create } from 'zustand'

type Draft = {
  serviceId: string | null
  /** null — «любой свободный мастер». */
  masterId: string | null
  date: string | null
  time: number | null
  /** Кто реально примет (для «любого» — определяется по выбранному времени). */
  resolvedMasterId: string | null
  comment: string
  start: (serviceId: string) => void
  setMaster: (masterId: string | null) => void
  setDate: (date: string) => void
  setTime: (time: number, resolvedMasterId: string) => void
  setComment: (comment: string) => void
  reset: () => void
}

const EMPTY = { serviceId: null, masterId: null, date: null, time: null, resolvedMasterId: null, comment: '' }

export const useDraft = create<Draft>((set) => ({
  ...EMPTY,
  start: (serviceId) => set({ ...EMPTY, serviceId }),
  // Сменили мастера или день — выбранное время больше не гарантировано.
  setMaster: (masterId) => set({ masterId, time: null, resolvedMasterId: null }),
  setDate: (date) => set({ date, time: null, resolvedMasterId: null }),
  setTime: (time, resolvedMasterId) => set({ time, resolvedMasterId }),
  setComment: (comment) => set({ comment: comment.slice(0, 200) }),
  reset: () => set(EMPTY),
}))
