import { useState } from 'react'
import { MAX_TEXT } from '../../shared/game.ts'
import type { VoiceUpload } from '../../shared/protocol.ts'
import { canRecord, useRecorder } from '../lib/voice.ts'

interface Props {
  placeholder: string
  /** 常用问题，点一下填进输入框 */
  chips?: { id: string; text: string }[]
  onSend: (text: string, extra: { quickId?: string; voice?: VoiceUpload }) => void
  onError: (msg: string) => void
}

export function Composer({ placeholder, chips, onSend, onError }: Props) {
  const [text, setText] = useState('')
  const [chip, setChip] = useState<{ id: string; text: string } | null>(null)
  const rec = useRecorder((voice) => onSend('', { voice }), onError)
  const mic = canRecord()

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend(t, { quickId: chip && chip.text === t ? chip.id : undefined })
    setText('')
    setChip(null)
  }

  return (
    <div className="space-y-2">
      {chips && (
        <div className="-mx-1 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto px-1 py-0.5">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setChip(c)
                setText(c.text)
              }}
              className={`rounded-full border px-2.5 py-1 text-[13px] ${chip?.id === c.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-ink/80'}`}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}
      {rec.recording ? (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-danger px-3 py-2.5 text-danger">
            <span className="size-2.5 animate-pulse rounded-full bg-danger" />
            正在录音 {rec.seconds}s
          </div>
          <button onClick={rec.cancel} className="rounded-lg border border-line px-3 py-2.5 text-muted">
            取消
          </button>
          <button onClick={rec.stop} className="rounded-lg bg-danger px-4 py-2.5 font-semibold text-white">
            发送
          </button>
        </div>
      ) : (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {mic && (
            <button
              type="button"
              onClick={rec.start}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-xl"
              title="录一段语音（最长 15 秒）"
              aria-label="录语音"
            >
              🎤
            </button>
          )}
          <input
            value={text}
            maxLength={MAX_TEXT}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            enterKeyHint="send"
            className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 text-base outline-none focus:border-accent"
          />
          <button
            disabled={!text.trim()}
            className="h-11 shrink-0 rounded-lg bg-accent px-4 font-semibold text-white disabled:opacity-40"
          >
            发送
          </button>
        </form>
      )}
    </div>
  )
}
