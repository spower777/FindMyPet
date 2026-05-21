'use client'

import { useSearchParams } from 'next/navigation'
import { Link, usePathname } from '@/i18n/navigation'

interface Tab {
  key: string
  label: string
  icon: string
  count?: number
}

export default function PetTabNav({ tabs }: { tabs: Tab[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') ?? tabs[0]?.key

  return (
    <div className="flex gap-0 overflow-x-auto border-b border-gray-100 dark:border-gray-800 scrollbar-none">
      {tabs.map(tab => {
        const isActive = tab.key === activeTab
        return (
          <Link
            key={tab.key}
            href={`${pathname}?tab=${tab.key}`}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              isActive
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
