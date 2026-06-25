'use client'

import { useState, useRef, useCallback } from 'react'
import { Link } from '@/i18n/navigation'

const SPECIES_OPTIONS = [
  { value: '', label: 'Wszystkie gatunki' },
  { value: 'dog', label: '🐕 Pies' },
  { value: 'cat', label: '🐈 Kot' },
  { value: 'bird', label: '🐦 Ptak' },
  { value: 'rabbit', label: '🐇 Królik' },
  { value: 'exotic', label: '🦎 Egzotyczny' },
  { value: 'other', label: '🐾 Inny' },
]

interface SearchResult {
  id: string
  name: string | null
  type: 'lost' | 'found'
  species: string
  score: number
  reasoning: string
  photo_url: string
  last_seen_address: string | null
}

function resizeImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

export default function PhotoSearch() {
  const [preview, setPreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [species, setSpecies] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    try {
      const resized = await resizeImage(file)
      setPreview(resized)
      setImageData(resized)
      setResults(null)
      setError(null)
    } catch {
      setError('Nie udało się wczytać zdjęcia.')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  async function search() {
    if (!imageData) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/match/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, species: species || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Błąd serwera')
      }
      const data = await res.json()
      setResults(data.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd podczas wyszukiwania.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-[#161616] border border-gray-100 dark:border-[#242424] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-[#242424] flex items-center gap-3">
        <span className="text-xl">🤖</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm">Wyszukaj zwierzę po zdjęciu</h2>
          <p className="text-xs text-gray-500 mt-0.5">Wrzuć zdjęcie — AI porówna je ze wszystkimi zgłoszeniami w bazie</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          className={`relative border-2 border-dashed rounded-xl transition cursor-pointer ${
            dragging
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
              : preview
              ? 'border-gray-200 dark:border-[#333]'
              : 'border-gray-200 dark:border-[#333] hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-950/10'
          }`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Podgląd" className="w-full max-h-52 object-contain rounded-xl" />
              <button
                onClick={e => { e.stopPropagation(); setPreview(null); setImageData(null); setResults(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-black/70 transition z-10"
                aria-label="Usuń zdjęcie"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400 dark:text-gray-600">
              <span className="text-4xl">📸</span>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Przeciągnij lub kliknij, aby dodać zdjęcie</p>
              <p className="text-xs">JPG, PNG, WEBP</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <select
            value={species}
            onChange={e => setSpecies(e.target.value)}
            className="flex-1 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-2.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            {SPECIES_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={search}
            disabled={!imageData || loading}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-md shadow-orange-500/20 shrink-0"
          >
            {loading ? '⏳ Szukam…' : '🔍 Szukaj AI'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Porównuję ze zgłoszeniami… to może chwilę potrwać
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Results */}
        {results !== null && !loading && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              {results.length > 0 ? `${results.length} dopasowań AI` : 'Brak dopasowań'}
            </p>
            {results.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nie znaleziono podobnych zgłoszeń. Spróbuj z innym zdjęciem lub kategorią.
              </p>
            ) : (
              <div className="space-y-2.5">
                {results.map(r => (
                  <Link
                    key={r.id}
                    href={`/pets/${r.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-[#242424] hover:border-orange-500/30 transition bg-gray-50 dark:bg-[#1a1a1a] group"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-200 dark:bg-[#2a2a2a]">
                      <img src={r.photo_url} alt={r.name ?? ''} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.type === 'lost'
                            ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {r.type === 'lost' ? '● Zaginiony' : '● Znaleziony'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0 ${
                          r.score >= 0.75
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400'
                            : r.score >= 0.55
                            ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                          {Math.round(r.score * 100)}% zgodności
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-500 transition">
                        {r.name ?? 'Nieznane'}
                      </p>
                      {r.last_seen_address && (
                        <p className="text-xs text-gray-400 truncate">{r.last_seen_address}</p>
                      )}
                      {r.reasoning && (
                        <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5 line-clamp-1 italic">{r.reasoning}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
