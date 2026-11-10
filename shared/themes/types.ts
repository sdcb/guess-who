export interface ThemeItem<T> {
  name: string
  traits: T
}

/** 常用问题。test 用来给提问方提示“按回答该倒下哪些卡”，不参与判定。 */
export interface QuickQuestion<T> {
  id: string
  text: string
  test: (traits: T) => boolean
}

export interface Theme<T> {
  id: string
  /** 卡片上的东西叫什么，例如“人物” */
  name: string
  items: ThemeItem<T>[]
  questions: QuickQuestion<T>[]
}
