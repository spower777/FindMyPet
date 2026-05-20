import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import type { Metadata } from 'next'
import type { UserContact, PetSummary } from '@/lib/types'
import AddContactForm from '@/app/[locale]/profile/AddContactForm'
import ContactCard from './ContactCard'
import { getTranslations, getLocale } from 'next-intl/server'

export const metadata: Metadata = { title: 'Kontakty — FindMyPet' }

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/contacts', locale })

  const t = await getTranslations('contacts_page')
  const tp = await getTranslations('profile')

  const [{ data: contactsData }, { data: petsData }] = await Promise.all([
    supabase.from('user_contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('pets').select('id, name, species').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
  ])

  const contacts = (contactsData ?? []) as UserContact[]
  const pets = (petsData ?? []) as PetSummary[]

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
            const linkedPet = pets.find(p => p.id === contact.pet_id) ?? null
            return <ContactCard key={contact.id} contact={contact} pets={pets} linkedPet={linkedPet} />
          })}
        </div>
      )}

      <AddContactForm pets={pets} />

      <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-8">
        {tp('contacts')} · {contacts.length}
      </p>
    </div>
  )
}
