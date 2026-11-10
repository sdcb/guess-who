import { useEffect, useRef } from 'react'
import type { LogEntry, Seat } from '../../shared/game.ts'
import { VoiceButton } from './VoiceButton.tsx'

interface Props {
  code: string
  entries: LogEntry[]
  seat: Seat
  names: [string, string]
  cardName: (i: number) => string
  /** 这些 id 的语音挂载时自动播放 */
  autoPlay: Set<number>
}

export function Log({ code, entries, seat, names, cardName, autoPlay }: Props) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [entries.length])

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm lg:max-h-[calc(100dvh-26rem)]">
      {entries.map((e) => {
        if (e.kind === 'system' || e.kind === 'refuse' || e.kind === 'guess') {
          return (
            <p key={e.id} className={`text-center text-xs ${e.kind === 'refuse' ? 'text-danger' : 'text-muted'}`}>
              {e.text}
              {e.kind === 'guess' && e.card !== undefined && `（指认：${cardName(e.card)}）`}
            </p>
          )
        }
        const mine = e.seat === seat
        return (
          <div key={e.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <span className="mb-0.5 text-[11px] text-muted">
              {names[e.seat ?? 0]} · {e.kind === 'question' ? '问' : '答'}
            </span>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${mine ? 'rounded-br-sm bg-accent text-white' : 'rounded-bl-sm bg-line/70'}`}
            >
              {e.text && <span className="break-words">{e.text}</span>}
              {e.voiceId && (
                <div className={e.text ? 'mt-1' : ''}>
                  <VoiceButton code={code} id={e.voiceId} autoPlay={autoPlay.has(e.id)} />
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div ref={end} />
    </div>
  )
}
