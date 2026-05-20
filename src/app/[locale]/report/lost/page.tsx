import PetForm from '@/components/PetForm'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const metadata: Metadata = { title: 'Zgłoś zagubione zwierzę — FindMyPet' }

export default async function ReportLostPage() {
  const t = await getTranslations('form')
  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🔴 {t('lost_title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          AI automatycznie porówna ze znalezionymi i wyśle alert do osób w pobliżu.
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 sm:p-6">
        <PetForm type="lost" />
      </div>
    </div>
  )
}
