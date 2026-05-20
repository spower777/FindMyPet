'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPet } from '@/app/actions/pets'
import LocationPicker from './LocationPicker'
import type { PetSpecies, PetType } from '@/lib/types'

const SPECIES: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: 'dog', label: 'Pies', emoji: '🐕' },
  { value: 'cat', label: 'Kot', emoji: '🐈' },
  { value: 'bird', label: 'Ptak', emoji: '🐦' },
  { value: 'rabbit', label: 'Królik', emoji: '🐇' },
  { value: 'other', label: 'Inne', emoji: '🐾' },
]

export default function PetForm({ type }: { type: PetType }) {
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
      // redirect throws — if it's not a redirect error, show it
      if (!msg.includes('NEXT_REDIRECT')) {
        setError(msg)
        setSubmitting(false)
      }
    }
  }

  const isLost = type === 'lost'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Species */}
      <div>
        <label className="label">Gatunek</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {SPECIES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSpecies(s.value)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                species === s.value
                  ? 'border-orange-400 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Imię / pseudonim</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="np. Burek" className="input-field" />
        </div>
        <div>
          <label className="label">Rasa</label>
          <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="np. Labrador" className="input-field" />
        </div>
      </div>

      <div>
        <label className="label">Kolor / umaszczenie</label>
        <input value={color} onChange={e => setColor(e.target.value)} placeholder="np. czarno-biały, rudy" className="input-field" />
      </div>

      <div>
        <label className="label">
          Opis <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          rows={3}
          placeholder={isLost
            ? 'Opisz zwierzę — znaki szczególne, obroża, chip...'
            : 'Opisz gdzie i kiedy znalazłeś, jak wygląda...'}
          className="input-field resize-none"
        />
      </div>

      {/* Location */}
      <div>
        <label className="label">
          {isLost ? 'Ostatnie widziane miejsce' : 'Gdzie znaleziono'} <span className="text-red-500">*</span>
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
        {address && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{address}</p>
        )}
      </div>

      {/* Photos */}
      <div>
        <label className="label">Zdjęcia (max 5)</label>
        <div
          className="mt-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-orange-300 transition"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
          <p className="text-sm text-gray-500">Kliknij lub przeciągnij zdjęcia</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — do 10 MB każde</p>
        </div>
        {previews.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {previews.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
                >
                  ×
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center rounded-b-lg">
                    główne
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Telefon kontaktowy</label>
          <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+48 123 456 789" className="input-field" />
        </div>
        <div>
          <label className="label">Email kontaktowy</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="twoj@email.pl" className="input-field" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full py-3.5 rounded-xl font-semibold text-white transition ${
          isLost
            ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
            : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
        }`}
      >
        {submitting
          ? 'Zapisuję i szukam dopasowań...'
          : isLost
          ? 'Zgłoś zagubione zwierzę'
          : 'Zgłoś znalezione zwierzę'}
      </button>
    </form>
  )
}
