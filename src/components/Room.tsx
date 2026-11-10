import { useEffect, useState, type ReactNode } from 'react'
import { quickLabel, type LogEntry, type PlayerView } from '../../shared/game.ts'
import type { ClientMsg } from '../../shared/protocol.ts'
import { themes } from '../../shared/themes/index.ts'
import { useRoom } from '../lib/socket.ts'
import { Avatar } from './Avatar.tsx'
import { Board } from './Board.tsx'
import { Composer } from './Composer.tsx'
import { Log } from './Log.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'
import { VoiceButton } from './VoiceButton.tsx'

interface Props {
  code: string
  name: string
  onLeave: () => void
}

export function Room({ code, name, onLeave }: Props) {
  const { view, status, error: toast, setError: setToast, send } = useRoom(code, name)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast, setToast])

  const fatal: Partial<Record<typeof status, string>> = {
    noroom: '房间不存在或已过期（24 小时无人使用会自动关闭）',
    full: '这个房间已经有两位玩家了',
    replaced: '你在另一个页面打开了这个房间',
  }

  let body: ReactNode
  if (fatal[status]) {
    body = (
      <Centered>
        <p>{fatal[status]}</p>
        <div className="flex gap-2">
          {status === 'replaced' && (
            <button onClick={() => location.reload()} className="rounded-lg border border-line px-4 py-2">
              在这里继续
            </button>
          )}
          <button onClick={onLeave} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">
            回到首页
          </button>
        </div>
      </Centered>
    )
  } else if (!view) {
    body = <Centered>连接中…</Centered>
  } else if (view.phase === 'waiting' || !view.opp) {
    body = <Waiting code={code} />
  } else {
    body = <Game code={code} view={view} send={send} toast={setToast} />
  }

  return (
    <div className="mx-auto max-w-6xl px-3 pb-8 sm:px-4">
      <header className="flex items-center gap-2 py-2.5">
        <button onClick={onLeave} className="rounded-lg px-2 py-1 text-muted hover:bg-line/60" aria-label="返回首页">
          ←
        </button>
        <span className="font-semibold">猜猜我是谁</span>
        <span className="rounded-md bg-line/70 px-2 py-0.5 font-mono text-sm tracking-widest">{code}</span>
        {status === 'reconnecting' && <span className="text-xs text-danger">重连中…</span>}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      {body}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
          <div className="rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center text-muted">{children}</div>
}

function Waiting({ code }: { code: string }) {
  const url = `${location.origin}/r/${code}`
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('复制这个链接发给朋友', url)
    }
  }
  return (
    <Centered>
      <p className="text-ink">等朋友加入…</p>
      <p className="font-mono text-4xl font-bold tracking-[0.3em] text-ink">{code}</p>
      <p className="text-sm">让朋友在首页输入房号，或者直接打开链接：</p>
      <p className="max-w-full rounded-lg bg-panel px-3 py-2 font-mono text-sm break-all ring-1 ring-line">{url}</p>
      <div className="flex gap-2">
        <button onClick={copy} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">
          {copied ? '已复制' : '复制链接'}
        </button>
        {'share' in navigator && (
          <button
            onClick={() => navigator.share({ title: '来玩猜猜我是谁', url }).catch(() => {})}
            className="rounded-lg border border-line px-4 py-2"
          >
            分享
          </button>
        )}
      </div>
    </Centered>
  )
}

interface GameProps {
  code: string
  view: PlayerView
  send: (m: ClientMsg) => void
  toast: (m: string) => void
}

function Game({ code, view, send, toast }: GameProps) {
  const theme = themes[view.themeId]
  const opp = view.opp!
  const myTurn = view.turn === view.seat
  const [guessWanted, setGuessMode] = useState(false)
  const [confirmCard, setConfirmCard] = useState<number | null>(null)
  const [peek, setPeek] = useState(true)
  // 进房时已有的记录不自动播放，之后对方新发的语音自动播放
  const [firstLogId] = useState(() => view.log.at(-1)?.id ?? 0)
  const autoPlay = new Set(view.log.filter((e) => e.id > firstLogId && e.voiceId && e.seat !== view.seat).map((e) => e.id))

  const canGuess = myTurn && (view.phase === 'asking' || view.phase === 'reviewing')
  const guessMode = guessWanted && canGuess

  const upCards = theme.items.map((_, i) => i).filter((i) => !view.me.down.includes(i))
  const names: [string, string] = view.seat === 0 ? [view.me.name, opp.name] : [opp.name, view.me.name]
  const { question, answer } = lastExchange(view)
  const quickQ = question?.quickId ? theme.questions.find((q) => q.id === question.quickId) : undefined
  const autoFlip =
    myTurn && view.phase === 'reviewing' && quickQ && answer?.quick && answer.quick !== 'unsure'
      ? upCards.filter((i) => quickQ.test(theme.items[i].traits) !== (answer.quick === 'yes'))
      : []

  const tapCard = (i: number) => {
    if (guessMode) setConfirmCard(i)
    else send({ t: 'flip', cards: [i], down: !view.me.down.includes(i) })
  }

  const secret = theme.items[view.me.secret]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-3">
        <div className="flex items-stretch gap-2 text-sm">
          <PlayerChip
            label="我"
            name={view.me.name}
            refusals={view.me.refusals}
            up={upCards.length}
            active={myTurn}
            online
          />
          <PlayerChip
            label="对手"
            name={opp.name}
            refusals={opp.refusals}
            up={opp.upCount}
            active={!myTurn}
            online={opp.online}
          />
          <button
            onClick={() => setPeek(!peek)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-panel px-2 ring-1 ring-line"
            title="我的身份（对方看不到）"
          >
            {peek ? (
              <>
                <div className="w-9 overflow-hidden rounded-md bg-face">
                  <Avatar t={secret.traits} />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[11px] text-muted">我的身份</div>
                  <div className="font-semibold">{secret.name}</div>
                </div>
              </>
            ) : (
              <span className="px-1 text-muted">显示身份</span>
            )}
          </button>
        </div>

        {guessMode && (
          <div className="flex items-center justify-between rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            点一张你认为是对方身份的卡。猜错直接输！
            <button onClick={() => setGuessMode(false)} className="font-semibold underline">
              取消
            </button>
          </div>
        )}

        <Board
          items={theme.items}
          down={view.me.down}
          guessMode={guessMode}
          disabled={view.phase === 'over'}
          onTap={tapCard}
        />
        <p className="text-center text-xs text-muted">点卡片可以倒下 / 立起，只有你自己能看到</p>
      </section>

      <aside className="space-y-3">
        <div className="rounded-2xl bg-panel p-4 shadow-sm ring-1 ring-line">
          <ActionPanel
            code={code}
            view={view}
            send={send}
            toast={toast}
            question={question}
            answer={answer}
            autoFlip={autoFlip}
            upCards={upCards}
            cardName={(i) => theme.items[i].name}
            questions={theme.questions}
            canGuess={canGuess}
            onGuessMode={() => setGuessMode(true)}
            onGuessCard={(i) => setConfirmCard(i)}
          />
        </div>
        <div className="rounded-2xl bg-panel p-4 shadow-sm ring-1 ring-line">
          <h3 className="mb-2 text-sm font-semibold text-muted">问答记录</h3>
          <Log
            code={code}
            entries={view.log}
            seat={view.seat}
            names={names}
            cardName={(i) => theme.items[i]?.name ?? '?'}
            autoPlay={autoPlay}
          />
        </div>
      </aside>

      {confirmCard !== null && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" onClick={() => setConfirmCard(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-panel p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-28 overflow-hidden rounded-xl bg-face">
              <Avatar t={theme.items[confirmCard].traits} />
            </div>
            <p className="mt-3 text-lg font-semibold">对方是「{theme.items[confirmCard].name}」？</p>
            <p className="mt-1 text-sm text-muted">猜对获胜，猜错直接输</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmCard(null)} className="flex-1 rounded-lg border border-line py-2.5">
                再想想
              </button>
              <button
                onClick={() => {
                  send({ t: 'guess', card: confirmCard })
                  setConfirmCard(null)
                  setGuessMode(false)
                }}
                className="flex-1 rounded-lg bg-danger py-2.5 font-semibold text-white"
              >
                就是他/她
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerChip(p: { label: string; name: string; refusals: number; up: number; active: boolean; online: boolean }) {
  return (
    <div
      className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 ring-1 ${p.active ? 'bg-accent/10 ring-accent' : 'bg-panel ring-line'}`}
    >
      <div className="flex items-center gap-1 text-[11px] text-muted">
        <span className={`size-1.5 rounded-full ${p.online ? 'bg-green-500' : 'bg-gray-400'}`} />
        {p.label}
        {p.active && <span className="text-accent">· 提问中</span>}
      </div>
      <div className="truncate font-semibold">{p.name}</div>
      <div className="text-[11px] text-muted">
        剩 {p.up} 张 · 拒绝卡 {'●'.repeat(p.refusals)}
        {'○'.repeat(Math.max(0, 2 - p.refusals))}
      </div>
    </div>
  )
}

interface ActionProps {
  code: string
  view: PlayerView
  send: (m: ClientMsg) => void
  toast: (m: string) => void
  question?: LogEntry
  answer?: LogEntry
  autoFlip: number[]
  upCards: number[]
  cardName: (i: number) => string
  questions: { id: string; text: string }[]
  canGuess: boolean
  onGuessMode: () => void
  onGuessCard: (i: number) => void
}

function ActionPanel(p: ActionProps) {
  const { view, send, code } = p
  const opp = view.opp!
  const myTurn = view.turn === view.seat

  if (view.phase === 'over') {
    const won = view.winner === view.seat
    const theirs = opp.secret !== undefined ? p.cardName(opp.secret) : '?'
    return (
      <div className="space-y-3 text-center">
        <p className={`text-2xl font-bold ${won ? 'text-accent' : 'text-danger'}`}>{won ? '你赢了！🎉' : '你输了'}</p>
        <p className="text-sm text-muted">
          对方的身份是「{theirs}」，你的身份是「{p.cardName(view.me.secret)}」
        </p>
        {view.me.rematch ? (
          <p className="text-sm text-muted">已准备，等 {opp.name} 点再来一局…</p>
        ) : (
          <button
            onClick={() => send({ t: 'rematch' })}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-white"
          >
            再来一局{opp.rematch && '（对方已准备）'}
          </button>
        )}
      </div>
    )
  }

  const guessBar = p.canGuess && (
    <div className="mt-3 border-t border-line pt-3">
      {p.upCards.length === 1 ? (
        <button
          onClick={() => p.onGuessCard(p.upCards[0])}
          className="w-full rounded-lg bg-danger py-2.5 font-semibold text-white"
        >
          只剩「{p.cardName(p.upCards[0])}」了，去指认
        </button>
      ) : (
        <button onClick={p.onGuessMode} className="w-full rounded-lg border border-danger py-2 text-danger">
          我知道是谁了，指认
        </button>
      )}
    </div>
  )

  if (myTurn && view.phase === 'asking') {
    return (
      <div>
        <h3 className="mb-2 font-semibold">轮到你提问</h3>
        <Composer
          placeholder="问一个特征…"
          chips={p.questions}
          onError={p.toast}
          onSend={(text, extra) => send({ t: 'ask', text, ...extra })}
        />
        {guessBar}
      </div>
    )
  }

  if (myTurn && view.phase === 'answering') {
    return (
      <div className="space-y-2">
        <Bubble label="你问" entry={p.question} code={code} />
        <p className="animate-pulse text-sm text-muted">等 {opp.name} 回答…</p>
      </div>
    )
  }

  if (myTurn && view.phase === 'reviewing') {
    return (
      <div className="space-y-3">
        <Bubble label="你问" entry={p.question} code={code} />
        <Bubble label={`${opp.name} 答`} entry={p.answer} code={code} strong />
        <p className="text-sm text-muted">把不符合的卡片点倒，然后结束回合。</p>
        {p.autoFlip.length > 0 && (
          <button
            onClick={() => send({ t: 'flip', cards: p.autoFlip, down: true })}
            className="w-full rounded-lg border border-accent py-2 text-accent"
          >
            按这个回答倒下 {p.autoFlip.length} 张
          </button>
        )}
        <button onClick={() => send({ t: 'endTurn' })} className="w-full rounded-lg bg-accent py-3 font-semibold text-white">
          结束回合
        </button>
        {guessBar}
      </div>
    )
  }

  if (view.phase === 'answering') {
    return (
      <div className="space-y-3">
        <Bubble label={`${opp.name} 问`} entry={p.question} code={code} strong />
        <div className="grid grid-cols-3 gap-2">
          {(['yes', 'no', 'unsure'] as const).map((q) => (
            <button
              key={q}
              onClick={() => send({ t: 'answer', text: '', quick: q })}
              className={`rounded-lg py-3 font-semibold ${q === 'yes' ? 'bg-accent text-white' : q === 'no' ? 'bg-ink text-paper' : 'border border-line'}`}
            >
              {quickLabel[q]}
            </button>
          ))}
        </div>
        <Composer
          placeholder="或者打字 / 录音回答…"
          onError={p.toast}
          onSend={(text, extra) => send({ t: 'answer', text, voice: extra.voice })}
        />
        <button
          disabled={view.me.refusals <= 0}
          onClick={() => send({ t: 'refuse' })}
          className="w-full rounded-lg border border-danger py-2 text-danger disabled:border-line disabled:text-muted"
        >
          {view.me.refusals > 0 ? `拒绝回答（还剩 ${view.me.refusals} 张拒绝卡）` : '拒绝卡用完了'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {view.phase === 'reviewing' && <Bubble label="你答" entry={p.answer} code={code} />}
      <p className="animate-pulse text-sm text-muted">
        {view.phase === 'asking' ? `等 ${opp.name} 提问…` : `${opp.name} 正在翻牌…`}
      </p>
      <p className="text-xs text-muted">趁现在整理一下自己的卡片吧。</p>
    </div>
  )
}

function Bubble({ label, entry, code, strong }: { label: string; entry?: LogEntry; code: string; strong?: boolean }) {
  if (!entry) return null
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 ${strong ? 'text-xl font-semibold' : ''}`}>
        {entry.text}
        {entry.voiceId && (
          <span className={entry.text ? 'ml-2' : ''}>
            <VoiceButton code={code} id={entry.voiceId} />
          </span>
        )}
      </div>
    </div>
  )
}

/** 当前回合最近一次的问题和它的回答 */
function lastExchange(view: PlayerView): { question?: LogEntry; answer?: LogEntry } {
  for (let i = view.log.length - 1; i >= 0; i--) {
    const e = view.log[i]
    if (e.kind === 'refuse' || e.kind === 'system') return {}
    if (e.kind === 'question') {
      const next = view.log[i + 1]
      return { question: e, answer: next?.kind === 'answer' ? next : undefined }
    }
  }
  return {}
}

