'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPet } from '@/app/actions/pets'
import LocationPicker from './LocationPicker'
import { useTranslations } from 'next-intl'
import type { PetSpecies, PetType } from '@/lib/types'

export default function PetForm({ type }: { type: PetType }) {
  const t = useTranslations('form')
  const ts = useTranslations('species')
  const [species, setSpecies] = useState<PetSpecies>('dog')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [color, setColor] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const SPECIES_LIST: { value: PetSpecies; emoji: string }[] = [
    { value: 'dog', emoji: '🐕' },
    { value: 'cat', emoji: '🐈' },
    { value: 'bird', emoji: '🐦' },
    { value: 'rabbit', emoji: '🐇' },
    { value: 'other', emoji: '🐾' },
  ]

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 5 - photos.length)
    setPhotos(prev => [...prev, ...newFiles])
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file)
      setPreviews(prev => [...prev, url])
    })
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lat === null || lng === null) { setError('Wybierz lokalizację na mapie'); return }
    if (!description.trim()) { setError('Opis jest wymagany'); return }
    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Zaloguj się aby dodać zgłoszenie'); setSubmitting(false); return }

      const photoPaths: string[] = []
      for (const file of photos) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('pet-photos')
          .upload(path, file, { upsert: false })
        if (!uploadError) photoPaths.push(path)
      }

      await createPet({
        type,
        species,
        name: name.trim(),
        breed: breed.trim(),
        color: color.trim(),
        description: description.trim(),
        last_seen_lat: lat,
        last_seen_lng: lng,
        last_seen_address: address,
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        photo_paths: photoPaths,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd'
      if (!msg.includes('NEXT_REDIRECT')) {
        setError(msg)
        setSubmitting(false)
      }
    }
  }

  const isLost = type === 'lost'
  const inputCls = 'input-field'
  const labelCls = 'label'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Species */}
      <div>
        <label className={labelCls}>{ts('dog').replace('Pies', 'Gatunek') === 'Gatunek' ? 'Gatunek' : 'Species'}</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {SPECIES_LIST.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSpecies(s.value)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition min-h-[44px] ${
                species === s.value
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <span>{s.emoji}</span>
              <span>{ts(s.value)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Basic info — stacked on mobile, 2-col on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="np. Burek" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('breed')}</label>
          <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="np. Labrador" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>{t('color')}</label>
        <input value={color} onChange={e => setColor(e.target.value)} placeholder="np. czarno-biały, rudy" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>
          {t('description')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          rows={3}
          placeholder={isLost ? 'Opisz zwierzę — znaki szczególne, obroża, chip...' : 'Opisz gdzie i kiedy znalazłeś, jak wygląda...'}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelCls}>
          {t('location')} <span className="text-red-500">*</span>
        </label>
        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng, newAddress) => {
            setLat(newLat)
            setLng(newLng)
            setAddress(newAddress)
          }}
        />
        {address && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{address}</p>}
      </div>

      {/* Photos */}
      <div>
        <label className={labelCls}>{t('photos')} (max 5)</label>
        <div
          className="mt-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-center cursor-pointer hover:border-orange-300 transition active:scale-[0.99]"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
          <p className="text-2xl mb-1">📷</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kliknij lub przeciągnij zdjęcia</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPG, PNG — do 10 MB każde</p>
        </div>
        {previews.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {previews.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm"
                >
                  ×
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center rounded-b-xl py-0.5">
                    główne
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact — stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('phone')}</label>
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+48 123 456 789" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('email')}</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="twoj@email.pl" className={inputCls} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full py-4 rounded-2xl font-semibold text-white transition text-base active:scale-[0.98] ${
          isLost
            ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 shadow-sm shadow-red-100 dark:shadow-red-900'
            : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300 shadow-sm shadow-green-100 dark:shadow-green-900'
        }`}
      >
        {submitting ? '⏳ Zapisuję...' : isLost ? t('submit_lost') : t('submit_found')}
      </button>
    </form>
  )
}
