import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import type { Metadata } from 'next'
import { getTranslations, getLocale } from 'next-intl/server'
import type {
  ConversationListItem,
  ConversationPetSummary,
  ProfileSummary,
} from '@/lib/types'
import NewConversationButton from './NewConversationButton'

type Relation<T> = T | T[] | null

interface RawConversationListItem extends Omit<ConversationListItem, 'pet' | 'pet_owner' | 'inquirer'> {
  pet: Relation<ConversationPetSummary>
  pet_owner: Relation<ProfileSummary>
  inquirer: Relation<ProfileSummary>
}

function firstRelation<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

export const metadata: Metadata = { title: 'Wiadomości' }

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}
const TYPE_COLOR: Record<string, string> = {
  lost: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
  found: 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400',
}

export default async function ChatListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/chat', locale })

  const t = await getTranslations('chat')

  const { data } = await supabase
    .from('conversations')
    .select(`
      id, created_at, updated_at,
      pet:pets(id, name, species, type),
      pet_owner:profiles!conversations_pet_owner_id_fkey(id, email, full_name),
      inquirer:profiles!conversations_inquirer_id_fkey(id, email, full_name),
      messages(content, created_at, sender_id)
    `)
    .or(`pet_owner_id.eq.${user.id},inquirer_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  const conversations = ((data ?? []) as unknown as RawConversationListItem[]).map(conv => ({
    ...conv,
    pet: firstRelation(conv.pet),
    pet_owner: firstRelation(conv.pet_owner),
    inquirer: firstRelation(conv.inquirer),
  }))

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">💬 {t('title')}</h1>
          {conversations.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{conversations.length} rozmów</p>
          )}
        </div>
        <NewConversationButton />
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">💬</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">{t('no_messages')}</p>
          <p className="text-sm mt-2 mb-6">{t('no_messages_hint')}</p>
          <NewConversationButton prominent />
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const other = conv.pet_owner?.id === user.id ? conv.inquirer : conv.pet_owner
            const lastMsg = [...(conv.messages ?? [])].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            const isUnread = lastMsg && lastMsg.sender_id !== user.id
            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={`flex items-center gap-3 rounded-2xl border p-4 hover:border-orange-200 dark:hover:border-orange-700 hover:shadow-md transition-all ${
                  isUnread
                    ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                }`}
              >
                {/* Species avatar */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                  conv.pet?.type === 'lost'
                    ? 'bg-red-100 dark:bg-red-950'
                    : 'bg-green-100 dark:bg-green-950'
                }`}>
                  {conv.pet ? SPECIES_EMOJI[conv.pet.species] : '🐾'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>
                      {other?.full_name ?? other?.email ?? t('user')}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(lastMsg.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {conv.pet?.type && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLOR[conv.pet.type]}`}>
                        {conv.pet.type === 'lost' ? t('lost_pet') : t('found_pet')}
                      </span>
                    )}
                    <p className="text-xs text-gray-400 truncate">
                      {conv.pet?.name ?? conv.pet?.species}
                    </p>
                  </div>
                  {lastMsg && (
                    <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                      {lastMsg.sender_id === user.id ? `${t('you')}: ` : ''}{lastMsg.content}
                    </p>
                  )}
                </div>

                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
