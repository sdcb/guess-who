import type { FaceTraits, HairColor, Shirt, Skin } from '../../shared/themes/faces.ts'

const skinColor: Record<Skin, string> = { light: '#f6d3b3', tan: '#d9a273', dark: '#8d5a3b' }
const skinShade: Record<Skin, string> = { light: '#d9a98a', tan: '#b07a4f', dark: '#6a3f27' }
const hairColor: Record<HairColor, string> = {
  black: '#2b2622',
  brown: '#7a4a26',
  blonde: '#e8c15a',
  red: '#c4522c',
  white: '#e9e6df',
}
const shirtColor: Record<Shirt, string> = {
  red: '#e05252',
  blue: '#3f7fd8',
  green: '#3fa36b',
  yellow: '#e8b631',
  purple: '#8b5cc8',
}

// 卷发：沿头顶排一圈小圆
const curls = Array.from({ length: 9 }, (_, i) => {
  const a = Math.PI * (1.05 + (i / 8) * 0.9)
  return { x: 50 + Math.cos(a) * 25, y: 46 + Math.sin(a) * 25 }
})

/** 程序化绘制的原创头像。默认朝右画，朝左时整体镜像。 */
export function Avatar({ t, className }: { t: FaceTraits; className?: string }) {
  const skin = skinColor[t.skin]
  const shade = skinShade[t.skin]
  const hair = hairColor[t.hair]
  const outline = '#3b2a22'
  const female = t.gender === 'f'
  const lip = '#d9465a'

  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      <g transform={t.facing === 'left' ? 'translate(100 0) scale(-1 1)' : undefined}>
        {/* 衣服和脖子 */}
        <path d="M12 110 C12 88 30 80 50 80 C70 80 88 88 88 110 Z" fill={shirtColor[t.shirt]} />
        {female ? (
          <>
            <path d="M39 80 Q50 96 61 80 Z" fill={shade} />
            <path d="M42 81 Q50 92 58 81" fill="none" stroke="#f2c230" strokeWidth="1.2" />
            <circle cx="50" cy="90" r="1.8" fill="#f2c230" />
          </>
        ) : (
          <>
            <path d="M40 80 L50 91 L44 95 L37 84 Z" fill="rgba(255,255,255,.8)" />
            <path d="M60 80 L50 91 L56 95 L63 84 Z" fill="rgba(255,255,255,.8)" />
          </>
        )}
        <rect x="42" y="66" width="16" height="16" rx="4" fill={shade} />

        {/* 长发在脑后的部分 */}
        {t.style === 'long' && <path d="M24 46 C22 20 78 20 76 46 L80 92 C68 97 32 97 20 92 Z" fill={hair} />}

        {/* 耳朵、耳环 */}
        <circle cx="26" cy="52" r="5.5" fill={skin} />
        {/* 朝右时右耳转到脑后，只露左耳 */}
        {t.earrings && <circle cx="26" cy="60.5" r="2.8" fill="#f2c230" stroke="#b8901c" strokeWidth=".8" />}

        {/* 头 */}
        {female ? (
          <path d="M27 48 C27 22 73 22 73 48 C73 64 62 77 50 77 C38 77 27 64 27 48 Z" fill={skin} />
        ) : (
          <path d="M26 47 C26 21 74 21 74 47 L73 62 C72 72 62 77 50 77 C38 77 28 72 27 62 Z" fill={skin} />
        )}

        {/* 胡子 */}
        {t.beard === 'beard' && (
          <path d="M26 52 C26 84 74 84 74 52 C71 64 64 70 50 70 C36 70 29 64 26 52 Z" fill={hair} />
        )}
        {t.beard !== 'none' && (
          <path transform="translate(4 0)" d="M43 62.5 Q48 58 53.5 61 Q59 58 64 62.5 Q59 65 53.5 63.5 Q48 65 43 62.5 Z" fill={hair} />
        )}

        {/* 头发 */}
        {t.style === 'short' && (
          <path d="M26 46 C24 18 76 18 74 46 C72 38 66 32 56 33 C46 34 38 32 30 38 C28 41 27 43 26 46 Z" fill={hair} />
        )}
        {t.style === 'long' && (
          <path d="M26 50 C24 18 76 18 74 50 C70 36 62 30 52 32 C42 34 34 36 30 44 L29 70 C25 64 25 56 26 50 Z" fill={hair} />
        )}
        {t.style === 'curly' && curls.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="7.5" fill={hair} />)}
        {t.style === 'bald' && (
          <>
            <ellipse cx="27.5" cy="45" rx="3.5" ry="7" fill={hair} />
            <ellipse cx="72.5" cy="45" rx="3.5" ry="7" fill={hair} />
            <path d="M40 30 Q46 27 52 29" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}

        {female && t.hat === 'none' && (
          <g>
            <path d="M33 27 L23 20 L24 35 Z" fill="#ff4f8b" />
            <path d="M33 27 L43 19 L42 34 Z" fill="#ff4f8b" />
            <circle cx="33" cy="27" r="3" fill="#d6336c" />
          </g>
        )}

        {/* 帽子 */}
        {t.hat === 'cap' && (
          <>
            <path d="M25 40 C25 14 75 14 75 40 Z" fill="#e0703a" />
            <path d="M58 37 Q86 34 94 41 Q76 44 58 42 Z" fill="#c25a28" />
            <circle cx="50" cy="18" r="2.5" fill="#c25a28" />
          </>
        )}
        {t.hat === 'beanie' && (
          <>
            <path d="M25 41 C25 12 75 12 75 41 Z" fill="#4a6fb5" />
            <rect x="23" y="35" width="54" height="9" rx="4" fill="#3a5a96" />
            <circle cx="50" cy="13" r="5" fill="#e9e6df" />
          </>
        )}
        {t.hat === 'fedora' && (
          <>
            <ellipse cx="50" cy="36" rx="35" ry="5.5" fill="#5e4a38" />
            <path d="M32 36 L35 17 Q50 11 65 17 L68 36 Z" fill="#6f5842" />
            <rect x="33" y="29" width="34" height="5" fill="#2f2620" />
          </>
        )}

        {/* 五官整体往朝向那边偏 */}
        <g transform="translate(4 0)">
        {/* 腮红（女生） */}
        {t.gender === 'f' && (
          <>
            <ellipse cx="38" cy="59" rx="5" ry="3" fill="#ff6b81" opacity=".55" />
            <ellipse cx="66" cy="59" rx="5" ry="3" fill="#ff6b81" opacity=".55" />
          </>
        )}

        {/* 雀斑 */}
        {t.freckles &&
          [
            [36, 57],
            [39, 59.5],
            [35, 61],
            [64, 57],
            [67, 59.5],
            [68, 56],
          ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" fill="#a0602f" opacity=".75" />)}

        {/* 眉毛、眼睛 */}
        {female ? (
          <>
            <path d="M39 41 Q43 38 47 40.5" fill="none" stroke={outline} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M56 40.5 Q60 38 64 41" fill="none" stroke={outline} strokeWidth="1.3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M38.5 42 L47.5 41" fill="none" stroke={outline} strokeWidth="3.2" strokeLinecap="round" />
            <path d="M55.5 41 L64.5 42" fill="none" stroke={outline} strokeWidth="3.2" strokeLinecap="round" />
          </>
        )}
        <circle cx="44" cy="49" r="2.7" fill={outline} />
        <circle cx="61" cy="49" r="2.7" fill={outline} />
        <circle cx="45" cy="48" r=".9" fill="#fff" />
        <circle cx="62" cy="48" r=".9" fill="#fff" />
        {t.gender === 'f' && (
          <>
            <g stroke={outline} strokeWidth="1.3" strokeLinecap="round">
              <path d="M41.6 47.2 L38.8 45.6" />
              <path d="M42.4 46.3 L40.6 44" />
              <path d="M43.6 46 L42.8 43.4" />
              <path d="M63.4 47.2 L66.2 45.6" />
              <path d="M62.6 46.3 L64.4 44" />
              <path d="M61.4 46 L62.2 43.4" />
            </g>
          </>
        )}

        {/* 眼镜 */}
        {t.glasses && (
          <g fill="rgba(255,255,255,.15)" stroke="#2a2a2a" strokeWidth="1.8">
            <circle cx="44" cy="49" r="6.5" />
            <circle cx="61" cy="49" r="6.5" />
            <path d="M50.5 48.5 Q52.5 47 54.5 48.5" fill="none" />
            <path d="M37.5 48 L27 46" fill="none" />
          </g>
        )}

        {/* 鼻子（朝右） */}
        <path d="M54 50 Q59.5 56 54 58" fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round" />

        {/* 嘴 */}
        {t.teeth ? (
          <g>
            <path d="M44 64 Q53.5 75 63 64 Z" fill="#7a2e2a" stroke={female ? lip : 'none'} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M44.5 64 L62.5 64 L61.5 66.5 Q53.5 68 45.5 66.5 Z" fill="#fff" />
          </g>
        ) : female ? (
          <path d="M46 64.5 Q50 63 53.5 64.5 Q57 63 61 64.5 Q53.5 72 46 64.5 Z" fill={lip} />
        ) : (
          <path d="M45.5 65 Q53.5 70.5 61.5 65" fill="none" stroke="#7a2e2a" strokeWidth="2" strokeLinecap="round" />
        )}
        </g>
      </g>
    </svg>
  )
}
