// Типы той части Telegram Web App API, которой пользуется приложение.
// Полный список — https://core.telegram.org/bots/webapps
// Объект появляется как window.Telegram.WebApp после загрузки скрипта
// telegram-web-app.js (подключён в index.html).

export type ThemeParams = Partial<
  Record<
    | 'bg_color'
    | 'text_color'
    | 'hint_color'
    | 'link_color'
    | 'button_color'
    | 'button_text_color'
    | 'secondary_bg_color'
    | 'header_bg_color'
    | 'accent_text_color'
    | 'section_bg_color'
    | 'destructive_text_color',
    string
  >
>

export type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

type BottomButton = {
  text: string
  isVisible: boolean
  isActive: boolean
  setText(text: string): BottomButton
  show(): BottomButton
  hide(): BottomButton
  enable(): BottomButton
  disable(): BottomButton
  showProgress(leaveActive?: boolean): BottomButton
  hideProgress(): BottomButton
  onClick(cb: () => void): BottomButton
  offClick(cb: () => void): BottomButton
}

export type WebApp = {
  /** Подписанная строка с данными запуска. Пустая — открыто не в Telegram. */
  initData: string
  /** Те же данные разобранными, но БЕЗ проверки подписи — доверять им нельзя (см. docs). */
  initDataUnsafe: { user?: TelegramUser; start_param?: string }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: ThemeParams
  isExpanded: boolean
  ready(): void
  expand(): void
  close(): void
  isVersionAtLeast(version: string): boolean
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  onEvent(event: string, cb: () => void): void
  offEvent(event: string, cb: () => void): void
  showConfirm(message: string, cb: (ok: boolean) => void): void
  showAlert(message: string, cb?: () => void): void
  MainButton: BottomButton
  BackButton: {
    isVisible: boolean
    show(): void
    hide(): void
    onClick(cb: () => void): void
    offClick(cb: () => void): void
  }
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
  CloudStorage: {
    setItem(key: string, value: string, cb?: (error: string | null, ok?: boolean) => void): void
    getItem(key: string, cb: (error: string | null, value?: string) => void): void
    removeItem(key: string, cb?: (error: string | null, ok?: boolean) => void): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp: WebApp }
  }
}
