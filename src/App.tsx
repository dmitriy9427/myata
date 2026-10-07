// Каркас Mini App: маршруты, шапка, кнопки Telegram.
//
// Роутер — MemoryRouter: история переходов живёт в памяти, адрес страницы не
// меняется. Telegram передаёт параметры запуска в hash адреса
// (#tgWebAppData=…), и HashRouter принял бы их за маршрут. Да и ссылки на
// внутренние экраны Mini App не нужны — открывают её из бота.

import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useBookings } from './store/bookings'
import { useNav } from './store/nav'
import { Book } from './screens/Book'
import { Bookings } from './screens/Bookings'
import { Confirm } from './screens/Confirm'
import { Done } from './screens/Done'
import { Home } from './screens/Home'
import { FallbackMainButton } from './telegram/FallbackButtons'
import { useBackButton, useFallbackButtons } from './telegram/hooks'
import { inTelegram } from './telegram/telegram'

function Shell() {
  useBackButton()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const showBack = useFallbackButtons((s) => s.back)
  const load = useBookings((s) => s.load)
  useEffect(() => {
    void load()
  }, [load])

  // Новый экран — наверх (MemoryRouter прокрутку сам не сбрасывает).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      {!inTelegram && (
        <header className="demo-bar">
          {showBack ? (
            <button type="button" className="demo-bar__back" onClick={() => navigate(-1)} aria-label="Назад">
              ‹ Назад
            </button>
          ) : (
            <span className="demo-bar__logo">🌿 Мята</span>
          )}
          <span className="demo-bar__note">Демо вне Telegram</span>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book/:serviceId" element={<Book />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/done/:id" element={<Done />} />
        <Route path="/bookings" element={<Bookings />} />
      </Routes>
      <FallbackMainButton />
    </div>
  )
}

export function App() {
  const { key, entries } = useNav()
  return (
    <MemoryRouter key={key} initialEntries={entries} initialIndex={entries.length - 1}>
      <Shell />
    </MemoryRouter>
  )
}
