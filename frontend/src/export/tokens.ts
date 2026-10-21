import i18n from '../i18n'
import type { Status } from '../types'

export const CARD_WIDTH_PX = 560

export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export const COLOR = {
  ink: '#1d1d1f',
  muted: '#6e6e73',
  rule: '#d2d2d7',
  surface: '#ffffff',
} as const

export const STATUS_COLOR = {
  on_track: '#1d7a4b',
  at_risk: '#8a6400',
  blocked: '#a3252b',
} as const

// the status tag on the card: tinted fill with dark text (all above 4.5:1)
export const STATUS_TAG = {
  on_track: { bg: '#dcefe4', fg: '#176b3f' },
  at_risk: { bg: '#f7ecd0', fg: '#7a5800' },
  blocked: { bg: '#f8dfe0', fg: '#8f1f25' },
} as const

export const statusLabel = (status: Status) => i18n.t(`status.${status}`)
