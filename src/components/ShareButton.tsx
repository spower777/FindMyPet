'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  petName: string
}

export default function ShareButton({ petName }: Props) {
  const t = useTranslations('pet')
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: petName, url })
      } catch {
        // user cancelled or permission denied — silent
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard blocked — do nothing
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`w-full rounded-2xl p-4 text-sm text-center font-medium transition active:scale-[0.99] border ${
        copied
          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
          : 'bg-orange-50 dark:bg-orange-950 border-orange-100 dark:border-orange-900 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900'
      }`}
    >
      {copied ? `${t('share_copied')}` : `🐾 ${t('share_help')}`}
    </button>
  )
}
