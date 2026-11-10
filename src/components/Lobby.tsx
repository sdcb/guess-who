import { useState } from 'react'
import { REFUSALS_PER_GAME } from '../../shared/game.ts'
import { CODE_LENGTH, isRoomCode } from '../../shared/protocol.ts'
import { faces } from '../../shared/themes/faces.ts'
import { saveName } from '../lib/identity.ts'
import { navigate } from '../lib/nav.ts'
import { Avatar } from './Avatar.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

interface Props {
  /** 从邀请链接进来时的房号 */
  joinCode: string | null
  name: string
  onName: (n: string) => void
}

export function Lobby({ joinCode, name, onName }: Props) {
  const [draft, setDraft] = useState(name)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const commitName = () => {
    const n = draft.trim().slice(0, 12)
    if (!n) {
      setError('先起个名字吧')
      return null
    }
    saveName(n)
    onName(n)
    return n
  }

  const create = async () => {
    if (!commitName()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      const body = (await res.json()) as { code?: string; error?: string }
      if (!res.ok || !body.code) throw new Error(body.error ?? '创建房间失败')
      navigate(`/r/${body.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建房间失败')
    } finally {
      setBusy(false)
    }
  }

  const join = () => {
    const c = (joinCode ?? code).trim().toUpperCase()
    if (!isRoomCode(c)) return setError(`房号是 ${CODE_LENGTH} 位字母数字`)
    if (!commitName()) return
    navigate(`/r/${c}`)
  }

  const preview = [faces.items[1], faces.items[4], faces.items[18], faces.items[3], faces.items[16]]

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {preview.map((it) => (
          <div key={it.name} className="w-14 overflow-hidden rounded-lg bg-face shadow-sm ring-1 ring-black/5">
            <Avatar t={it.traits} />
          </div>
        ))}
      </div>
      <h1 className="mt-5 text-center text-3xl font-bold tracking-wide">猜猜我是谁</h1>
      <p className="mt-2 text-center text-sm text-muted">两人联机，各用一台设备</p>

      <form
        className="mt-8 space-y-4 rounded-2xl bg-panel p-5 shadow-sm ring-1 ring-line"
        onSubmit={(e) => {
          e.preventDefault()
          if (joinCode) join()
          else create()
        }}
      >
        <label className="block">
          <span className="text-sm text-muted">你的名字</span>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2.5 text-base outline-none focus:border-accent"
            value={draft}
            maxLength={12}
            placeholder="比如：小明"
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>

        {joinCode ? (
          <button className="w-full rounded-lg bg-accent py-3 font-semibold text-white active:bg-accent-2">
            加入房间 {joinCode}
          </button>
        ) : (
          <>
            <button
              disabled={busy}
              className="w-full rounded-lg bg-accent py-3 font-semibold text-white active:bg-accent-2 disabled:opacity-60"
            >
              {busy ? '创建中…' : '创建房间'}
            </button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <div className="h-px flex-1 bg-line" />
              或者输入朋友的房号
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 py-2.5 font-mono text-base tracking-[0.3em] uppercase outline-none focus:border-accent"
                value={code}
                maxLength={CODE_LENGTH}
                placeholder="ABC234"
                autoCapitalize="characters"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={join}
                className="rounded-lg border border-accent px-5 font-semibold text-accent active:bg-accent/10"
              >
                加入
              </button>
            </div>
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <section className="mt-8 space-y-2 text-sm leading-relaxed text-muted">
        <h2 className="font-semibold text-ink">怎么玩</h2>
        <p>1. 开局后系统给你们各抽一张身份牌，只有自己能看到。</p>
        <p>2. 轮流提问，打字、语音或者点常用问题都行，比如“戴眼镜吗？”。</p>
        <p>3. 对方回答后，把不符合的卡片点倒，然后结束回合。</p>
        <p>4. 不想回答可以用拒绝卡（每人 {REFUSALS_PER_GAME} 张），提问方换个问题再问。</p>
        <p>5. 在自己回合随时可以指认：猜对就赢，猜错直接输。</p>
      </section>
    </main>
  )
}
