'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  petName: string
  petType?: 'lost' | 'found' | 'profile'
}

export default function ShareButton({ petName, petType }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const isLost = petType === 'lost'

  const shareText = isLost
    ? `🔴 Zaginął ${petName}! Pomóż go znaleźć — każda minuta się liczy! 🐾`
    : petType === 'found'
    ? `🟢 Znaleziono ${petName}! Pomóż mu wrócić do domu 🏠`
    : `🐾 Poznaj ${petName}!`

  const fullText = `${shareText} ${url}`
  const encodedText = encodeURIComponent(fullText)
  const encodedUrl = encodeURIComponent(url)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* clipboard blocked */ }
  }

  async function nativeShare() {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: petName, text: shareText, url }) } catch { /* cancelled */ }
    }
  }

  const hasNativeShare = typeof window !== 'undefined' && typeof navigator.share === 'function'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center transition text-lg"
        aria-label="Udostępnij"
        title="Udostępnij"
      >
        ↗
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-5 pt-5 pb-4 ${isLost ? 'bg-red-50 dark:bg-red-950/40' : 'bg-orange-50 dark:bg-orange-950/20'}`}>
              <p className="text-3xl mb-1.5">{isLost ? '🔴' : '🐾'}</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight">
                {isLost ? 'Każda minuta się liczy!' : 'Razem możemy więcej'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isLost
                  ? `Pomóż znaleźć ${petName} — udostępnij znajomym i w mediach`
                  : `Udostępnij profil ${petName} i pomóż mu znaleźć dom`}
              </p>
            </div>

            {/* Social share buttons */}
            <div className="p-4 grid grid-cols-2 gap-2.5">
              <a
                href={`https://wa.me/?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1aad52] text-white font-semibold rounded-2xl px-4 py-3 text-sm transition"
              >
                <span className="text-lg leading-none">📱</span> WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-[#229ED9] hover:bg-[#1a88bf] text-white font-semibold rounded-2xl px-4 py-3 text-sm transition"
              >
                <span className="text-lg leading-none">✈️</span> Telegram
              </a>
              <a
                href={`fb-messenger://share/?link=${encodedUrl}`}
                className="flex items-center gap-2.5 bg-[#0084FF] hover:bg-[#006fdb] text-white font-semibold rounded-2xl px-4 py-3 text-sm transition"
              >
                <span className="text-lg leading-none">💬</span> Messenger
              </a>
              {hasNativeShare ? (
                <button
                  onClick={nativeShare}
                  className="flex items-center gap-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-2xl px-4 py-3 text-sm transition"
                >
                  <span className="text-lg leading-none">↗</span> Więcej
                </button>
              ) : (
                <button
                  onClick={copyLink}
                  className={`flex items-center gap-2.5 font-semibold rounded-2xl px-4 py-3 text-sm transition ${
                    copied
                      ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg leading-none">{copied ? '✓' : '🔗'}</span>
                  {copied ? 'Skopiowano!' : 'Kopiuj link'}
                </button>
              )}
            </div>

            {/* Copy link bar */}
            <div className="px-4">
              <button
                onClick={copyLink}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition border ${
                  copied
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="font-mono text-xs flex-1 truncate text-left opacity-60">{url}</span>
                <span className="shrink-0 font-medium text-xs">{copied ? '✓ Skopiowano' : '📋 Kopiuj'}</span>
              </button>
            </div>

            {/* QR Code */}
            {url && (
              <div className="px-4 pt-3 pb-2 flex flex-col items-center gap-1.5">
                <p className="text-xs text-gray-400 dark:text-gray-500">Zeskanuj kod QR, aby otworzyć stronę</p>
                <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 inline-block">
                  <QRCodeSVG value={url} size={112} />
                </div>
              </div>
            )}

            {/* Close */}
            <div className="px-4 py-3">
              <button
                onClick={() => setOpen(false)}
                className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1.5 transition"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
