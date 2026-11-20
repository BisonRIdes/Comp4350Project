import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { DashboardNavbar } from '../components/DashboardNavbar'
import { ApiError } from '../lib/api'
import { getUser } from '../lib/auth'
import { createPersonalChat, fetchChats, fetchMessages, sendMessage, type Chat, type ChatMessage } from '../lib/chats'
import { errorNotice, headingClass, inputClass, primaryButton } from '../styles'

const refreshInterval = 15_000

function messageError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'You no longer have access to this chat.'
    if (error.status === 404) return 'This chat no longer exists.'
    return error.message
  }
  return "Couldn't reach the server. Please try again."
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const messages = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) messages.set(message.id, message)
  const microseconds = (timestamp: string) => Number((timestamp.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0').slice(3, 6))
  return [...messages.values()].sort((a, b) =>
    Date.parse(a.created_at) - Date.parse(b.created_at)
    || microseconds(a.created_at) - microseconds(b.created_at)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

function ChatPanel({ chat, userId }: { chat: Chat; userId: string }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const [openingRider, setOpeningRider] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let inFlight = false
    let initialized = false
    let knownIds = new Set<string>()

    async function refresh() {
      if (inFlight) return
      inFlight = true
      try {
        let page = await fetchMessages(chat.id)
        const incoming = [...page.messages]
        if (!initialized) {
          if (active) setNextCursor(page.next_cursor)
        } else {
          while (page.next_cursor && !page.messages.some((message) => knownIds.has(message.id))) {
            page = await fetchMessages(chat.id, page.next_cursor)
            incoming.push(...page.messages)
          }
        }
        if (!active) return
        incoming.forEach((message) => knownIds.add(message.id))
        setMessages((current) => mergeMessages(current, incoming))
        setRefreshError('')
        setUnavailable(false)
        initialized = true
      } catch (error_) {
        if (!active) return
        setRefreshError(messageError(error_))
        if (error_ instanceof ApiError && (error_.status === 403 || error_.status === 404)) {
          setUnavailable(true)
        }
      } finally {
        inFlight = false
        if (active) setLoading(false)
      }
    }

    void refresh()
    const timer = window.setInterval(refresh, refreshInterval)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [chat.id, attempt])

  async function loadOlder() {
    if (!nextCursor) return
    setLoadingOlder(true)
    setError('')
    try {
      const page = await fetchMessages(chat.id, nextCursor)
      setMessages((current) => mergeMessages(current, page.messages))
      setNextCursor(page.next_cursor)
    } catch (error_) {
      setError(messageError(error_))
      if (error_ instanceof ApiError && (error_.status === 403 || error_.status === 404)) setUnavailable(true)
    } finally {
      setLoadingOlder(false)
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setError('')
    try {
      const message = await sendMessage(chat.id, content)
      setMessages((current) => mergeMessages(current, [message]))
      setDraft((current) => current === draft ? '' : current)
    } catch (error_) {
      setError(messageError(error_))
      if (error_ instanceof ApiError && (error_.status === 403 || error_.status === 404)) setUnavailable(true)
    } finally {
      setSending(false)
    }
  }

  async function openPersonalChat(riderId?: string) {
    setOpeningRider(riderId ?? userId)
    setError('')
    try {
      const personal = await createPersonalChat(chat.ride_id, riderId)
      navigate(`/messages/${encodeURIComponent(personal.id)}`)
    } catch (error_) {
      setError(messageError(error_))
      setOpeningRider('')
    }
  }

  return (
    <section aria-label="Conversation" className="min-w-0 rounded-3xl bg-white p-5 ring-1 ring-black/10 sm:p-6">
      <Link to="/messages" className="text-sm font-medium text-subtle underline-offset-4 hover:underline md:hidden">
        Back to conversations
      </Link>
      <h2 className="mt-3 text-xl font-semibold md:mt-0">{chat.type === 'group' ? 'Ride group' : 'Personal chat'}</h2>
      <Link to={`/rides/${encodeURIComponent(chat.ride_id)}`} className="mt-1 inline-block break-all text-sm text-subtle underline-offset-4 hover:underline">
        Ride
      </Link>

      {chat.type === 'group' && chat.participants[0]?.id === userId && chat.participants.length > 1 && (
        <div className="mt-4 border-t border-black/10 pt-4">
          <p className="text-sm font-medium">Message a rider privately</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chat.participants.slice(1).map((participant) => (
              <button key={participant.id} type="button" onClick={() => openPersonalChat(participant.id)} disabled={!!openingRider || unavailable}
                className="max-w-full break-all rounded-full bg-mist px-4 py-2 text-sm hover:bg-black/10 disabled:opacity-60">
                {openingRider === participant.id ? 'Opening…' : participant.username}
              </button>
            ))}
          </div>
        </div>
      )}

      {chat.type === 'group' && chat.participants.slice(1).some((participant) => participant.id === userId) && (
        <div className="mt-4 border-t border-black/10 pt-4">
          <button type="button" onClick={() => openPersonalChat(userId)} disabled={!!openingRider || unavailable}
            className="max-w-full break-all rounded-full bg-mist px-4 py-2 text-sm hover:bg-black/10 disabled:opacity-60">
            {openingRider ? 'Opening…' : 'Message driver privately'}
          </button>
        </div>
      )}

      {error && <p role="alert" className={`${errorNotice} mt-4`}>{error}</p>}
      {refreshError && <p role="alert" className={`${errorNotice} mt-4`}>{refreshError}</p>}
      {loading ? (
        <p role="status" className="py-12 text-center text-subtle">Loading messages…</p>
      ) : (
        <div className="mt-5 min-h-64 space-y-4 border-t border-black/10 py-5">
          {nextCursor && !unavailable && (
            <button type="button" onClick={loadOlder} disabled={loadingOlder}
              className="block w-full text-center text-sm font-medium underline-offset-4 hover:underline disabled:opacity-60">
              {loadingOlder ? 'Loading…' : 'Load older messages'}
            </button>
          )}
          {messages.length === 0 && !error && !refreshError && <p className="py-10 text-center text-sm text-subtle">No messages yet. Say hello!</p>}
          {messages.map((message) => {
            const own = message.sender_id === userId
            return (
              <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${own ? 'bg-ink text-white' : 'bg-mist text-ink'}`}>
                  <p className={`break-all text-xs ${own ? 'text-white/70' : 'text-subtle'}`}>
                    {own ? 'You' : chat.participants.find((participant) => participant.id === message.sender_id)?.username ?? `User ${message.sender_id}`}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{message.content}</p>
                  <time dateTime={message.created_at} className={`mt-1 block text-xs ${own ? 'text-white/70' : 'text-subtle'}`}>
                    {new Date(message.created_at).toLocaleString()}
                  </time>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!loading && refreshError && messages.length === 0 && (
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mb-4 text-sm font-medium underline">
          Retry loading
        </button>
      )}
      <form onSubmit={handleSend} className="flex items-end gap-3 border-t border-black/10 pt-4">
        <label className="flex-1">
          <span className="sr-only">Message</span>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={512}
            placeholder="Type a message…" disabled={unavailable || loading} className={`${inputClass} resize-y disabled:opacity-60`} />
        </label>
        <button type="submit" disabled={!draft.trim() || sending || unavailable || loading} className={`${primaryButton} disabled:opacity-60`}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  )
}

export default function MessagesPage() {
  const { chatId } = useParams()
  const user = getUser()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ chatId: string | undefined; attempt: number; chats: Chat[]; error: string } | null>(null)

  useEffect(() => {
    let active = true
    fetchChats().then((items) => {
      if (active) setResult({ chatId, attempt, chats: items, error: '' })
    }).catch((error_: unknown) => {
      if (active) setResult({ chatId, attempt, chats: [], error: messageError(error_) })
    })
    return () => { active = false }
  }, [chatId, attempt])

  const current = result && result.chatId === chatId && result.attempt === attempt ? result : null
  const chats = current?.chats ?? []
  const error = current?.error ?? ''
  const loading = !current
  const selected = chats.find((chat) => chat.id === chatId)
  return (
    <div className="min-h-svh bg-white text-ink">
      <DashboardNavbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <h1 className={`text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] ${headingClass}`}>
          Your <em className="text-subtle">messages.</em>
        </h1>
        {error && (
          <div className="mt-6">
            <p role="alert" className={errorNotice}>{error}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 text-sm font-medium underline">Retry</button>
          </div>
        )}
        {loading ? (
          <p role="status" className="mt-10 text-subtle">Loading conversations…</p>
        ) : !error && (
          <div className="mt-10 grid gap-5 md:grid-cols-[minmax(15rem,1fr)_2fr]">
            <section aria-label="Conversations" className={chatId ? 'hidden md:block' : ''}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold">Conversations</h2>
                <button type="button" onClick={() => setAttempt((value) => value + 1)}
                  className="text-sm font-medium underline-offset-4 hover:underline">Refresh</button>
              </div>
              {chats.length === 0 ? (
                <p className="rounded-3xl bg-mist p-6 text-sm text-subtle">No chats yet. Open a group chat from one of your rides or accepted seats.</p>
              ) : (
                <ul className="space-y-2">
                  {chats.map((chat) => (
                    <li key={chat.id}>
                      <Link to={`/messages/${encodeURIComponent(chat.id)}`} aria-current={chat.id === chatId ? 'page' : undefined}
                        className={`block rounded-2xl p-4 ring-1 ring-black/10 hover:bg-mist ${chat.id === chatId ? 'bg-mist' : ''}`}>
                        <span className="block font-medium">{chat.type === 'group' ? 'Ride group' : 'Personal chat'}</span>
                        <span className="block break-all text-sm text-subtle">Ride</span>
                        {chat.type === 'personal' && (
                          <span className="block break-all text-sm text-subtle">
                            {chat.participants.find((participant) => participant.id !== user?.id)?.username ?? 'Unknown participant'}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {chatId ? (
              selected && user ? <ChatPanel key={selected.id} chat={selected} userId={user.id} /> : (
                <p role="alert" className="rounded-3xl bg-mist p-6 text-subtle">This chat is unavailable or you no longer have access. <Link to="/messages" className="underline">Back to conversations</Link></p>
              )
            ) : (
              <p className="hidden rounded-3xl bg-mist p-6 text-subtle md:block">Choose a conversation to view messages.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
