import { DurableObject } from 'cloudflare:workers'
import { apply, join, newGame, seatOf, viewFor, type Action, type GameState, type Seat } from '../shared/game.ts'
import {
  CLOSE_FULL,
  CLOSE_NO_ROOM,
  MAX_VOICE_BASE64,
  type ClientMsg,
  type ServerMsg,
  type VoiceUpload,
} from '../shared/protocol.ts'

// 两人都进过的房间闲置 24 小时清理，只有一个人的房间 2 小时清理
const IDLE_MS = 24 * 60 * 60 * 1000
const IDLE_HALF_EMPTY_MS = 2 * 60 * 60 * 1000
// 每个连接 10 秒内最多 30 条消息、语音至少间隔 3 秒
const MSG_WINDOW_MS = 10_000
const MSG_PER_WINDOW = 30
const VOICE_GAP_MS = 3_000
const KEEP_VOICES = 40

interface Attachment {
  token: string
  seat: Seat
}

interface StoredVoice {
  mime: string
  data: string
}

export class GameRoom extends DurableObject<Env> {
  private state: GameState | null = null
  /** 限流计数只放内存：DO 休眠后清零，可以接受 */
  private rate = new WeakMap<WebSocket, { start: number; count: number; lastVoice: number }>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // 心跳由运行时直接回应，不唤醒休眠中的 DO
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'))
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<GameState>('state')) ?? null
    })
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    if (path.endsWith('/init') && req.method === 'POST') {
      if (this.state) return new Response('exists', { status: 409 })
      this.state = newGame()
      await this.save()
      return new Response('ok', { status: 201 })
    }

    const voice = path.match(/\/voice\/([\w-]{1,64})$/)
    if (voice) {
      const v = await this.ctx.storage.get<StoredVoice>(`voice:${voice[1]}`)
      if (!v) return new Response('语音已过期', { status: 404 })
      const bytes = Uint8Array.from(atob(v.data), (c) => c.charCodeAt(0))
      return new Response(bytes, {
        headers: { 'Content-Type': v.mime, 'Cache-Control': 'private, max-age=86400' },
      })
    }

    if (path.endsWith('/ws')) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('需要 WebSocket', { status: 426 })
      const token = url.searchParams.get('token') ?? ''
      const name = (url.searchParams.get('name') ?? '').trim().slice(0, 12) || '玩家'
      const [client, server] = Object.values(new WebSocketPair())

      if (!this.state || !/^[\w-]{8,64}$/.test(token)) {
        server.accept()
        server.close(CLOSE_NO_ROOM, 'room not found')
        return new Response(null, { status: 101, webSocket: client })
      }
      const seat = seatOf(this.state, token) ?? join(this.state, token, name, Math.random, Date.now())
      if (seat === null) {
        server.accept()
        server.close(CLOSE_FULL, 'room full')
        return new Response(null, { status: 101, webSocket: client })
      }
      // 同一玩家在别的标签页打开过：关掉旧连接
      for (const ws of this.ctx.getWebSockets(token)) ws.close(1000, 'replaced')
      this.ctx.acceptWebSocket(server, [token])
      server.serializeAttachment({ token, seat } satisfies Attachment)
      await this.save()
      this.broadcast()
      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('not found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (!this.state || typeof raw !== 'string') return
    const { seat } = ws.deserializeAttachment() as Attachment
    let msg: ClientMsg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    if (msg.t === 'ping') return send(ws, { t: 'pong' })

    const now = Date.now()
    const r = this.rate.get(ws) ?? { start: now, count: 0, lastVoice: 0 }
    this.rate.set(ws, r)
    if (now - r.start > MSG_WINDOW_MS) Object.assign(r, { start: now, count: 0 })
    if (++r.count > MSG_PER_WINDOW) return send(ws, { t: 'error', message: '操作太快了，歇一下' })

    let voice: (StoredVoice & { id: string }) | undefined
    let action = msg as Action
    if ((msg.t === 'ask' || msg.t === 'answer') && msg.voice) {
      const err = checkVoice(msg.voice)
      if (err) return send(ws, { t: 'error', message: err })
      if (now - r.lastVoice < VOICE_GAP_MS) return send(ws, { t: 'error', message: '语音发得太快了' })
      r.lastVoice = now
      voice = { id: crypto.randomUUID(), mime: msg.voice.mime, data: msg.voice.data }
      const { voice: _drop, ...rest } = msg
      action = { ...rest, voiceId: voice.id }
    }

    const err = apply(this.state, seat, action, Math.random, Date.now())
    if (err) return send(ws, { t: 'error', message: err })
    if (voice) await this.storeVoice(voice)
    await this.save()
    this.broadcast()
  }

  async webSocketClose(ws: WebSocket) {
    this.broadcast(ws)
  }

  async webSocketError(ws: WebSocket) {
    this.broadcast(ws)
  }

  async alarm() {
    const last = (await this.ctx.storage.get<number>('lastActive')) ?? 0
    const idle = this.state?.players.every(Boolean) ? IDLE_MS : IDLE_HALF_EMPTY_MS
    if (Date.now() - last < idle) {
      await this.ctx.storage.setAlarm(last + idle)
      return
    }
    for (const ws of this.ctx.getWebSockets()) ws.close(CLOSE_NO_ROOM, 'room expired')
    this.state = null
    await this.ctx.storage.deleteAll()
  }

  private async save() {
    const now = Date.now()
    await this.ctx.storage.put({ state: this.state, lastActive: now })
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(now + IDLE_HALF_EMPTY_MS)
  }

  private async storeVoice(v: StoredVoice & { id: string }) {
    const ids = (await this.ctx.storage.get<string[]>('voices')) ?? []
    ids.push(v.id)
    const drop = ids.splice(0, Math.max(0, ids.length - KEEP_VOICES))
    await this.ctx.storage.put({ [`voice:${v.id}`]: { mime: v.mime, data: v.data }, voices: ids })
    if (drop.length) await this.ctx.storage.delete(drop.map((id) => `voice:${id}`))
  }

  /** 给每个连接推送它自己的视图。closing 是正在断开、不算在线的连接。 */
  private broadcast(closing?: WebSocket) {
    if (!this.state) return
    const sockets = this.ctx.getWebSockets().filter((ws) => ws !== closing)
    const online = [false, false]
    for (const ws of sockets) online[(ws.deserializeAttachment() as Attachment).seat] = true
    for (const ws of sockets) {
      const { seat } = ws.deserializeAttachment() as Attachment
      send(ws, { t: 'state', view: viewFor(this.state, seat, online[seat === 0 ? 1 : 0]) })
    }
  }
}

function send(ws: WebSocket, msg: ServerMsg) {
  try {
    ws.send(JSON.stringify(msg))
  } catch {
    // 连接已断开，忽略
  }
}

function checkVoice(v: VoiceUpload): string | null {
  if (typeof v.mime !== 'string' || !/^audio\/[\w.+-]+(;[\w=.,\s-]*)?$/.test(v.mime)) return '语音格式不支持'
  if (typeof v.data !== 'string' || v.data.length > MAX_VOICE_BASE64) return '语音太长了'
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(v.data)) return '语音数据无效'
  return null
}
