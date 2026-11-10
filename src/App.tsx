import { useEffect, useState } from 'react'
import { isRoomCode } from '../shared/protocol.ts'
import { Lobby } from './components/Lobby.tsx'
import { Room } from './components/Room.tsx'
import { savedName } from './lib/identity.ts'
import { navigate } from './lib/nav.ts'

function codeFromPath(): string | null {
  const m = location.pathname.match(/^\/r\/([^/]+)\/?$/)
  const code = m?.[1].toUpperCase() ?? ''
  return isRoomCode(code) ? code : null
}

export default function App() {
  const [code, setCode] = useState(codeFromPath)
  const [name, setName] = useState(savedName)

  useEffect(() => {
    const onPop = () => setCode(codeFromPath())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  if (code && name) return <Room code={code} name={name} onLeave={() => navigate('/')} />
  return <Lobby joinCode={code} name={name} onName={setName} />
}
