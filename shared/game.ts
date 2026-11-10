import { BOARD_SIZE, DEFAULT_THEME, type ThemeId } from './themes/index.ts'

export type Seat = 0 | 1
/** asking：提问方出题；answering：等对方回答；reviewing：提问方看回答、倒卡、结束回合 */
export type Phase = 'waiting' | 'asking' | 'answering' | 'reviewing' | 'over'
export type QuickAnswer = 'yes' | 'no' | 'unsure'

export const REFUSALS_PER_GAME = 2
export const MAX_TEXT = 200
const MAX_LOG = 300

export interface Player {
  token: string
  name: string
  secret: number
  refusals: number
  /** 自己面板上已倒下的卡片下标 */
  down: number[]
  rematch: boolean
}

export interface LogEntry {
  id: number
  seat: Seat | null
  kind: 'question' | 'answer' | 'refuse' | 'guess' | 'system'
  text: string
  quickId?: string
  quick?: QuickAnswer
  voiceId?: string
  card?: number
  /** 第几回合（每次轮换提问方 +1），用来只显示最近几回合 */
  round: number
  at: number
}

export interface GameState {
  themeId: ThemeId
  phase: Phase
  players: [Player | null, Player | null]
  turn: Seat
  /** 本局第几回合，从 1 开始 */
  round: number
  game: number
  winner: Seat | null
  log: LogEntry[]
  nextId: number
}

export type Action =
  | { t: 'ask'; text: string; quickId?: string; voiceId?: string }
  | { t: 'answer'; text: string; quick?: QuickAnswer; voiceId?: string }
  | { t: 'refuse' }
  | { t: 'flip'; cards: number[]; down: boolean }
  | { t: 'endTurn' }
  | { t: 'guess'; card: number }
  | { t: 'rematch' }

export type Rng = () => number

export function newGame(themeId: ThemeId = DEFAULT_THEME): GameState {
  return { themeId, phase: 'waiting', players: [null, null], turn: 0, round: 0, game: 0, winner: null, log: [], nextId: 1 }
}

const other = (s: Seat): Seat => (s === 0 ? 1 : 0)
const pick = (rng: Rng, n: number) => Math.min(n - 1, Math.floor(rng() * n))

function log(s: GameState, e: Omit<LogEntry, 'id' | 'at' | 'round'>, now: number) {
  s.log.push({ ...e, id: s.nextId++, round: s.round, at: now })
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG)
}

function start(s: GameState, rng: Rng, now: number) {
  s.game++
  s.phase = 'asking'
  s.winner = null
  s.round = 1
  s.turn = rng() < 0.5 ? 0 : 1
  for (const p of s.players) {
    if (!p) continue
    p.secret = pick(rng, BOARD_SIZE)
    p.refusals = REFUSALS_PER_GAME
    p.down = []
    p.rematch = false
  }
  log(s, { seat: null, kind: 'system', text: `第 ${s.game} 局开始，${s.players[s.turn]!.name} 先问` }, now)
}

/** 新玩家入座。返回座位号；房间满了返回 null。重连用 seatOf。 */
export function join(s: GameState, token: string, name: string, rng: Rng, now: number): Seat | null {
  const existing = seatOf(s, token)
  if (existing !== null) return existing
  const seat = s.players.findIndex((p) => p === null)
  if (seat < 0) return null
  s.players[seat] = { token, name, secret: 0, refusals: REFUSALS_PER_GAME, down: [], rematch: false }
  log(s, { seat: null, kind: 'system', text: `${name} 进入了房间` }, now)
  if (s.players[0] && s.players[1]) start(s, rng, now)
  return seat as Seat
}

export function seatOf(s: GameState, token: string): Seat | null {
  const i = s.players.findIndex((p) => p?.token === token)
  return i < 0 ? null : (i as Seat)
}

const cleanText = (t: unknown) => (typeof t === 'string' ? t.trim().slice(0, MAX_TEXT) : '')
const validCard = (c: unknown): c is number => Number.isInteger(c) && (c as number) >= 0 && (c as number) < BOARD_SIZE

/** 执行一步操作。成功时原地修改 s 并返回 null，否则返回错误提示（s 不变）。 */
export function apply(s: GameState, seat: Seat, a: Action, rng: Rng, now: number): string | null {
  const me = s.players[seat]
  const opp = s.players[other(seat)]
  if (!me) return '你不在这个房间里'
  const myTurn = s.turn === seat

  switch (a.t) {
    case 'ask': {
      if (s.phase !== 'asking' || !myTurn) return '现在不是你提问的时候'
      const text = cleanText(a.text)
      if (!text && !a.voiceId) return '问题不能为空'
      s.phase = 'answering'
      log(s, { seat, kind: 'question', text, quickId: a.quickId, voiceId: a.voiceId }, now)
      return null
    }
    case 'answer': {
      if (s.phase !== 'answering' || myTurn) return '现在不是你回答的时候'
      const quick = a.quick && ['yes', 'no', 'unsure'].includes(a.quick) ? a.quick : undefined
      const text = cleanText(a.text) || (quick ? quickLabel[quick] : '')
      if (!text && !a.voiceId) return '回答不能为空'
      s.phase = 'reviewing'
      log(s, { seat, kind: 'answer', text, quick, voiceId: a.voiceId }, now)
      return null
    }
    case 'refuse': {
      if (s.phase !== 'answering' || myTurn) return '现在不能拒绝'
      if (me.refusals <= 0) return '拒绝卡已经用完了'
      me.refusals--
      log(s, { seat, kind: 'refuse', text: `${me.name} 用了一张拒绝卡（还剩 ${me.refusals} 张），这回合结束` }, now)
      nextTurn(s)
      return null
    }
    case 'flip': {
      if (s.phase === 'waiting' || s.phase === 'over') return '现在不能翻卡'
      if (!Array.isArray(a.cards) || !a.cards.every(validCard)) return '卡片无效'
      const down = new Set(me.down)
      for (const c of a.cards) {
        if (a.down) down.add(c)
        else down.delete(c)
      }
      me.down = [...down].sort((x, y) => x - y)
      return null
    }
    case 'endTurn': {
      if (s.phase !== 'reviewing' || !myTurn) return '现在不能结束回合'
      nextTurn(s)
      return null
    }
    case 'guess': {
      if (!myTurn || (s.phase !== 'asking' && s.phase !== 'reviewing')) return '只能在自己的回合指认'
      if (!validCard(a.card)) return '卡片无效'
      if (!opp) return '对手不在'
      const right = opp.secret === a.card
      s.phase = 'over'
      s.winner = right ? seat : other(seat)
      log(s, { seat, kind: 'guess', card: a.card, text: right ? `${me.name} 猜对了！` : `${me.name} 猜错了，${opp.name} 获胜` }, now)
      return null
    }
    case 'rematch': {
      if (s.phase !== 'over') return '对局还没结束'
      me.rematch = true
      if (opp?.rematch) start(s, rng, now)
      return null
    }
  }
  return '未知操作'
}

function nextTurn(s: GameState) {
  s.turn = other(s.turn)
  s.phase = 'asking'
  s.round++
}

export const quickLabel: Record<QuickAnswer, string> = { yes: '是', no: '不是', unsure: '不确定' }

/** 发给某位玩家的视图：不含对手身份（结束后才公开）和对手 token。 */
export interface PlayerView {
  themeId: ThemeId
  phase: Phase
  seat: Seat
  turn: Seat
  round: number
  game: number
  winner: Seat | null
  me: { name: string; secret: number; refusals: number; down: number[]; rematch: boolean }
  opp: { name: string; refusals: number; upCount: number; down: number[]; rematch: boolean; online: boolean; secret?: number } | null
  log: LogEntry[]
}

export function viewFor(s: GameState, seat: Seat, oppOnline: boolean): PlayerView {
  const me = s.players[seat]!
  const opp = s.players[other(seat)]
  return {
    themeId: s.themeId,
    phase: s.phase,
    seat,
    turn: s.turn,
    round: s.round ?? 0,
    game: s.game,
    winner: s.winner,
    me: { name: me.name, secret: me.secret, refusals: me.refusals, down: me.down, rematch: me.rematch },
    opp: opp && {
      name: opp.name,
      refusals: opp.refusals,
      upCount: BOARD_SIZE - opp.down.length,
      down: opp.down,
      rematch: opp.rematch,
      online: oppOnline,
      secret: s.phase === 'over' ? opp.secret : undefined,
    },
    log: s.log,
  }
}
