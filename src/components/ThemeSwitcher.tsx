'use client'

import { useState, useEffect } from 'react'

type Theme = 'natural' | 'modern' | 'emergency' | 'cyber'

const THEMES: { key: Theme; label: string; icon: string; desc: string; accent: string }[] = [
  { key: 'natural',   label: 'Natural',   icon: '🌿', desc: 'Przyjazny',  accent: 'bg-orange-500' },
  { key: 'modern',    label: 'Modern',    icon: '💎', desc: 'Tech',       accent: 'bg-indigo-500' },
  { key: 'emergency', label: 'Alert',     icon: '🚨', desc: 'Ratunkowy',  accent: 'bg-red-500'    },
  { key: 'cyber',     label: 'Cyber',     icon: '🤖', desc: 'Cyber Pet',  accent: 'bg-cyan-500'   },
]

const STORAGE_KEY = 'fmp-theme'

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'natural') {
    html.removeAttribute('data-theme')
  } else {
    html.setAttribute('data-theme', theme)
  }
}

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>('natural')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) ?? 'natural') as Theme
    setCurrent(saved)
    applyTheme(saved)
  }, [])

  function pick(theme: Theme) {
    setCurrent(theme)
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)
    setOpen(false)
  }

  const active = THEMES.find(t => t.key === current) ?? THEMES[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Zmień motyw"
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-lg"
        aria-label="Zmień motyw"
      >
        {active.icon}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 w-48 animate-fade-in">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pb-1.5">Motyw</p>
            {THEMES.map(t => (
              <button
                key={t.key}
                onClick={() => pick(t.key)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm transition ${
                  current === t.key
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="flex-1 text-left">{t.label}</span>
                <span className="text-[10px] text-gray-400">{t.desc}</span>
                {current === t.key && <span className="text-orange-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
