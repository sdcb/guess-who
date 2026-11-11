// 只为可安装 + 加速二次打开；联机依赖网络，不做离线游戏。改动本文件时递增 VERSION。
const VERSION = 'v1'
const CACHE = `guess-who-${VERSION}`

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return

  // 页面：网络优先，断网时回退到缓存的外壳（SPA，所有路由同一个 index.html）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put('/', copy))
          }
          return res
        })
        .catch(() => caches.match('/').then((r) => r ?? Response.error())),
    )
    return
  }

  // 带 hash 的构建产物：缓存优先；其余静态文件：先用缓存，同时后台更新
  const immutable = url.pathname.startsWith('/assets/')
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req)
      if (hit && immutable) return hit
      const update = fetch(req).then((res) => {
        if (res.ok) c.put(req, res.clone())
        return res
      })
      if (hit) {
        e.waitUntil(update.catch(() => {}))
        return hit
      }
      return update
    }),
  )
})
