import '@fontsource-variable/onest'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/app.scss'
import { inTelegram, initTelegram } from './telegram/telegram'

initTelegram()
// Класс на <html>: стили для запуска внутри Telegram и вне его.
document.documentElement.classList.add(inTelegram ? 'is-telegram' : 'is-browser')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
