# 1. Обёртка над Telegram

[src/telegram/telegram.ts](../../src/telegram/telegram.ts). Глава — [02. Обёртка](../02-wrapper.md).

## Где это

Нигде на экране — и в каждой кнопке, вибрации, сохранении. Экраны «Мяты» не обращаются к
`window.Telegram` напрямую: только к функциям этого файла.

## Что делает

- Определяет, открыто ли приложение в Telegram.
- Проверяет, поддерживает ли клиент нужный метод (версия Bot API).
- Даёт вибрацию, диалог подтверждения и хранилище, которые **работают и в браузере**.
- Превращает колбэки CloudStorage в промисы.

## Код по частям

```ts
const tg: WebApp | undefined = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

export const inTelegram = Boolean(tg?.initData)
export const supports = (version: string) => inTelegram && Boolean(tg?.isVersionAtLeast(version))
export const webApp = inTelegram ? tg! : null
```

- Скрипт `telegram-web-app.js` создаёт объект `Telegram.WebApp` **и в обычном браузере**. Признак
  «мы в Telegram» — непустой `initData` (его передаёт только Telegram).
- **`supports('6.9')`** — у пользователя может быть старый клиент. Метод, появившийся в версии
  6.9, у него `undefined`; вызов уронил бы приложение. Проверка в одном месте.
- `webApp` — либо настоящий объект, либо `null`. В остальном коде `if (webApp)` — понятное «мы в
  Telegram».
- `typeof window` — защита на случай выполнения вне браузера (тесты в Node).

```ts
export function telegramUser(): TelegramUser | null {
  return webApp?.initDataUnsafe.user ?? null
}
```

**Только для приветствия** («Привет, Анна»). `initDataUnsafe` — данные **без проверки**:
подделать их — одна строка в консоли. Для прав — проверка подписи на сервере (глава 05).

```ts
export function initTelegram() {
  if (!webApp) return
  webApp.ready()
  webApp.expand()
  if (supports('6.1')) {
    webApp.setHeaderColor('secondary_bg_color')
    webApp.setBackgroundColor('secondary_bg_color')
  }
}
```

- `ready()` — убрать заглушку загрузки Telegram.
- `expand()` — открыть на всю высоту, а не половиной экрана.
- Цвет шапки под цвет фона приложения — шапка Telegram и страница выглядят одним целым.

### Вибрация

```ts
export const haptic = {
  select: () => supports('6.1') && webApp!.HapticFeedback.selectionChanged(),
  tap: () => supports('6.1') && webApp!.HapticFeedback.impactOccurred('light'),
  success: () => supports('6.1') && webApp!.HapticFeedback.notificationOccurred('success'),
  warning: () => supports('6.1') && webApp!.HapticFeedback.notificationOccurred('warning'),
}
```

`условие && вызов` — в браузере и на старом клиенте просто ничего. Экран зовёт `haptic.success()` и
не думает, где он.

### Диалог

```ts
export function confirmDialog(message: string): Promise<boolean> {
  if (supports('6.2')) return new Promise((resolve) => webApp!.showConfirm(message, resolve))
  return Promise.resolve(window.confirm(message))
}
```

**Колбэк → промис.** `showConfirm(текст, колбэк)` вызывает колбэк с `true/false`. Обернув его в
`new Promise((resolve) => …)`, получаем `if (await confirmDialog('Отменить запись?'))` — как в
браузере, но нативное окно Telegram.

### Хранилище

```ts
export const storage = {
  get(key: string): Promise<string | null> {
    if (supports('6.9')) {
      return new Promise((resolve) =>
        webApp!.CloudStorage.getItem(key, (error, value) => resolve(error ? null : value || null)))
    }
    try {
      return Promise.resolve(localStorage.getItem(`myata:${key}`))
    } catch {
      return Promise.resolve(null)
    }
  },
  set(key, value) { … reject(new Error(error)) … },
}
```

- **CloudStorage** — хранилище Telegram для пары «пользователь + бот»: запись видна на любом его
  устройстве. Лимиты: ключ до 128 символов, значение до 4096, до 1024 ключей.
- Вне Telegram — `localStorage` с префиксом `myata:` (чтобы не пересечься с другими сайтами на
  том же адресе).
- Обе ветки возвращают **промис** — снаружи одинаковый интерфейс.
- `get` при ошибке — `null` (нет данных), `set` при ошибке — `reject`: потерять сохранение молча
  нельзя, вызывающий должен узнать.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `inTelegram = Boolean(window.Telegram)` | в браузере приложение считает, что оно в Telegram, и падает на кнопках |
| вызывать метод без `supports` | у пользователей со старым клиентом — белый экран |
| доверять `initDataUnsafe` для прав | любой подставит чужой `id` |
| `set` молча глотает ошибку | запись «создана», но после перезапуска её нет |

## Проверьте себя

1. Почему `get` при ошибке возвращает `null`, а `set` — бросает?
2. Где хранятся записи у человека, открывшего «Мяту» в Telegram с телефона, а потом с компьютера?

<details>
<summary>Ответы</summary>

1. Нет данных — нормальное состояние (первый запуск). Несохранённая запись — ошибка, о которой
   человек должен узнать.
2. В CloudStorage Telegram — одни и те же на обоих устройствах.
</details>
