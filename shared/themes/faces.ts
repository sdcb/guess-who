import type { Theme } from './types.ts'

export type Skin = 'light' | 'tan' | 'dark'
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'white'
export type HairStyle = 'short' | 'long' | 'curly' | 'bald'
export type Hat = 'none' | 'cap' | 'beanie' | 'fedora'
export type Beard = 'none' | 'beard' | 'mustache'
export type Shirt = 'red' | 'blue' | 'green' | 'yellow' | 'purple'

export interface FaceTraits {
  gender: 'm' | 'f'
  facing: 'left' | 'right'
  skin: Skin
  hair: HairColor
  style: HairStyle
  hat: Hat
  glasses: boolean
  beard: Beard
  teeth: boolean
  earrings: boolean
  freckles: boolean
  shirt: Shirt
}

type Row = [
  name: string,
  gender: FaceTraits['gender'],
  facing: 'L' | 'R',
  skin: Skin,
  hair: HairColor,
  style: HairStyle,
  hat: Hat,
  glasses: 0 | 1,
  beard: Beard,
  teeth: 0 | 1,
  earrings: 0 | 1,
  freckles: 0 | 1,
  shirt: Shirt,
]

// prettier-ignore
const rows: Row[] = [
  ['阿杰', 'm', 'R', 'light', 'black',  'short', 'none',   0, 'none',     1, 0, 0, 'blue'],
  ['小雨', 'f', 'L', 'light', 'brown',  'long',  'none',   1, 'none',     1, 1, 0, 'red'],
  ['老王', 'm', 'R', 'tan',   'white',  'bald',  'none',   1, 'mustache', 0, 0, 0, 'green'],
  ['美琪', 'f', 'R', 'light', 'blonde', 'long',  'none',   0, 'none',     1, 1, 1, 'purple'],
  ['大壮', 'm', 'L', 'dark',  'black',  'short', 'cap',    0, 'beard',    1, 0, 0, 'red'],
  ['晓晓', 'f', 'R', 'tan',   'black',  'curly', 'none',   0, 'none',     0, 1, 0, 'yellow'],
  ['志强', 'm', 'R', 'light', 'brown',  'short', 'beanie', 0, 'none',     0, 0, 1, 'green'],
  ['婷婷', 'f', 'L', 'light', 'red',    'long',  'none',   0, 'none',     1, 0, 1, 'blue'],
  ['浩然', 'm', 'L', 'tan',   'brown',  'curly', 'none',   1, 'none',     1, 0, 0, 'purple'],
  ['秀兰', 'f', 'R', 'light', 'white',  'short', 'none',   1, 'none',     0, 1, 0, 'green'],
  ['国栋', 'm', 'L', 'light', 'black',  'bald',  'none',   0, 'beard',    0, 0, 0, 'blue'],
  ['佳怡', 'f', 'L', 'dark',  'black',  'long',  'beanie', 0, 'none',     1, 1, 0, 'green'],
  ['子轩', 'm', 'R', 'light', 'blonde', 'short', 'none',   0, 'none',     1, 1, 1, 'red'],
  ['雅琴', 'f', 'R', 'tan',   'brown',  'long',  'fedora', 0, 'none',     0, 0, 0, 'red'],
  ['建华', 'm', 'L', 'tan',   'black',  'short', 'fedora', 1, 'mustache', 1, 0, 0, 'yellow'],
  ['欣然', 'f', 'L', 'light', 'blonde', 'curly', 'none',   1, 'none',     0, 0, 1, 'yellow'],
  ['一鸣', 'm', 'R', 'dark',  'black',  'curly', 'none',   0, 'mustache', 0, 1, 0, 'purple'],
  ['思琪', 'f', 'R', 'light', 'black',  'short', 'cap',    0, 'none',     1, 0, 0, 'green'],
  ['德福', 'm', 'L', 'light', 'white',  'short', 'cap',    1, 'beard',    1, 0, 0, 'red'],
  ['梦洁', 'f', 'L', 'tan',   'red',    'curly', 'none',   0, 'none',     1, 1, 0, 'purple'],
  ['天宇', 'm', 'R', 'light', 'red',    'short', 'none',   0, 'beard',    0, 0, 1, 'yellow'],
  ['文静', 'f', 'R', 'dark',  'brown',  'long',  'none',   1, 'none',     0, 0, 0, 'blue'],
  ['振东', 'm', 'L', 'tan',   'brown',  'short', 'beanie', 0, 'none',     1, 0, 0, 'blue'],
  ['丽娜', 'f', 'L', 'light', 'brown',  'short', 'none',   0, 'none',     0, 1, 1, 'yellow'],
  ['小龙', 'm', 'R', 'light', 'brown',  'long',  'none',   0, 'beard',    1, 1, 0, 'purple'],
]

const hairNames: Record<HairColor, string> = { black: '黑', brown: '棕', blonde: '金', red: '红', white: '白' }
const shirtNames: Record<Shirt, string> = { red: '红', blue: '蓝', green: '绿', yellow: '黄', purple: '紫' }

export const faces: Theme<FaceTraits> = {
  id: 'faces',
  name: '人物',
  items: rows.map(([name, gender, facing, skin, hair, style, hat, glasses, beard, teeth, earrings, freckles, shirt]) => ({
    name,
    traits: {
      gender,
      facing: facing === 'L' ? 'left' : 'right',
      skin,
      hair,
      style,
      hat,
      glasses: !!glasses,
      beard,
      teeth: !!teeth,
      earrings: !!earrings,
      freckles: !!freckles,
      shirt,
    },
  })),
  questions: [
    { id: 'female', text: '是女生吗？', test: (t) => t.gender === 'f' },
    { id: 'left', text: '脸朝左边吗？', test: (t) => t.facing === 'left' },
    { id: 'glasses', text: '戴眼镜吗？', test: (t) => t.glasses },
    { id: 'hat', text: '戴帽子吗？', test: (t) => t.hat !== 'none' },
    { id: 'teeth', text: '笑的时候露出牙齿吗？', test: (t) => t.teeth },
    { id: 'beard', text: '有胡子吗？', test: (t) => t.beard !== 'none' },
    { id: 'earrings', text: '戴耳环吗？', test: (t) => t.earrings },
    { id: 'freckles', text: '脸上有雀斑吗？', test: (t) => t.freckles },
    { id: 'bald', text: '是光头吗？', test: (t) => t.style === 'bald' },
    { id: 'long', text: '是长头发吗？', test: (t) => t.style === 'long' },
    { id: 'curly', text: '是卷发吗？', test: (t) => t.style === 'curly' },
    { id: 'dark', text: '肤色比较深吗？', test: (t) => t.skin === 'dark' },
    ...(Object.keys(hairNames) as HairColor[]).map((c) => ({
      id: `hair-${c}`,
      text: `头发是${hairNames[c]}色的吗？`,
      test: (t: FaceTraits) => t.hair === c,
    })),
    ...(Object.keys(shirtNames) as Shirt[]).map((c) => ({
      id: `shirt-${c}`,
      text: `衣服是${shirtNames[c]}色的吗？`,
      test: (t: FaceTraits) => t.shirt === c,
    })),
  ],
}
