'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/app/actions/chat'
import { useTranslations } from 'next-intl'
import type { ChatMessage } from '@/lib/types'

interface Props {
  conversationId: string
  initialMessages: ChatMessage[]
  currentUserId: string
}

export default function ChatWindow({ conversationId, initialMessages, currentUserId }: Props) {
  const t = useTranslations('chat')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)
  const supabase = createClient()

  // Scroll: instant on mount, smooth for new messages
  useEffect(() => {
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView()
      isFirstLoad.current = false
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Realtime subscription — single source of truth, no optimistic duplicates
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev =>
          prev.find(m => m.id === payload.new.id)
            ? prev
            : [...prev, payload.new as ChatMessage]
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setInput('')
    try {
      await sendMessage(conversationId, content)
      // Message added via realtime — no optimistic to avoid duplicates
    } catch {
      setInput(content) // restore on error
    } finally {
      setSending(false)
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto py-3 px-1 space-y-1.5">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👋</p>
            <p className="text-sm font-medium">{t('first_message')}</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isMe
                  ? 'bg-orange-500 text-white rounded-tr-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm shadow-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[11px] mt-1 ${isMe ? 'text-orange-200 text-right' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <input
          autoFocus
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('placeholder')}
          disabled={sending}
          className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 transition disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-2xl text-sm transition active:scale-95 min-w-[72px]"
        >
          {sending ? '…' : t('send')}
        </button>
      </form>
    </>
  )
}
