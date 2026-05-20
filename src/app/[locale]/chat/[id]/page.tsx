import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ChatWindow from './ChatWindow'
import type {
  ChatMessage,
  ConversationDetail,
  ConversationPetSummary,
  ProfileSummary,
} from '@/lib/types'

type Relation<T> = T | T[] | null

interface RawConversationDetail extends Omit<ConversationDetail, 'pet' | 'pet_owner' | 'inquirer'> {
  pet: Relation<ConversationPetSummary>
  pet_owner: Relation<ProfileSummary>
  inquirer: Relation<ProfileSummary>
}

function firstRelation<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export const metadata: Metadata = { title: 'Czat' }

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('conversations')
    .select(`
      id,
      pet:pets(id, name, species, type),
      pet_owner:profiles!conversations_pet_owner_id_fkey(id, email, full_name),
      inquirer:profiles!conversations_inquirer_id_fkey(id, email, full_name)
    `)
    .eq('id', id)
    .single()

  const rawConv = data as unknown as RawConversationDetail | null
  const conv: ConversationDetail | null = rawConv
    ? {
        ...rawConv,
        pet: firstRelation(rawConv.pet),
        pet_owner: firstRelation(rawConv.pet_owner),
        inquirer: firstRelation(rawConv.inquirer),
      }
    : null
  if (!conv) notFound()

  const { data: rawMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const messages = (rawMessages ?? []) as ChatMessage[]
  const other = conv.pet_owner?.id === user.id ? conv.inquirer : conv.pet_owner
  const pet = conv.pet

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/chat" className="text-sm text-orange-500 hover:text-orange-600">←</Link>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">
            {other?.full_name ?? other?.email ?? 'Użytkownik'}
          </p>
          <Link href={`/pets/${pet?.id}`} className="text-xs text-orange-500 hover:underline">
            re: {pet?.name ?? pet?.species} ({pet?.type === 'lost' ? 'zaginiony' : 'znaleziony'}) →
          </Link>
        </div>
      </div>

      <ChatWindow
        conversationId={id}
        initialMessages={messages ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
