import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../lib/api'
import { createGroupChat } from '../lib/chats'
import { errorNotice, secondaryButton } from '../styles'

export function GroupChatButton({ rideId }: { rideId: string }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function openChat() {
    setBusy(true)
    setError('')
    try {
      const chat = await createGroupChat(rideId)
      navigate(`/messages/${encodeURIComponent(chat.id)}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach the server. Please try again.")
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={openChat} disabled={busy} className={`${secondaryButton} w-full disabled:opacity-60`}>
        {busy ? 'Opening chat…' : 'Open ride group chat'}
      </button>
      {error && <p role="alert" className={`${errorNotice} mt-3`}>{error}</p>}
    </div>
  )
}
