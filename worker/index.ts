import { CODE_ALPHABET, CODE_LENGTH, isRoomCode } from '../shared/protocol.ts'

export { GameRoom } from './room.ts'

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** 只接受本站页面发起的请求（浏览器总会带 Origin），挡掉别的网站直接嵌用 */
function sameOrigin(req: Request, url: URL) {
  const origin = req.headers.get('Origin')
  return !origin || new URL(origin).host === url.host
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url)
    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
    if (!sameOrigin(req, url)) return json({ error: 'forbidden' }, 403)

    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      if (!(await env.CREATE_LIMIT.limit({ key: ip })).success) return json({ error: '建房太频繁了，请稍后再试' }, 429)
      for (let i = 0; i < 5; i++) {
        const code = randomCode()
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code))
        const res = await stub.fetch(`https://room/${code}/init`, { method: 'POST' })
        if (res.status === 201) return json({ code }, 201)
      }
      return json({ error: '创建房间失败，请重试' }, 503)
    }

    const m = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/(ws|voice\/[\w-]+)$/)
    if (m && req.method === 'GET' && isRoomCode(m[1])) {
      if (!(await env.API_LIMIT.limit({ key: ip })).success) return json({ error: '请求太频繁了' }, 429)
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req)
    }

    return json({ error: 'not found' }, 404)
  },
} satisfies ExportedHandler<Env>
