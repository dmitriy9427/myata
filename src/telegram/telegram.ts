// Тонкая обёртка над Telegram Web App API.
//
// Зачем обёртка, а не прямые вызовы window.Telegram.WebApp в компонентах:
//   1. Приложение должно работать и в обычном браузере (портфолио, разработка).
//      Тогда кнопки Telegram заменяются своими, хранилище — localStorage,
//      а вибрация молча пропускается.
//   2. Старые клиенты Telegram поддерживают не все методы — проверка версии
//      в одном месте (supports).
//   3. Callback-API Telegram (CloudStorage) превращаем в промисы.

import type { TelegramUser, WebApp } from './types'

const tg: WebApp | undefined = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

/** Открыто ли внутри Telegram. Вне Telegram скрипт тоже создаёт объект, но initData пустая. */
export const inTelegram = Boolean(tg?.initData)

/** Поддерживает ли клиент метод, появившийся в версии Bot API `version`. */
export const supports = (version: string) => inTelegram && Boolean(tg?.isVersionAtLeast(version))

export const webApp = inTelegram ? tg! : null

/** Пользователь Telegram (только для приветствия — не для проверки прав!). */
export function telegramUser(): TelegramUser | null {
  return webApp?.initDataUnsafe.user ?? null
}

/** Сообщить Telegram, что приложение готово, развернуть на весь экран, покрасить шапку. */
export function initTelegram() {
  if (!webApp) return
  webApp.ready()
  webApp.expand()
  if (supports('6.1')) {
    webApp.setHeaderColor('secondary_bg_color')
    webApp.setBackgroundColor('secondary_bg_color')
  }
}

// ─── Вибрация ─────────────────────────────────────────────────────────────────

export const haptic = {
  /** Выбор в списке (дата, время). */
  select: () => supports('6.1') && webApp!.HapticFeedback.selectionChanged(),
  /** Нажатие кнопки. */
  tap: () => supports('6.1') && webApp!.HapticFeedback.impactOccurred('light'),
  success: () => supports('6.1') && webApp!.HapticFeedback.notificationOccurred('success'),
  warning: () => supports('6.1') && webApp!.HapticFeedback.notificationOccurred('warning'),
}

// ─── Диалоги ──────────────────────────────────────────────────────────────────

/** Нативное подтверждение Telegram или браузерное confirm вне его. */
export function confirmDialog(message: string): Promise<boolean> {
  if (supports('6.2')) return new Promise((resolve) => webApp!.showConfirm(message, resolve))
  return Promise.resolve(window.confirm(message))
}

// ─── Хранилище ────────────────────────────────────────────────────────────────
// CloudStorage — хранилище Telegram для конкретного пользователя и бота:
// записи доступны с любого устройства, где он вошёл в Telegram. Ограничения:
// ключ до 128 символов, значение до 4096 символов, до 1024 ключей.

export const storage = {
  get(key: string): Promise<string | null> {
    if (supports('6.9')) {
      return new Promise((resolve) => webApp!.CloudStorage.getItem(key, (error, value) => resolve(error ? null : value || null)))
    }
    try {
      return Promise.resolve(localStorage.getItem(`myata:${key}`))
    } catch {
      return Promise.resolve(null)
    }
  },
  set(key: string, value: string): Promise<void> {
    if (supports('6.9')) {
      return new Promise((resolve, reject) =>
        webApp!.CloudStorage.setItem(key, value, (error) => (error ? reject(new Error(error)) : resolve())),
      )
    }
    try {
      localStorage.setItem(`myata:${key}`, value)
    } catch {
      // Приватный режим — живём без сохранения.
    }
    return Promise.resolve()
  },
}
