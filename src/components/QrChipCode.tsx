'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslations } from 'next-intl'

interface Props {
  chipId: string | null
  petName: string
  profileUrl: string
}

export default function QrChipCode({ chipId, petName, profileUrl }: Props) {
  const t = useTranslations('pet')
  const [open, setOpen] = useState(false)

  // Prefer chip ID value, fall back to profile URL
  const qrValue = chipId ? `chip:${chipId}` : profileUrl

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full hover:border-orange-300 hover:text-orange-500 transition"
      >
        <span>◻️</span>
        <span>QR</span>
        {chipId && <span className="font-mono text-[10px] text-gray-400">{chipId.slice(-4)}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-xs w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{petName}</p>
              {chipId ? (
                <>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('chip_label')}</p>
                  <p className="font-mono text-sm text-gray-700 dark:text-gray-300 mt-1 tracking-widest">{chipId}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('identity')}</p>
              )}
            </div>

            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-2xl shadow-inner">
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                  level="H"
                  includeMargin={false}
                  imageSettings={chipId ? undefined : {
                    src: '/icon.svg',
                    width: 32,
                    height: 32,
                    excavate: true,
                  }}
                />
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-4 leading-relaxed">
              {chipId ? `chip:${chipId}` : profileUrl}
            </p>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </>
  )
}
