import type { FaceTraits } from '../../shared/themes/faces.ts'
import type { ThemeItem } from '../../shared/themes/types.ts'
import { Avatar } from './Avatar.tsx'

interface Props {
  items: ThemeItem<FaceTraits>[]
  down: number[]
  guessMode?: boolean
  /** 只看不点（对手的面板） */
  readOnly?: boolean
  disabled?: boolean
  tone?: 'mine' | 'theirs'
  onTap?: (card: number) => void
}

/**
 * 3D 面板：底座向后倾斜，卡片立在底座上；倒下时向后平躺在底座上，变暗但仍能看到人物。
 * 尺寸都用容器宽度（cqw）表示，大小面板共用同一套比例。
 */
export function Board({ items, down, guessMode = false, readOnly = false, disabled = false, tone = 'mine', onTap }: Props) {
  const downSet = new Set(down)
  return (
    <div className={`board3d ${tone === 'theirs' ? 'theirs' : ''}`}>
      {/* cqw 只能相对父级容器计算，所以透视和边距放在里面这一层 */}
      <div className="board-stage">
      <div className="board-plane">
        {items.map((it, i) => {
          const isDown = downSet.has(i)
          const pickable = guessMode && !isDown
          return (
            <div key={i} className="slot">
              <button
                type="button"
                disabled={readOnly || disabled || (guessMode && isDown)}
                onClick={() => onTap?.(i)}
                className={`card3d ${isDown ? 'down' : ''} ${pickable ? 'pickable' : ''}`}
                aria-label={`${it.name}${isDown ? '（已倒下）' : ''}`}
                aria-pressed={isDown}
              >
                <div className="card-face">
                  <Avatar t={it.traits} className="block w-full" />
                  <div className="card-name">{it.name}</div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
