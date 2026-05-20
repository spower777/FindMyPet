import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import type { Metadata } from 'next'
import type { UserContact } from '@/lib/types'
import AddContactForm from '@/app/[locale]/profile/AddContactForm'
import DeleteContactButton from '@/app/[locale]/profile/DeleteContactButton'
import { getTranslations, getLocale } from 'next-intl/server'

export const metadata: Metadata = { title: 'Kontakty — FindMyPet' }

const CONTACT_TYPE_META: Record<string, { emoji: string; color: string }> = {
  owner:     { emoji: '👤', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  vet:       { emoji: '🏥', color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' },
  shelter:   { emoji: '🏠', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  emergency: { emoji: '🚨', color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
  volunteer: { emoji: '🙋', color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' },
  other:     { emoji: '📋', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
}

const ANIMAL_TYPE_EMOJIS: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/contacts', locale })

  const t = await getTranslations('contacts_page')
  const tc = await getTranslations('contact_types')
  const ta = await getTranslations('animal_types')
  const tp = await getTranslations('profile')

  const { data } = await supabase
    .from('user_contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const contacts = (data ?? []) as UserContact[]

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">👥 {t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('subtitle')}</p>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 mb-6">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">{t('no_contacts')}</p>
          <p className="text-sm mt-1">{t('no_contacts_hint')}</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {contacts.map(contact => {
            const meta = CONTACT_TYPE_META[contact.type] ?? CONTACT_TYPE_META.other
            return (
              <div key={contact.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.emoji} {tc(contact.type as 'owner' | 'vet' | 'shelter' | 'emergency' | 'volunteer' | 'other')}
                      </span>
                      {contact.animal_type && (
                        <span className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-full">
                          {ANIMAL_TYPE_EMOJIS[contact.animal_type]} {ta(contact.animal_type as 'dog' | 'cat' | 'bird' | 'rabbit' | 'exotic' | 'other')}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{contact.name}</p>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-sm text-orange-500 hover:underline block mt-0.5">
                        📞 {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-sm text-orange-500 hover:underline block mt-0.5">
                        ✉️ {contact.email}
                      </a>
                    )}
                    {contact.note && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{contact.note}</p>
                    )}
                  </div>
                  <DeleteContactButton contactId={contact.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddContactForm />

      <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-8">
        {tp('contacts')} · {contacts.length}
      </p>
    </div>
  )
}
