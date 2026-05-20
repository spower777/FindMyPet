'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useState, useRef, useEffect } from 'react'
import { routing } from '@/i18n/routing'

const LOCALE_LABELS: Record<string, string> = {
  pl: '🇵🇱', en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', zh: '🇨🇳',
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function switchLocale(next: string) {
    setOpen(false)
    // next-intl router keeps current pathname, only swaps locale
    router.replace(pathname, { locale: next })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        aria-label="Zmień język"
      >
        {LOCALE_LABELS[locale]}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden z-50 min-w-[120px]">
          {routing.locales.map(loc => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                loc === locale ? 'font-semibold text-orange-500' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {LOCALE_LABELS[loc]}
              <span className="uppercase text-xs font-mono">{loc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
