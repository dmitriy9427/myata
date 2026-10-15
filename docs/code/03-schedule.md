# 3. Расписание

[src/lib/schedule.ts](../../src/lib/schedule.ts). Глава — [04. Расписание](../04-schedule.md). Тесты — `schedule.test.ts`.

## Где на экране

Экран выбора времени: полоса дней, кнопки времени по группам «Утро / День / Вечер», недоступное
время — серое. «Любой мастер» показывает время, свободное хоть у кого-то.

## Что делает

- Хранит время как **минуты от полуночи** (10:30 → 630).
- Генерирует «занятость других клиентов» — одинаковую при каждом открытии.
- Считает свободные начала для услуги нужной длительности.
- Не даёт записаться на сегодня меньше чем за час.
- Для «любого мастера» выбирает самого высокого по рейтингу из свободных.

## Код по частям

### Интервалы

```ts
export type Interval = { from: number; to: number }      // [from, to) в минутах

export const overlaps = (a: Interval, b: Interval) => a.from < b.to && b.from < a.to
```

Полуоткрытый отрезок `[from, to)`: 11:00–12:30 и 12:30–13:30 **не** пересекаются — одна запись
кончается, следующая начинается в ту же минуту. Условие пересечения — одна строка: «каждый
начинается раньше, чем кончается другой».

### Детерминированная занятость

```ts
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export function busyIntervals(masterId: string, date: string): Interval[] {
  const rnd = seeded(hash(`${masterId}:${date}`))
  const count = 3 + Math.floor(rnd() * 3)
  for (let i = 0; i < count; i++) {
    const from = STUDIO.open + Math.floor(rnd() * slots) * STEP
    const length = (2 + Math.floor(rnd() * 3)) * STEP
    result.push({ from, to: Math.min(STUDIO.close, from + length) })
  }
  return result
}
```

- `hash` (FNV-1a) превращает строку `«anna:2026-10-15»` в число — **зерно**.
- `seeded(зерно)` — генератор: при одном зерне — одна последовательность.
- Итог: у мастера Анны на 15 октября всегда одни и те же 3–5 занятых отрезков по 1–2 часа. Вышли и
  вернулись — картина та же. С `Math.random()` выбранное время «внезапно занималось».
- В настоящем проекте занятость приходит с сервера; функция заменяется запросом.

### Свободные начала

```ts
export function freeStarts(master, date, duration, now, taken = []) {
  if (!worksOn(master, date)) return new Set<number>()
  const busy = [...busyIntervals(master.id, date), ...taken]
  const earliest = date === toDateValue(now) ? minutesNow(now) + LEAD_MINUTES : -1
  const result = new Set<number>()
  for (let t = STUDIO.open; t + duration <= STUDIO.close; t += STEP) {
    const want = { from: t, to: t + duration }
    if (t >= earliest && !busy.some((b) => overlaps(b, want))) result.add(t)
  }
  return result
}
```

- Выходной у мастера — пусто.
- Занято — чужими записями **и своими** (`taken`): записаться к одному мастеру дважды на одно
  время нельзя.
- `t + duration <= close` — услуга на 2 часа не начнётся за час до закрытия.
- Сегодня — не раньше «сейчас + час». `now` — **параметр**: тест «сейчас 14:20» без подмены часов.
- `Set` — проверка «свободно ли 15:30» за одно обращение.

### «Любой мастер»

```ts
export function daySlots(service, masterId, date, now, takenBy = () => []) {
  const masters = MASTERS
    .filter((m) => m.categories.includes(service.category) && (!masterId || m.id === masterId))
    .sort((a, b) => b.rating - a.rating)
  const free = masters.map((m) => ({ id: m.id, starts: freeStarts(m, date, service.duration, now, takenBy(m.id)) }))
  for (let t = STUDIO.open; t + service.duration <= STUDIO.close; t += STEP) {
    const who = free.find((f) => f.starts.has(t))
    slots.push({ time: t, free: Boolean(who), masterId: who?.id ?? null })
  }
  return slots
}
```

- `masterId = null` — любой мастер, умеющий эту услугу.
- Мастера отсортированы по рейтингу — `find` возьмёт **лучшего** из свободных в это время.
- В слоте запоминается, **кто** свободен: запись создаётся с конкретным мастером.

### Группы

```ts
export function partOfDay(minutes: number) {
  if (minutes < 12 * 60) return 'Утро'
  if (minutes < 17 * 60) return 'День'
  return 'Вечер'
}
```

Тридцать кнопок времени подряд читать тяжело; три подписанные группы — легко.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `<=` в `overlaps` | нельзя записаться сразу после окончания чужой записи |
| `Math.random()` в занятости | выбранное время «занято» после возврата на экран |
| без `taken` | можно записаться к мастеру дважды на одно время |
| `new Date()` внутри | тесты падают в зависимости от времени запуска |

## Проверьте себя

1. Студия до 20:00, услуга 90 минут, шаг 30. Последнее возможное начало?
2. Зачем `hash`, если можно взять зерно `Date.now()`?

<details>
<summary>Ответы</summary>

1. 18:30 (`18:30 + 90 = 20:00 ≤ 20:00`).
2. `Date.now()` разное при каждом открытии — занятость перестала бы быть одинаковой. Нужен
   хеш **от мастера и даты**.
</details>
