import type { FaceTraits } from '../../shared/themes/faces.ts'
import type { ThemeItem } from '../../shared/themes/types.ts'
import { Avatar } from './Avatar.tsx'

interface Props {
  items: ThemeItem<FaceTraits>[]
  down: number[]
  guessMode: boolean
  disabled: boolean
  onTap: (card: number) => void
}

export function Board({ items, down, guessMode, disabled, onTap }: Props) {
  const downSet = new Set(down)
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
      {items.map((it, i) => {
        const isDown = downSet.has(i)
        return (
          <button
            key={i}
            disabled={disabled || (guessMode && isDown)}
            onClick={() => onTap(i)}
            className={`flip text-left ${isDown ? 'down' : ''} ${guessMode && !isDown ? 'animate-pulse' : ''}`}
            aria-label={`${it.name}${isDown ? '（已倒下）' : ''}`}
            aria-pressed={isDown}
          >
            <div className="flip-inner">
              <div
                className={`flip-face overflow-hidden rounded-lg bg-face shadow-sm ring-1 ring-black/10 ${guessMode && !isDown ? 'ring-2 ring-danger' : ''}`}
              >
                <Avatar t={it.traits} className="block w-full" />
                <div className="bg-accent-2 py-0.5 text-center text-[11px] leading-4 font-medium text-white sm:text-sm sm:leading-6">
                  {it.name}
                </div>
              </div>
              <div className="flip-back rounded-lg ring-1 ring-black/10" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
