import { apiFetch, throwIfNotOk } from './api'

export type Chat = {
  id: string
  ride_id: string
  type: 'personal' | 'group'
  participants: { id: string; username: string }[]
}

export type ChatMessage = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
}

export type MessagePage = {
  messages: ChatMessage[]
  next_cursor: string | null
}

export async function fetchChats(): Promise<Chat[]> {
  const response = await apiFetch('/chats')
  await throwIfNotOk(response)
  return response.json()
}

export async function createGroupChat(rideId: string): Promise<Chat> {
  const response = await apiFetch(`/rides/${encodeURIComponent(rideId)}/chats/group`, { method: 'POST' })
  await throwIfNotOk(response)
  return response.json()
}

export async function createPersonalChat(rideId: string, riderId?: string): Promise<Chat> {
  const response = await apiFetch(`/rides/${encodeURIComponent(rideId)}/chats/personal`, {
    method: 'POST',
    body: JSON.stringify(riderId ? { rider_id: riderId } : {}),
  })
  await throwIfNotOk(response)
  return response.json()
}

export async function fetchMessages(chatId: string, cursor?: string): Promise<MessagePage> {
  const params = new URLSearchParams({ limit: '100' })
  if (cursor) params.set('cursor', cursor)
  const response = await apiFetch(`/chats/${encodeURIComponent(chatId)}/messages?${params}`)
  await throwIfNotOk(response)
  return response.json()
}

export async function sendMessage(chatId: string, content: string): Promise<ChatMessage> {
  const response = await apiFetch(`/chats/${encodeURIComponent(chatId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  await throwIfNotOk(response)
  return response.json()
}
