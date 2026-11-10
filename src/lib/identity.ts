function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 隐私模式等情况下存不了，忽略
  }
}

let memToken: string | null = null

/** 每台设备一个随机身份，断线重连时用它找回座位 */
export function playerToken(): string {
  let t = read('gw-token') ?? memToken
  if (!t) {
    t = crypto.randomUUID()
    write('gw-token', t)
  }
  memToken = t
  return t
}

export const savedName = () => read('gw-name') ?? ''
export const saveName = (n: string) => write('gw-name', n.trim().slice(0, 12))
