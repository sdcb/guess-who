import { faces } from './faces.ts'

export const BOARD_SIZE = 25

export const themes = { faces } as const
export type ThemeId = keyof typeof themes
export const DEFAULT_THEME: ThemeId = 'faces'

export function isThemeId(id: string): id is ThemeId {
  return Object.hasOwn(themes, id)
}
