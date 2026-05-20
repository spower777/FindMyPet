'use client'

import { useState, useTransition } from 'react'
import { findPetByChipOrName, uploadVetDocument, deleteVetDocument } from '@/app/actions/vet'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import type { VetDocument } from '@/lib/types'

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'
const labelCls = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

interface FoundPet {
  id: string
  name: string | null
  species: string
  chip_id: string | null
}

interface Props {
  existingDocuments: VetDocument[]
}

export default function VetDocumentUpload({ existingDocuments }: Props) {
  const t = useTranslations('vet')
  const m = useTranslations('medical')

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [foundPet, setFoundPet] = useState<FoundPet | null>(null)
  const [notFound, setNotFound] = useState(false)

  const [docPath, setDocPath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setFoundPet(null)
    setNotFound(false)
    const result = await findPetByChipOrName(query)
    setSearching(false)
    if (result) setFoundPet(result)
    else setNotFound(true)
  }

  async function handleFile(file: File) {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const path = `${user.id}/vet_${Date.now()}_${file.name.replace(/\s/g, '_')}`
    const { error: upErr } = await supabase.storage.from('pet-documents').upload(path, file)
    if (!upErr) setDocPath(path)
    setUploading(false)
  }

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!foundPet || !docPath) return
    setError(null)
    const fd = new FormData(e.currentTarget)
    const title = (fd.get('title') as string).trim()
    if (!title) return

    start(async () => {
      try {
        await uploadVetDocument(foundPet.id, {
          title,
          notes: fd.get('notes') as string,
          document_path: docPath,
        })
        setSuccess(true)
        setFoundPet(null)
        setQuery('')
        setDocPath('')
        setTimeout(() => setSuccess(false), 3000)
        ;(e.target as HTMLFormElement).reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Send new document */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('send_document')}</p>

        {/* Step 1: find pet */}
        {!foundPet && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setNotFound(false) }}
              placeholder={t('search_pet_placeholder')}
              className={`${inputCls} flex-1`}
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              {searching ? '...' : '🔍'}
            </button>
          </form>
        )}

        {notFound && (
          <p className="text-sm text-red-500">{t('pet_not_found')}</p>
        )}

        {/* Step 2: confirm pet + upload */}
        {foundPet && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2">
              <span className="text-lg">{SPECIES_EMOJI[foundPet.species]}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm text-orange-800 dark:text-orange-200">{foundPet.name ?? foundPet.species}</p>
                {foundPet.chip_id && <p className="text-xs font-mono text-orange-600 dark:text-orange-400">{foundPet.chip_id}</p>}
              </div>
              <button onClick={() => setFoundPet(null)} className="text-orange-400 hover:text-orange-600 text-lg leading-none">×</button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className={labelCls}>{t('document_title')} *</label>
                <input name="title" required placeholder="np. Wyniki badań krwi" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{m('vet_notes')}</label>
                <textarea name="notes" rows={2} placeholder="Opcjonalne notatki..." className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>{m('upload_doc')} *</label>
                <label className={`flex items-center gap-2 cursor-pointer border border-dashed border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition ${uploading ? 'opacity-50' : ''}`}>
                  <span>📎</span>
                  <span>{uploading ? '...' : docPath ? docPath.split('/').pop() : 'PDF, max 10 MB'}</span>
                  <input type="file" accept="application/pdf" hidden disabled={uploading}
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={pending || uploading || !docPath}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition"
              >
                {pending ? '...' : t('send_to_owner')}
              </button>
            </form>
          </div>
        )}

        {success && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium text-center">✓ {t('document_sent')}</p>
        )}
      </div>

      {/* Sent documents history */}
      {existingDocuments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t('sent_documents')}</p>
          <div className="space-y-2">
            {existingDocuments.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex items-start gap-3">
                <span className="text-lg shrink-0">📎</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {doc.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{doc.notes}</p>}
                </div>
                <button
                  onClick={() => deleteVetDocument(doc.id, doc.pet_id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition text-lg leading-none shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
