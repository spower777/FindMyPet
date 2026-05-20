'use client'

import { useState } from 'react'
import { upsertVetProfile } from '@/app/actions/vet'
import { useTranslations } from 'next-intl'
import type { VetProfile, VetSpecialization } from '@/lib/types'
import LocationPicker from '@/components/LocationPicker'

const SPECIALIZATIONS: VetSpecialization[] = [
  'general', 'surgery', 'exotic', 'dentistry', 'dermatology', 'orthopedics', 'oncology', 'other',
]

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

export default function VetForm({ existing }: { existing: VetProfile | null }) {
  const t = useTranslations('vet')
  const [clinicName, setClinicName] = useState(existing?.clinic_name ?? '')
  const [vetName, setVetName] = useState(existing?.vet_name ?? '')
  const [specialization, setSpecialization] = useState<VetSpecialization>(existing?.specialization ?? 'general')
  const [licenseNumber, setLicenseNumber] = useState(existing?.license_number ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [websiteRaw, setWebsiteRaw] = useState(
    existing?.website ? existing.website.replace(/^https?:\/\//i, '') : ''
  )
  const [websiteError, setWebsiteError] = useState<string | null>(null)
  const [lat, setLat] = useState<number | null>(existing?.lat ?? null)
  const [lng, setLng] = useState<number | null>(existing?.lng ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const specKey: Record<VetSpecialization, string> = {
    general: t('spec_general'),
    surgery: t('spec_surgery'),
    exotic: t('spec_exotic'),
    dentistry: t('spec_dentistry'),
    dermatology: t('spec_dermatology'),
    orthopedics: t('spec_orthopedics'),
    oncology: t('spec_oncology'),
    other: t('spec_other'),
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setWebsiteError(null)

    let normalizedWebsite = ''
    if (websiteRaw.trim()) {
      const normalized = normalizeUrl(websiteRaw)
      if (!normalized || !isValidUrl(normalized)) {
        setWebsiteError(t('website_invalid'))
        return
      }
      normalizedWebsite = normalized
    }

    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await upsertVetProfile({
        clinic_name: clinicName,
        vet_name: vetName,
        specialization,
        license_number: licenseNumber,
        phone,
        email,
        address,
        website: normalizedWebsite,
        lat,
        lng,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'input-field'
  const labelCls = 'label'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('clinic_name')} <span className="text-red-500">*</span></label>
          <input
            value={clinicName}
            onChange={e => setClinicName(e.target.value)}
            required
            placeholder="np. Klinika Weterynaryjna Petzdrowie"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t('vet_name')} <span className="text-red-500">*</span></label>
          <input
            value={vetName}
            onChange={e => setVetName(e.target.value)}
            required
            placeholder="np. dr Jan Kowalski"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>{t('specialization')}</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {SPECIALIZATIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSpecialization(s)}
              className={`px-3 py-2 rounded-xl border text-sm font-medium transition min-h-[40px] ${
                specialization === s
                  ? 'border-green-400 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {specKey[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>{t('license_number')}</label>
        <input
          value={licenseNumber}
          onChange={e => setLicenseNumber(e.target.value)}
          placeholder="np. PL-WAR-12345"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('phone')}</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+48 123 456 789" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t('email')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="klinika@email.pl" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>{t('address')}</label>
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="ul. Przykładowa 1, Warszawa" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>{t('website')}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none pointer-events-none">https://</span>
          <input
            value={websiteRaw}
            onChange={e => { setWebsiteRaw(e.target.value); setWebsiteError(null) }}
            placeholder="klinika.pl"
            className={`${inputCls} pl-16`}
          />
        </div>
        {websiteError && <p className="text-xs text-red-500 mt-1">{websiteError}</p>}
      </div>

      <div>
        <label className={labelCls}>{t('location')}</label>
        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng, newAddress) => {
            setLat(newLat)
            setLng(newLng)
            if (!address && newAddress) setAddress(newAddress)
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm rounded-2xl px-4 py-3">
          ✓ {t('saved')}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 rounded-2xl font-semibold text-white bg-green-500 hover:bg-green-600 disabled:bg-green-300 transition text-base active:scale-[0.98] shadow-sm shadow-green-100 dark:shadow-green-900"
      >
        {saving ? t('saving') : t('save')}
      </button>
    </form>
  )
}
