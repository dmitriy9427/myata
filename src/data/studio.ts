// Данные студии. В настоящем проекте приходят с сервера (CRM салона); здесь —
// константы, чтобы Mini App работала без бэкенда.

export type CategoryId = 'nails' | 'hair' | 'brows'

export type Service = {
  id: string
  category: CategoryId
  title: string
  text: string
  /** Минуты. */
  duration: number
  price: number
}

export type Master = {
  id: string
  name: string
  role: string
  categories: CategoryId[]
  rating: number
  reviews: number
  /** Рабочие дни недели: 0 — воскресенье … 6 — суббота. */
  workdays: number[]
  color: string
}

export const STUDIO = {
  name: 'Мята',
  tagline: 'Студия маникюра, стрижек и бровей',
  address: 'ул. Пушкина, 12 · 3 мин от метро',
  rating: 4.9,
  /** Часы работы, минуты от полуночи. */
  open: 10 * 60,
  close: 21 * 60,
}

export const CATEGORIES: { id: CategoryId; title: string; emoji: string }[] = [
  { id: 'nails', title: 'Ногти', emoji: '💅' },
  { id: 'hair', title: 'Волосы', emoji: '✂️' },
  { id: 'brows', title: 'Брови', emoji: '✨' },
]

export const SERVICES: Service[] = [
  { id: 'mani-gel', category: 'nails', title: 'Маникюр с покрытием', text: 'Снятие, аппаратный маникюр, гель-лак', duration: 120, price: 2400 },
  { id: 'mani', category: 'nails', title: 'Маникюр без покрытия', text: 'Аппаратный или комбинированный', duration: 60, price: 1400 },
  { id: 'pedi', category: 'nails', title: 'Педикюр с покрытием', text: 'Smart-педикюр и гель-лак', duration: 120, price: 3200 },
  { id: 'cut-w', category: 'hair', title: 'Женская стрижка', text: 'Мытьё, стрижка, укладка', duration: 90, price: 2800 },
  { id: 'cut-m', category: 'hair', title: 'Мужская стрижка', text: 'Машинка и ножницы, мытьё', duration: 60, price: 1600 },
  { id: 'style', category: 'hair', title: 'Укладка', text: 'Брашинг или локоны', duration: 60, price: 1900 },
  { id: 'brows', category: 'brows', title: 'Коррекция и окрашивание', text: 'Форма, краска или хна', duration: 60, price: 1500 },
  { id: 'lami', category: 'brows', title: 'Ламинирование бровей', text: 'С окрашиванием и уходом', duration: 90, price: 2600 },
]

export const MASTERS: Master[] = [
  { id: 'alina', name: 'Алина', role: 'Топ-мастер маникюра', categories: ['nails'], rating: 5.0, reviews: 214, workdays: [1, 2, 3, 4, 5], color: '#2bb673' },
  { id: 'vera', name: 'Вера', role: 'Мастер маникюра и бровей', categories: ['nails', 'brows'], rating: 4.9, reviews: 167, workdays: [0, 3, 4, 5, 6], color: '#3d8bfd' },
  { id: 'denis', name: 'Денис', role: 'Барбер-стилист', categories: ['hair'], rating: 4.9, reviews: 302, workdays: [2, 3, 4, 5, 6], color: '#ff8a3d' },
  { id: 'sofia', name: 'София', role: 'Стилист-колорист', categories: ['hair', 'brows'], rating: 4.8, reviews: 128, workdays: [0, 1, 2, 5, 6], color: '#e05bd0' },
]

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)
export const masterById = (id: string) => MASTERS.find((m) => m.id === id)
export const mastersFor = (service: Service) =>
  MASTERS.filter((m) => m.categories.includes(service.category)).sort((a, b) => b.rating - a.rating)
