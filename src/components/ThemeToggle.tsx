import { useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // 忽略
    }
    setDark(next)
  }
  return (
    <button
      onClick={toggle}
      className="rounded-full px-2 py-1 text-lg text-muted hover:bg-line/60"
      title={dark ? '切换到浅色' : '切换到深色'}
      aria-label="切换深浅色"
    >
      {dark ? '☀' : '☾'}
    </button>
  )
}
