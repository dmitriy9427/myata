# 05. Безопасность: initData и подпись

Самая важная глава для настоящего проекта на Mini Apps.

## Две версии одних данных

| Поле | Что это |
| --- | --- |
| `WebApp.initData` | Строка вида `query_id=…&user=%7B…%7D&auth_date=…&hash=…` — **подписана** Telegram |
| `WebApp.initDataUnsafe` | То же, но разобранное в объект — **без проверки** |

`initDataUnsafe.user.id` очень хочется использовать как «ID пользователя». Но
это просто данные в браузере. Любой может открыть сайт, подложить
`window.Telegram.WebApp.initDataUnsafe = { user: { id: 12345 } }` и
«представиться» кем угодно. Слово **Unsafe** в названии — не шутка.

В «Мяте» имя из `initDataUnsafe` используется **только для приветствия** («Анна
из Telegram») — подделка ничего не даёт.

## Как правильно: проверка на сервере

Если у приложения есть бэкенд (записи в общей базе, оплата, личные данные),
схема такая:

```
Mini App ──(initData целиком, сырой строкой)──▶ ваш сервер
                                                 │ проверяет подпись токеном бота
                                                 │ проверяет auth_date (не старее, скажем, суток)
                                                 ▼
                                    доверяет user.id из ЭТОЙ строки
```

Алгоритм проверки ([документация](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)):

1. Разобрать `initData` как query-строку, вынуть `hash`.
2. Остальные пары отсортировать по ключу и склеить через `\n`:
   `auth_date=…\nquery_id=…\nuser=…` — это `data_check_string`.
3. `secret_key = HMAC_SHA256(key = "WebAppData", message = <токен бота>)`.
4. `HMAC_SHA256(key = secret_key, message = data_check_string)` в hex должен
   совпасть с `hash`.

На Node.js:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyInitData(initData: string, botToken: string, maxAgeSec = 86400) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex')
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null

  const authDate = Number(params.get('auth_date'))
  if (Date.now() / 1000 - authDate > maxAgeSec) return null   // старая строка — могли украсть

  return JSON.parse(params.get('user') ?? 'null')
}
```

Почему `timingSafeEqual`, а не `===`: обычное сравнение строк останавливается
на первом несовпавшем символе, и по времени ответа теоретически можно
подбирать подпись побайтно.

## Токен бота — секрет

Токен из @BotFather (`123456:ABC-…`) даёт полный контроль над ботом. Он живёт
**только на сервере** (переменная окружения), никогда — в коде фронтенда, в
репозитории, в `VITE_*`-переменных. Всё, что собирает Vite, попадает в
браузер и читается кем угодно.

Если токен утёк — `/revoke` в @BotFather.

## Почему у «Мяты» нет бэкенда

Это учебный проект: записи хранятся в CloudStorage **самого пользователя**.
Подделать можно только свои же данные — вреда никому. Но у этого есть
следствия, которые важно понимать:

- студия **не видит** записи — для настоящего бизнеса нужен сервер;
- занятость мастеров сгенерирована, а не общая для всех клиентов;
- двое пользователей могут «записаться» на одно окно.

Что добавить для настоящего продукта:

1. Бэкенд (Node + база или Supabase с Edge Function), который проверяет
   `initData` по алгоритму выше.
2. Таблица записей с уникальностью «мастер + время» — двойная запись
   невозможна на уровне базы.
3. Бот присылает напоминание за день — через Bot API `sendMessage` с сервера.
4. Оплата — Telegram Payments или Telegram Stars.

## Ошибки

> **Доверять `initDataUnsafe.user.id` для прав.** Подделать — одна строка в консоли. Права —
> только после проверки подписи `initData` на сервере.
>
> **Токен бота во фронтенде.** Его увидит любой, кто откроет DevTools, и получит управление ботом.
>
> **Проверять подпись без срока годности.** Перехваченная строка `initData` годится вечно.
> Проверяйте `auth_date`.

## Попробуйте сами

1. Какие два шага нужны серверу, чтобы доверять пользователю Mini App?

<details>
<summary>Ответы</summary>

1. Проверить подпись `initData` (HMAC с ключом, выведенным из токена бота) и свежесть `auth_date`.
   Только после этого брать `user.id`.
</details>
