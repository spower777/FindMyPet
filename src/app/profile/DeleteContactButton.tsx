'use client'

import { useTransition } from 'react'
import { deleteContact } from '@/app/actions/contacts'

export default function DeleteContactButton({ contactId }: { contactId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => deleteContact(contactId))}
      disabled={isPending}
      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition px-2 py-1 rounded-lg hover:bg-red-50"
      aria-label="Usuń kontakt"
    >
      {isPending ? '…' : '✕'}
    </button>
  )
}
