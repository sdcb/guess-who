import { describe, expect, it } from 'vitest'
import { apply, join, newGame, viewFor, type GameState, type Seat } from '../shared/game.ts'
import { faces } from '../shared/themes/faces.ts'
import { BOARD_SIZE } from '../shared/themes/index.ts'

// rng 序列：先决定先手（<0.5 → 座位 0），再给两人抽身份
const seq = (...xs: number[]) => {
  let i = 0
  return () => xs[i++ % xs.length]
}

function started(): GameState {
  const s = newGame()
  join(s, 'tok-aaaaaaaa', '甲', seq(0), 0)
  join(s, 'tok-bbbbbbbb', '乙', seq(0.1, 0.2, 0.4), 0)
  return s
}

const ok = (s: GameState, seat: Seat, a: Parameters<typeof apply>[2]) => expect(apply(s, seat, a, Math.random, 1)).toBeNull()

describe('faces theme', () => {
  it('has 25 distinct characters', () => {
    expect(faces.items).toHaveLength(BOARD_SIZE)
    expect(new Set(faces.items.map((i) => JSON.stringify(i.traits))).size).toBe(BOARD_SIZE)
    expect(new Set(faces.items.map((i) => i.name)).size).toBe(BOARD_SIZE)
  })
  it('every quick question splits the board', () => {
    for (const q of faces.questions) {
      const n = faces.items.filter((i) => q.test(i.traits)).length
      expect(n, q.id).toBeGreaterThan(0)
      expect(n, q.id).toBeLessThan(BOARD_SIZE)
    }
  })
})

describe('game', () => {
  it('starts when the second player joins', () => {
    const s = started()
    expect(s.phase).toBe('asking')
    expect(s.turn).toBe(0)
    expect(s.players[0]!.secret).toBe(Math.floor(0.2 * 25))
    expect(s.players[1]!.secret).toBe(Math.floor(0.4 * 25))
  })

  it('rejects a third player and recognises a returning one', () => {
    const s = started()
    expect(join(s, 'tok-cccccccc', '丙', Math.random, 0)).toBeNull()
    expect(join(s, 'tok-bbbbbbbb', '乙', Math.random, 0)).toBe(1)
  })

  it('runs a turn: ask → answer → flip → end turn', () => {
    const s = started()
    expect(apply(s, 1, { t: 'ask', text: '戴眼镜吗？' }, Math.random, 1)).not.toBeNull()
    ok(s, 0, { t: 'ask', text: '戴眼镜吗？', quickId: 'glasses' })
    expect(s.phase).toBe('answering')
    expect(apply(s, 0, { t: 'answer', text: '是' }, Math.random, 1)).not.toBeNull()
    ok(s, 1, { t: 'answer', text: '', quick: 'no' })
    expect(s.log.at(-1)!.text).toBe('不是')
    expect(s.phase).toBe('reviewing')
    ok(s, 0, { t: 'flip', cards: [1, 2, 2], down: true })
    expect(s.players[0]!.down).toEqual([1, 2])
    ok(s, 0, { t: 'flip', cards: [1], down: false })
    expect(s.players[0]!.down).toEqual([2])
    ok(s, 0, { t: 'endTurn' })
    expect(s.turn).toBe(1)
    expect(s.phase).toBe('asking')
  })

  it('refusal returns the turn to the asker and runs out after two', () => {
    const s = started()
    for (let i = 0; i < 2; i++) {
      ok(s, 0, { t: 'ask', text: `问题${i}` })
      ok(s, 1, { t: 'refuse' })
      expect(s.phase).toBe('asking')
      expect(s.turn).toBe(0)
    }
    ok(s, 0, { t: 'ask', text: '问题3' })
    expect(apply(s, 1, { t: 'refuse' }, Math.random, 1)).toBe('拒绝卡已经用完了')
  })

  it('correct guess wins, wrong guess loses', () => {
    const a = started()
    ok(a, 0, { t: 'guess', card: a.players[1]!.secret })
    expect(a.winner).toBe(0)

    const b = started()
    ok(b, 0, { t: 'guess', card: (b.players[1]!.secret + 1) % 25 })
    expect(b.winner).toBe(1)
    expect(b.phase).toBe('over')
  })

  it('cannot guess while waiting for an answer or on the opponent turn', () => {
    const s = started()
    expect(apply(s, 1, { t: 'guess', card: 0 }, Math.random, 1)).not.toBeNull()
    ok(s, 0, { t: 'ask', text: 'x' })
    expect(apply(s, 0, { t: 'guess', card: 0 }, Math.random, 1)).not.toBeNull()
  })

  it('rematch needs both players and resets the boards', () => {
    const s = started()
    ok(s, 0, { t: 'flip', cards: [3], down: true })
    ok(s, 0, { t: 'guess', card: 0 })
    ok(s, 0, { t: 'rematch' })
    expect(s.phase).toBe('over')
    ok(s, 1, { t: 'rematch' })
    expect(s.phase).toBe('asking')
    expect(s.game).toBe(2)
    expect(s.players[0]!.down).toEqual([])
    expect(s.players[1]!.refusals).toBe(2)
  })

  it('hides the opponent secret until the game is over', () => {
    const s = started()
    expect(viewFor(s, 0, true).opp!.secret).toBeUndefined()
    ok(s, 0, { t: 'guess', card: 0 })
    expect(viewFor(s, 0, true).opp!.secret).toBe(s.players[1]!.secret)
  })
})
