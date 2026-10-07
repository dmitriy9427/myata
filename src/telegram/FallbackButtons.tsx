// Замена кнопок Telegram в обычном браузере: главная кнопка внизу экрана.
// (Кнопка «назад» рисуется в шапке — см. Header.tsx.)
import { useFallbackButtons } from './hooks'
import { webApp } from './telegram'

export function FallbackMainButton() {
  const main = useFallbackButtons((s) => s.main)
  if (webApp || !main) return null
  return (
    <div className="main-button-wrap">
      <button type="button" className="main-button" disabled={!main.enabled || main.loading} onClick={main.onClick}>
        {main.loading ? <span className="main-button__spinner" aria-label="Загрузка" /> : main.text}
      </button>
    </div>
  )
}
