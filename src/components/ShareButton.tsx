'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  petName: string
  petType?: 'lost' | 'found' | 'profile'
}

function PawSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="white" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="18" rx="6" ry="8" />
      <ellipse cx="28" cy="10" rx="6" ry="8" />
      <ellipse cx="44" cy="10" rx="6" ry="8" />
      <ellipse cx="58" cy="18" rx="6" ry="8" />
      <path d="M32 28c-10 0-20 7-20 16 0 8 6 12 20 12s20-4 20-12c0-9-10-16-20-16z" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
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

  const displayUrl = url.replace(/^https?:\/\//, '')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center transition"
        aria-label="Udostępnij"
        title="Udostępnij"
      >
        <SendIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#141414] border border-[#282828] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Udostępnij</p>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-[#252525] border border-[#333] text-gray-400 hover:text-white flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Branded preview card */}
            <div className="mx-4 bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-4 flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                <PawSvg className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="font-bold text-white text-sm leading-tight">FindMyPet — znajdź swojego pupila</p>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed uppercase tracking-wide">
                  Społecznościowa mapa zagubionych<br />i znalezionych zwierząt
                </p>
                <p className="text-[10px] text-gray-600 mt-2 truncate font-mono">{displayUrl || 'findmypet.app'}</p>
              </div>
            </div>

            {/* URL bar + send button */}
            <div className="px-4 pt-4 pb-2 flex items-center gap-3">
              <div className="flex-1 flex items-center bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl px-3.5 py-3 gap-2 min-w-0">
                <span className="text-gray-500 shrink-0 text-sm">🙂</span>
                <span className="text-xs text-gray-400 font-mono truncate flex-1">{displayUrl || 'findmypet.app'}</span>
                <span className="text-gray-600 shrink-0 text-xs">—</span>
              </div>
              <a
                href={`https://wa.me/?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center text-white shrink-0 transition shadow-lg shadow-orange-500/40 hover:shadow-orange-500/60"
                title="Wyślij przez WhatsApp"
              >
                <SendIcon />
              </a>
            </div>

            {/* Divider */}
            <div className="mx-4 mt-4 border-t border-[#242424]" />

            {/* Share action icons */}
            <div className="px-4 pt-4 pb-6 flex justify-around gap-2">
              <a
                href={`https://wa.me/?text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-xl group-hover:scale-105 transition shadow-md">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </div>
                <span className="text-[10px] text-gray-500">WhatsApp</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#229ED9] flex items-center justify-center text-xl group-hover:scale-105 transition shadow-md">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </div>
                <span className="text-[10px] text-gray-500">Telegram</span>
              </a>

              <a
                href={`fb-messenger://share/?link=${encodedUrl}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0084FF] flex items-center justify-center group-hover:scale-105 transition shadow-md">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg>
                </div>
                <span className="text-[10px] text-gray-500">Messenger</span>
              </a>

              <button
                onClick={copyLink}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition shadow-md ${copied ? 'bg-green-500' : 'bg-[#252525] border border-[#333]'}`}>
                  {copied
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  }
                </div>
                <span className="text-[10px] text-gray-500">{copied ? 'Skopiowano' : 'Kopiuj'}</span>
              </button>

              {url && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md overflow-hidden">
                    <QRCodeSVG value={url} size={40} />
                  </div>
                  <span className="text-[10px] text-gray-500">QR Code</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
