// Записи пользователя. Хранятся в CloudStorage Telegram (или localStorage в
// браузере) под одним ключом. Загружаются при старте приложения.

import { create } from 'zustand'
import { parseBookings, serializeBookings, type Booking } from '../lib/bookings'
import { storage } from '../telegram/telegram'

const KEY = 'bookings'

type BookingsState = {
  list: Booking[]
  loaded: boolean
  load: () => Promise<void>
  /** Создать запись: id и время создания проставляет стор. Возвращает id. */
  add: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<string>
  cancel: (id: string) => Promise<void>
}

export const useBookings = create<BookingsState>((set, get) => {
  const persist = (list: Booking[]) => storage.set(KEY, serializeBookings(list, new Date()))

  return {
    list: [],
    loaded: false,
    load: async () => {
      if (get().loaded) return
      set({ list: parseBookings(await storage.get(KEY)), loaded: true })
    },
    add: async (draft) => {
      const booking: Booking = { ...draft, id: crypto.randomUUID().slice(0, 8), createdAt: Date.now() }
      const list = [...get().list, booking]
      // Сначала сохраняем, потом показываем: если хранилище отказало, пользователь
      // не должен видеть запись, которой нет.
      await persist(list)
      set({ list })
      return booking.id
    },
    cancel: async (id) => {
      const list = get().list.filter((b) => b.id !== id)
      await persist(list)
      set({ list })
    },
  }
})
