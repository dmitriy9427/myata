// История переходов MemoryRouter, которую можно «начать заново».
//
// После записи пользователь не должен попадать кнопкой «Назад» обратно в форму
// (мастер → время → подтверждение). Поэтому вместо обычного перехода роутер
// пересоздаётся с историей [главная, экран успеха] — смена key у MemoryRouter.

import { create } from 'zustand'

export const useNav = create<{ key: number; entries: string[] }>(() => ({ key: 0, entries: ['/'] }))

/** Начать историю заново: главная и `path` поверх неё. */
export const restartAt = (path: string) =>
  useNav.setState((s) => ({ key: s.key + 1, entries: path === '/' ? ['/'] : ['/', path] }))
