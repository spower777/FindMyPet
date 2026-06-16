'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePetProfile } from '@/app/actions/pets'
import { resizeImage } from '@/lib/resizeImage'
import { useTranslations } from 'next-intl'
import type { PetSpecies, PetGender } from '@/lib/types'

const SPECIES_LIST: { value: PetSpecies; emoji: string }[] = [
  { value: 'dog', emoji: '🐕' },
  { value: 'cat', emoji: '🐈' },
  { value: 'bird', emoji: '🐦' },
  { value: 'rabbit', emoji: '🐇' },
  { value: 'other', emoji: '🐾' },
]

interface ExistingPhoto {
  id: string
  url: string
  is_primary: boolean
}

interface InitialData {
  species: PetSpecies
  name: string
  breed: string
  color: string
  bio: string
  gender: PetGender
  birth_date: string
  chip_id: string
  character: string
  allergies: string
  is_neutered: boolean | null
  contact_phone: string
  contact_email: string
}

export default function EditPetProfileForm({
  petId,
  initialData,
  existingPhotos,
}: {
  petId: string
  initialData: InitialData
  existingPhotos: ExistingPhoto[]
}) {
  const t = useTranslations('form')
  const ts = useTranslations('species')

  const [species, setSpecies] = useState<PetSpecies>(initialData.species)
  const [name, setName] = useState(initialData.name)
  const [breed, setBreed] = useState(initialData.breed)
  const [color, setColor] = useState(initialData.color)
  const [bio, setBio] = useState(initialData.bio)
  const [gender, setGender] = useState<PetGender>(initialData.gender)
  const [birthDate, setBirthDate] = useState(initialData.birth_date)
  const [chipId, setChipId] = useState(initialData.chip_id)
  const [character, setCharacter] = useState(initialData.character)
  const [allergies, setAllergies] = useState(initialData.allergies)
  const [isNeutered, setIsNeutered] = useState<boolean | null>(initialData.is_neutered)
  const [contactPhone, setContactPhone] = useState(initialData.contact_phone)
  const [contactEmail, setContactEmail] = useState(initialData.contact_email)

  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputCls = 'input-field'
  const labelCls = 'label'

  const visibleExisting = existingPhotos.filter(p => !deletedPhotoIds.includes(p.id))

  function handleFiles(files: FileList | null) {
    if (!files) return
    const totalPhotos = visibleExisting.length + newPhotos.length
    const newFiles = Array.from(files).slice(0, 5 - totalPhotos)
    setNewPhotos(prev => [...prev, ...newFiles])
    newFiles.forEach(file => setNewPreviews(prev => [...prev, URL.createObjectURL(file)]))
  }

  function removeExistingPhoto(id: string) {
    setDeletedPhotoIds(prev => [...prev, id])
  }

  function removeNewPhoto(i: number) {
    setNewPhotos(prev => prev.filter((_, idx) => idx !== i))
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(t('name_required') || 'Imię jest wymagane'); return }
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Zaloguj się'); setSubmitting(false); return }

      const newPhotoPaths: string[] = []
      for (const file of newPhotos) {
        const resized = await resizeImage(file)
        const ext = resized.name.split('.').pop()
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, resized, { upsert: false })
        if (!upErr) newPhotoPaths.push(path)
      }

      const result = await updatePetProfile(petId, {
        species, name, breed, color, bio, gender,
        birth_date: birthDate, chip_id: chipId, character, allergies,
        is_neutered: isNeutered, contact_phone: contactPhone, contact_email: contactEmail,
        new_photo_paths: newPhotoPaths, delete_photo_ids: deletedPhotoIds,
      })
      if (result?.error) {
        setError(result.error)
        setSubmitting(false)
      }
    } catch (err: unknown) {
      if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err
      setError(err instanceof Error ? err.message : 'Nieznany błąd')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Species */}
      <div>
        <label className={labelCls}>{t('species') || 'Gatunek'}</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {SPECIES_LIST.map(s => (
            <button key={s.value} type="button" onClick={() => setSpecies(s.value)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition min-h-[44px] ${
                species === s.value
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}>
              <span>{s.emoji}</span><span>{ts(s.value)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Name + breed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('name')} <span className="text-red-500">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="np. Burek" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('breed')}</label>
          <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="np. Labrador" className={inputCls} />
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className={labelCls}>{t('gender')}</label>
        <div className="flex gap-2 mt-1">
          {(['unknown', 'male', 'female'] as PetGender[]).map(g => (
            <button key={g} type="button" onClick={() => setGender(g)}
              className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition ${
                gender === g
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
              }`}>
              {t(`gender_${g}` as 'gender_unknown' | 'gender_male' | 'gender_female')}
            </button>
          ))}
        </div>
      </div>

      {/* Birth date + chip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('birth_date')}</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('chip_id')}</label>
          <input type="text" value={chipId} onChange={e => setChipId(e.target.value.replace(/\D/g, '').slice(0, 15))}
            placeholder="123456789012345" maxLength={15} className={`${inputCls} font-mono`} />
        </div>
      </div>

      {/* Color */}
      <div>
        <label className={labelCls}>{t('color')}</label>
        <input value={color} onChange={e => setColor(e.target.value)} placeholder="np. czarno-biały, rudy" className={inputCls} />
      </div>

      {/* Bio */}
      <div>
        <label className={labelCls}>{t('bio') || 'Bio / historia'}</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
          placeholder="Kilka słów o pupilu — skąd pochodzi, co lubi..." className={`${inputCls} resize-none`} />
      </div>

      {/* Character */}
      <div>
        <label className={labelCls}>{t('character')}</label>
        <textarea value={character} onChange={e => setCharacter(e.target.value)} rows={2}
          placeholder="np. przyjazny, energiczny, lubi dzieci..." className={`${inputCls} resize-none`} />
      </div>

      {/* Allergies */}
      <div>
        <label className={labelCls}>{t('allergies')}</label>
        <input type="text" value={allergies} onChange={e => setAllergies(e.target.value)}
          placeholder="np. kurczak, pyłki..." className={inputCls} />
      </div>

      {/* Neutered */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setIsNeutered(n => n === true ? null : true)}
          className={`w-10 h-6 rounded-full transition-all duration-200 relative shrink-0 ${isNeutered ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${isNeutered ? 'left-5' : 'left-1'}`} />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('is_neutered')}
          {isNeutered && <span className="ml-1 text-teal-600 dark:text-teal-400 font-medium">✓</span>}
        </span>
      </div>

      {/* Photos */}
      <div>
        <label className={labelCls}>{t('photos')} (max 5)</label>

        {/* Existing photos */}
        {visibleExisting.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {visibleExisting.map(photo => (
              <div key={photo.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="w-20 h-20 object-cover rounded-xl" />
                <button type="button" onClick={() => removeExistingPhoto(photo.id)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm">×</button>
                {photo.is_primary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center rounded-b-xl py-0.5">główne</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New photo upload */}
        {visibleExisting.length + newPhotos.length < 5 && (
          <div className="mt-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-center cursor-pointer hover:border-orange-300 transition"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
            <p className="text-xl mb-0.5">📷</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dodaj zdjęcia</p>
          </div>
        )}

        {/* New photo previews */}
        {newPreviews.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {newPreviews.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl opacity-80" />
                <button type="button" onClick={() => removeNewPhoto(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm">×</button>
                <span className="absolute bottom-0 left-0 right-0 bg-orange-500/70 text-white text-[10px] text-center rounded-b-xl py-0.5">nowe</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact */}
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
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-2xl px-4 py-3">{error}</div>
      )}

      <button type="submit" disabled={submitting}
        className="w-full py-4 rounded-2xl font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 shadow-sm shadow-orange-100 dark:shadow-orange-900 transition text-base active:scale-[0.98]">
        {submitting ? '⏳ Zapisuję...' : 'Zapisz zmiany'}
      </button>
    </form>
  )
}
