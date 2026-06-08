const NAMED_COLOR_HEX: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  rose:   '#f43f5e',
  teal:   '#14b8a6',
  indigo: '#6366f1',
  amber:  '#f59e0b',
}

export const DEFAULT_DIVISION_COLOR = '#3b82f6'

export function getHexColor(color: string | null | undefined): string {
  if (!color) return DEFAULT_DIVISION_COLOR
  if (color.startsWith('#')) return color
  return NAMED_COLOR_HEX[color] ?? DEFAULT_DIVISION_COLOR
}
