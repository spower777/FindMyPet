'use client'

import { useTranslations } from 'next-intl'

export default function DeletePetForm({
  petId,
  deletePetAction,
}: {
  petId: string
  deletePetAction: (petId: string) => Promise<void>
}) {
  const t = useTranslations('pet')

  return (
    <form action={deletePetAction.bind(null, petId)} className="flex-1 border-l border-gray-100 dark:border-gray-800">
      <button
        type="submit"
        className="w-full text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-950 py-2.5 transition font-medium"
        onClick={e => {
          if (!confirm(t('delete_confirm'))) e.preventDefault()
        }}
      >
        {t('delete')}
      </button>
    </form>
  )
}
