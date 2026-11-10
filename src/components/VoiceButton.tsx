import { useEffect, useRef, useState } from 'react'

/** 播放房间里的一条语音。autoPlay 用于对方刚发来的新语音（浏览器可能拦截，失败就算了）。 */
export function VoiceButton({ code, id, autoPlay = false }: { code: string; id: string; autoPlay?: boolean }) {
  const [state, setState] = useState<'idle' | 'playing' | 'error'>('idle')
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = `/api/rooms/${code}/voice/${id}`

  useEffect(() => {
    if (!autoPlay) return
    const a = start(url)
    return () => a.pause()
    // start 只依赖 setState 和 ref，挂载时自动播放一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, url])

  function start(src: string) {
    audio.current?.pause()
    const a = new Audio(src)
    audio.current = a
    a.onended = () => setState('idle')
    a.onerror = () => setState('error')
    a.play().then(
      () => setState('playing'),
      () => setState('idle'),
    )
    return a
  }

  const stop = () => {
    audio.current?.pause()
    setState('idle')
  }

  if (state === 'error') return <span className="text-xs text-muted">语音已过期</span>
  return (
    <button
      onClick={() => (state === 'playing' ? stop() : start(url))}
      className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent"
    >
      {state === 'playing' ? '■ 停止' : '▶ 语音'}
    </button>
  )
}
