import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerView } from '../../shared/game.ts'
import { CLOSE_FULL, CLOSE_NO_ROOM, type ClientMsg, type ServerMsg } from '../../shared/protocol.ts'
import { playerToken } from './identity.ts'

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'noroom' | 'full' | 'replaced'

export function useRoom(code: string, name: string) {
  const [view, setView] = useState<PlayerView | null>(null)
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stopped = false
    let retry = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let ping: ReturnType<typeof setInterval> | undefined

    const connect = () => {
      clearTimeout(timer)
      if (stopped || (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN)) return
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const qs = new URLSearchParams({ token: playerToken(), name })
      const ws = new WebSocket(`${proto}//${location.host}/api/rooms/${code}/ws?${qs}`)
      wsRef.current = ws
      ws.onopen = () => {
        retry = 0
        setStatus('open')
        clearInterval(ping)
        ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"t":"ping"}'), 25_000)
      }
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data) as ServerMsg
        if (msg.t === 'state') setView(msg.view)
        else if (msg.t === 'error') setError(msg.message)
      }
      ws.onclose = (e) => {
        clearInterval(ping)
        if (wsRef.current === ws) wsRef.current = null
        if (stopped) return
        if (e.code === CLOSE_NO_ROOM) return setStatus('noroom')
        if (e.code === CLOSE_FULL) return setStatus('full')
        if (e.reason === 'replaced') return setStatus('replaced')
        setStatus('reconnecting')
        timer = setTimeout(connect, Math.min(10_000, 500 * 2 ** retry++))
      }
    }

    const onVisible = () => document.visibilityState === 'visible' && connect()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', connect)
    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', connect)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [code, name])

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    else setError('网络断开了，正在重连…')
  }, [])

  return { view, status, error, setError, send }
}
