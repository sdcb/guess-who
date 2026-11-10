import { useEffect, useRef, useState } from 'react'
import { MAX_VOICE_SECONDS, type VoiceUpload } from '../../shared/protocol.ts'

export const canRecord = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext

function pickMime() {
  for (const m of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** 点一下开始录，再点一下发送；最长 MAX_VOICE_SECONDS 秒自动停止 */
export function useRecorder(onDone: (v: VoiceUpload) => void, onError: (msg: string) => void) {
  const [seconds, setSeconds] = useState<number | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const cancelled = useRef(false)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => () => {
    cancelled.current = true
    recRef.current?.stop()
  }, [])

  const start = async () => {
    if (recRef.current) return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onError('没有拿到麦克风权限')
      return
    }
    const mime = pickMime()
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32_000 } : undefined)
    const chunks: Blob[] = []
    const began = Date.now()
    const tick = setInterval(() => {
      const s = Math.floor((Date.now() - began) / 1000)
      setSeconds(s)
      if (s >= MAX_VOICE_SECONDS) rec.stop()
    }, 250)
    cancelled.current = false
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      clearInterval(tick)
      stream.getTracks().forEach((t) => t.stop())
      recRef.current = null
      setSeconds(null)
      if (cancelled.current || Date.now() - began < 400) return
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
      doneRef.current({ mime: blob.type.split(';')[0], data: await toBase64(blob) })
    }
    recRef.current = rec
    setSeconds(0)
    rec.start()
  }

  const stop = () => recRef.current?.stop()
  const cancel = () => {
    cancelled.current = true
    recRef.current?.stop()
  }

  return { recording: seconds !== null, seconds: seconds ?? 0, start, stop, cancel }
}
