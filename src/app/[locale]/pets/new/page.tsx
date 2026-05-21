import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Metadata } from 'next'
import PetProfileForm from '@/components/PetProfileForm'

export const metadata: Metadata = { title: 'Nowy pupil — FindMyPet' }

export default async function NewPetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/pets/new', locale })

  const t = await getTranslations('profile')

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">←</Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">🐾 {t('new_pet_title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('new_pet_subtitle')}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 sm:p-6">
        <PetProfileForm />
      </div>
    </div>
  )
}
