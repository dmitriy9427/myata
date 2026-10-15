# 2. Кнопки Telegram из React

[src/telegram/hooks.ts](../../src/telegram/hooks.ts), [FallbackButtons.tsx](../../src/telegram/FallbackButtons.tsx).
Глава — [03. Нативный интерфейс](../03-native-ui.md).

## Где на экране

**MainButton** — большая кнопка внизу экрана Telegram: «Выбрать время», «Записаться · 2 500 ₽» со
спиннером при сохранении. **BackButton** — стрелка «‹» в шапке Telegram на всех экранах, кроме
главного. В браузере — такие же кнопки, нарисованные страницей.

## Главная сложность

Эти кнопки **не элементы страницы**. Ими управляют через API: `show()`, `setText()`,
`onClick(fn)`, `offClick(fn)`. А React живёт компонентами. Нужно связать: «пока экран на
экране — кнопка такая; ушли — убрать».

## Как пользоваться

```tsx
function Confirm() {
  const [saving, setSaving] = useState(false)
  useMainButton({ text: `Записаться · ${formatPrice(service.price)}`, loading: saving, onClick: submit })
  …
}
```

Экран декларирует **какой должна быть** кнопка, хук делает остальное. `null` — кнопки нет.

## Код по частям

### Свежий колбэк без переподписки

```ts
export function useMainButton(options) {
  const handler = useRef(options?.onClick)
  useEffect(() => {
    handler.current = options?.onClick
  })
```

`onClick` — новая функция на каждый рендер (стрелка в компоненте). Если подписываться на неё
напрямую, пришлось бы на **каждый** рендер `offClick(старая)` + `onClick(новая)`. Кладём свежую в
`ref`, а подписываемся **один раз** на обёртку, которая зовёт `handler.current`.

### Эффект: показать, подписаться, убрать

```ts
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
      if (enabled) button.enable(); else button.disable()
      if (loading) button.showProgress(); else button.hideProgress()
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
```

- Зависимости — **примитивы** (`text`, `enabled`, `loading`), а не объект `options`: объект новый
  каждый рендер.
- **Уборка обязательна.** Ушли с экрана — `offClick` и `hide`. Без `offClick` кнопка следующего
  экрана выполняла бы **и** его действие, **и** старое.
- `offClick(onClick)` снимает **ту же** функцию, что повесили — поэтому `onClick` в переменной
  внутри эффекта.
- Вне Telegram — состояние кнопки в маленьком сторе Zustand, а `<FallbackMainButton>` его
  рисует. Экран об этом не знает.

### Замена в браузере

```tsx
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
```

Та же кнопка: текст, выключенное состояние, спиннер. Стор — потому что хук вызывается в **экране**,
а кнопка рисуется в **каркасе** приложения — им нужно общее место.

### Кнопка «назад»

```ts
export function useBackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const show = pathname !== '/'
  useEffect(() => {
    const back = () => navigate(-1)
    if (webApp) {
      if (!show) { webApp.BackButton.hide(); return }
      webApp.BackButton.show()
      webApp.BackButton.onClick(back)
      return () => webApp!.BackButton.offClick(back)
    }
    useFallbackButtons.setState({ back: show })
  }, [show, navigate])
}
```

Вызывается **один раз** в каркасе (`Shell`): на главной стрелки нет, на остальных — есть и ведёт
назад по истории роутера.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| без `offClick` в уборке | на следующем экране кнопка выполняет два действия |
| `options` в зависимостях эффекта | на каждый рендер — мигание кнопки (hide/show) |
| `onClick` напрямую без `ref` | кнопка зовёт устаревшее замыкание со старыми данными формы |
| без замены в браузере | демо в портфолио без главной кнопки — записаться нельзя |

## Проверьте себя

1. Почему эффект зависит от `loading`?
2. Экран «Выбор времени» ещё без выбранного времени. Как сделать кнопку видимой, но неактивной?

<details>
<summary>Ответы</summary>

1. Сохранение началось — нужно показать спиннер (`showProgress`); закончилось — убрать.
2. `useMainButton({ text: 'Выбрать время', enabled: Boolean(time), onClick: next })`.
</details>
