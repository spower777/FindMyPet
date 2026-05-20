import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import type { Metadata } from 'next'
import type { VetProfile, VetDocument } from '@/lib/types'
import { getTranslations, getLocale } from 'next-intl/server'
import VetForm from './VetForm'
import VetDocumentUpload from '@/components/medical/VetDocumentUpload'

export const metadata: Metadata = { title: 'Vet Profile — FindMyPet' }

export default async function VetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/vet', locale })

  const t = await getTranslations('vet')

  const { data: vetData } = await supabase
    .from('vet_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const vetProfile = vetData as VetProfile | null

  const { data: docsData } = vetProfile
    ? await supabase
        .from('vet_documents')
        .select('*')
        .eq('vet_id', vetProfile.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const sentDocuments = (docsData ?? []) as VetDocument[]

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Header */}
      <div>
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

      {/* Profile form */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 sm:p-6">
        <VetForm existing={vetProfile} />
      </div>

      {/* Document sharing — only if vet profile exists */}
      {vetProfile && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <span>📎</span> {t('send_document')}
          </h2>
          <VetDocumentUpload existingDocuments={sentDocuments} />
        </div>
      )}
    </div>
  )
}
