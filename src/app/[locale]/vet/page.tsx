import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { VetProfile } from '@/lib/types'
import { getTranslations } from 'next-intl/server'
import VetForm from './VetForm'

export const metadata: Metadata = { title: 'Vet Profile — FindMyPet' }

export default async function VetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/vet')

  const t = await getTranslations('vet')

  const { data } = await supabase
    .from('vet_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const vetProfile = data as VetProfile | null

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏥</span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          {vetProfile?.verified && (
            <span className="text-xs font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
              ✓ {t('verified')}
            </span>
          )}
          {vetProfile && !vetProfile.verified && (
            <span className="text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 px-2.5 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
              ⏳ {t('pending_verification')}
            </span>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('subtitle')}</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 sm:p-6">
        <VetForm existing={vetProfile} />
      </div>
    </div>
  )
}
