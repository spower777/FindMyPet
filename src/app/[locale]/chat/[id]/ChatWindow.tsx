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
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new as ChatMessage]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
    }])
    try {
      await sendMessage(conversationId, content)
    } finally {
      setSending(false)
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-2 py-2">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm">{t('first_message')}</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-orange-500 text-white rounded-br-md'
                  : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm'
              }`}>
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-orange-200' : 'text-gray-400'}`}>
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
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('placeholder')}
          className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm transition active:scale-95"
        >
          {t('send')}
        </button>
      </form>
    </>
  )
}
