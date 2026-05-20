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
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('title')}</h1>

      {!conversations?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">{t('no_messages')}</p>
          <p className="text-sm mt-1">{t('no_messages_hint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const other = conv.pet_owner?.id === user.id ? conv.inquirer : conv.pet_owner
            const lastMsg = [...(conv.messages ?? [])].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:border-orange-200 dark:hover:border-orange-700 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-xl shrink-0">
                  {conv.pet ? SPECIES_EMOJI[conv.pet.species] : '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {other?.full_name ?? other?.email ?? t('user')}
                    </p>
                    {lastMsg && (
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(lastMsg.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    re: {conv.pet?.name ?? conv.pet?.species} ({conv.pet?.type === 'lost' ? t('lost_pet') : t('found_pet')})
                  </p>
                  {lastMsg && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {lastMsg.sender_id === user.id ? `${t('you')}: ` : ''}{lastMsg.content}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
