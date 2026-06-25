'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateConversation } from '@/app/actions/chat'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

interface PetResult {
  id: string
  name: string | null
  species: string
  type: string
  last_seen_address: string | null
  user_id: string
}

export default function NewConversationButton({ prominent }: { prominent?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PetResult[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [supabase.auth])

  async function search(q: string) {
    setQuery(q)
    setError(null)
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)

    // Search by pet name AND by owner full_name (via profiles)
    const [petRes, profileRes] = await Promise.all([
      supabase
        .from('pets')
        .select('id, name, species, type, last_seen_address, user_id')
        .in('type', ['lost', 'found'])
        .eq('status', 'active')
        .ilike('name', `%${q}%`)
        .limit(10),
      supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${q}%`)
        .limit(5),
    ])

    const byName = (petRes.data ?? []) as PetResult[]
    const profileIds = ((profileRes.data ?? []) as { id: string }[]).map(p => p.id)

    let byOwner: PetResult[] = []
    if (profileIds.length > 0) {
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, type, last_seen_address, user_id')
        .in('type', ['lost', 'found'])
        .eq('status', 'active')
        .in('user_id', profileIds)
        .limit(10)
      byOwner = (data ?? []) as PetResult[]
    }

    // Merge, deduplicate, exclude own pets
    const seen = new Set<string>()
    const filtered = [...byName, ...byOwner].filter(p => {
      if (p.user_id === currentUserId || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    setResults(filtered)
    setLoading(false)
  }

  async function start(pet: PetResult) {
    setError(null)

    if (!currentUserId) {
      router.push('/auth/login?next=/chat')
      return
    }

    setStarting(pet.id)
    try {
      const convId = await getOrCreateConversation(pet.id, pet.user_id)
      setOpen(false)
      setQuery('')
      setResults([])
      router.push(`/chat/${convId}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Błąd'
      if (msg === 'Unauthorized') {
        setError('Zaloguj się, aby wysłać wiadomość')
      } else {
        setError('Nie udało się otworzyć rozmowy. Spróbuj ponownie.')
      }
      setStarting(null)
    }
  }

  function close() { setOpen(false); setQuery(''); setResults([]); setError(null) }

  const trigger = prominent ? (
    <button onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-3 rounded-2xl text-sm transition shadow-sm shadow-orange-100 dark:shadow-orange-900">
      ✉️ Napisz wiadomość
    </button>
  ) : (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3.5 py-2 rounded-xl text-sm transition shadow-sm shadow-orange-100 dark:shadow-orange-900">
      ✉️ <span className="hidden sm:inline">Nowa</span>
    </button>
  )

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={close}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>

            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">✉️ Nowa wiadomość</p>
              <input
                autoFocus
                value={query}
                onChange={e => search(e.target.value)}
                placeholder="Wpisz imię zwierzaka lub właściciela..."
                className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Error banner */}
            {error && (
              <div className="px-4 pt-3">
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">
                  ⚠️ {error}
                </p>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto">
              {loading && (
                <p className="text-center text-sm text-gray-400 py-6">🔍 Szukam...</p>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">Brak wyników dla „{query}"</p>
              )}
              {!loading && query.length < 2 && !error && (
                <p className="text-center text-sm text-gray-400 py-6">Wpisz imię zwierzaka</p>
              )}
              {results.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => start(pet)}
                  disabled={starting === pet.id}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition text-left border-b border-gray-50 dark:border-gray-800 last:border-0 disabled:opacity-60"
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    pet.type === 'lost' ? 'bg-red-100 dark:bg-red-950' : 'bg-green-100 dark:bg-green-950'
                  }`}>
                    {SPECIES_EMOJI[pet.species] ?? '🐾'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{pet.name ?? pet.species}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {pet.type === 'lost' ? '🔴 Zaginął' : '🟢 Znaleziony'}
                      {pet.last_seen_address ? ` · ${pet.last_seen_address.split(',')[0]}` : ''}
                    </p>
                  </div>
                  {starting === pet.id
                    ? <span className="text-orange-400 text-xs shrink-0 animate-pulse">Otwieranie…</span>
                    : <span className="text-gray-300 dark:text-gray-600 text-sm shrink-0">→</span>
                  }
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={close} className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1.5 transition">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
