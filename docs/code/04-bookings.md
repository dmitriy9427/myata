# 4. Записи и подтверждение

[src/store/bookings.ts](../../src/store/bookings.ts), [src/lib/bookings.ts](../../src/lib/bookings.ts),
[src/screens/Confirm.tsx](../../src/screens/Confirm.tsx), [src/store/nav.ts](../../src/store/nav.ts).

## Где на экране

«Проверьте запись»: услуга, мастер, дата и время, комментарий, кнопка «Записаться · 2 500 ₽». После —
экран «Готово», а в «Моих записях» — предстоящие и прошедшие.

## Что делает

- Хранит записи в CloudStorage (или `localStorage`) одной строкой.
- **Сначала сохраняет, потом показывает.**
- Проверяет всё прочитанное из хранилища.
- Не держит больше 20 записей — лимит CloudStorage 4096 символов.
- Пока запись не подтверждена, Telegram спрашивает «Закрыть?» при смахивании.
- После записи начинает историю заново: «назад» с экрана «Готово» ведёт на главную.

## Код по частям

### Стор: сначала записать

```ts
add: async (draft) => {
  const booking: Booking = { ...draft, id: crypto.randomUUID().slice(0, 8), createdAt: Date.now() }
  const list = [...get().list, booking]
  await persist(list)
  set({ list })
  return booking.id
},
```

**Порядок важен.** Если сначала показать запись (`set`), а хранилище откажет, человек увидит
«Готово», а после перезапуска записи не будет. Поэтому: сохранили → только потом в интерфейс.
Ошибка `persist` долетит до экрана подтверждения, и он покажет «Не удалось сохранить».

### Проверка прочитанного

```ts
export function parseBookings(raw: string | null): Booking[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter((b): b is Booking =>
      typeof b?.id === 'string' &&
      Boolean(serviceById(b.serviceId)) &&
      Boolean(masterById(b.masterId)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
      Number.isInteger(b.time) &&
      typeof b.comment === 'string')
  } catch {
    return []
  }
}
```

В хранилище может быть что угодно: запись старой версии, удалённая услуга, мастер, который
уволился. Битое — пропускаем, остальное показываем. `(b): b is Booking` — **предикат типа**: после
`filter` TypeScript знает, что это `Booking[]`.

```ts
export const MAX_STORED = 20
```

CloudStorage хранит значение до 4096 символов. Одна запись — порядка 150 символов; 20 записей
помещаются с запасом. Лишние (самые старые прошедшие) отбрасываются при сохранении.

### Экран подтверждения

```tsx
useEffect(() => {
  webApp?.enableClosingConfirmation()
  return () => webApp?.disableClosingConfirmation()
}, [])
```

Человек заполнил форму и случайно смахнул приложение вниз — Telegram спросит «Закрыть?». Ушли с
экрана — защита снята.

```tsx
async function submit() {
  if (!service || !master || !draft.date || draft.time === null) return
  setSaving(true)
  setError('')
  try {
    const id = await add({ serviceId: service.id, masterId: master.id, date: draft.date, time: draft.time, comment: draft.comment.trim() })
    haptic.success()
    restartAt(`/done/${id}`)
  } catch {
    haptic.warning()
    setError('Не удалось сохранить запись. Попробуйте ещё раз.')
  } finally {
    setSaving(false)
  }
}

useMainButton(service ? { text: `Записаться · ${formatPrice(service.price)}`, loading: saving, onClick: submit } : null)
```

- `saving` → спиннер на MainButton, повторное нажатие не создаст вторую запись.
- `draft.time === null`, а не `!draft.time` — время 0 (полночь) ложно, но это время; здесь
  студия с 10:00, но проверка честная.
- **Черновик не очищается здесь.** Экран перерисовался бы с пустым черновиком и увёл на главную
  (`<Navigate>`) раньше, чем сработает переход к «Готово». Его очищает экран успеха.

### История с нуля

```ts
export const useNav = create<{ key: number; entries: string[] }>(() => ({ key: 0, entries: ['/'] }))

export const restartAt = (path: string) =>
  useNav.setState((s) => ({ key: s.key + 1, entries: path === '/' ? ['/'] : ['/', path] }))
```

```tsx
<MemoryRouter key={key} initialEntries={entries} initialIndex={entries.length - 1}>
```

После записи «назад» не должен вести обратно в форму (мастер → время → подтверждение) — запись уже
создана. Новый `key` у `MemoryRouter` — React пересоздаёт роутер с историей `[главная, готово]`.

**Почему MemoryRouter**, а не обычный: Telegram передаёт параметры запуска в hash адреса
(`#tgWebAppData=…`) — HashRouter принял бы их за маршрут. Да и ссылки на внутренние экраны Mini App
не нужны: её открывают из бота.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `set` до `persist` | при отказе хранилища — «Готово» без записи |
| без `parseBookings` | старая запись с удалённой услугой роняет «Мои записи» |
| без лимита 20 | однажды сохранение молча перестанет работать (больше 4096 символов) |
| `navigate('/done')` вместо `restartAt` | «назад» возвращает в форму уже созданной записи |

## Проверьте себя

1. Почему у записи короткий id (`slice(0, 8)`)?
2. Человек дважды быстро нажал «Записаться». Сколько записей создастся?

<details>
<summary>Ответы</summary>

1. Каждый символ на счету: все записи — одна строка до 4096 символов. 8 символов UUID для двадцати
   записей одного человека достаточно, чтобы не совпасть.
2. Одна: после первого нажатия `loading` — кнопка показывает спиннер и неактивна (`showProgress` в
   Telegram, `disabled` в браузере).
</details>
