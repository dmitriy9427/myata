// React-хуки для кнопок Telegram.
//
// MainButton — большая кнопка внизу экрана Telegram, BackButton — стрелка
// «назад» в шапке Telegram. Это НЕ элементы страницы: ими управляют через API.
// Хуки подписываются при монтировании экрана и отписываются при уходе, так что
// каждый экран сам решает, какая у него главная кнопка.
//
// Вне Telegram те же хуки кладут состояние в маленький стор, а компонент
// <FallbackButtons> рисует обычные кнопки — экраны об этом не знают.

import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { create } from 'zustand'
import { haptic, webApp } from './telegram'

type MainButtonState = { text: string; enabled: boolean; loading: boolean; onClick: () => void } | null

/** Состояние кнопок для браузерной замены. */
export const useFallbackButtons = create<{ main: MainButtonState; back: boolean }>(() => ({ main: null, back: false }))

export function useMainButton(options: { text: string; enabled?: boolean; loading?: boolean; onClick: () => void } | null) {
  // Колбэк в ref: подписка на клик одна, а вызывается всегда свежая функция.
  const handler = useRef(options?.onClick)
  useEffect(() => {
    handler.current = options?.onClick
  })

  const text = options?.text
  const enabled = options?.enabled ?? true
  const loading = options?.loading ?? false
  const visible = options !== null

  useEffect(() => {
    if (!visible) return
    const onClick = () => {
      haptic.tap()
      handler.current?.()
    }
    if (webApp) {
      const button = webApp.MainButton
      button.setText(text!).show()
      if (enabled) button.enable()
      else button.disable()
      if (loading) button.showProgress()
      else button.hideProgress()
      button.onClick(onClick)
      return () => {
        button.offClick(onClick)
        button.hideProgress()
        button.hide()
      }
    }
    useFallbackButtons.setState({ main: { text: text!, enabled, loading, onClick } })
    return () => useFallbackButtons.setState({ main: null })
  }, [visible, text, enabled, loading])
}

/** Стрелка «назад» Telegram на всех экранах, кроме главного. */
export function useBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const show = pathname !== '/'

  useEffect(() => {
    const back = () => navigate(-1)
    if (webApp) {
      if (!show) {
        webApp.BackButton.hide()
        return
      }
      webApp.BackButton.show()
      webApp.BackButton.onClick(back)
      return () => webApp!.BackButton.offClick(back)
    }
    useFallbackButtons.setState({ back: show })
  }, [show, navigate])
}
