'use client'

import { divIcon } from 'leaflet'
import { Link } from '@/i18n/navigation'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useTranslations } from 'next-intl'
import type { PetWithPhotos, VetProfile, UserContact } from '@/lib/types'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

const ANIMAL_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', exotic: '🦎', other: '🐾',
}

interface Props {
  pets?: PetWithPhotos[]
  vets?: VetProfile[]
  contacts?: UserContact[]
  defaultCenter?: [number, number]
  defaultZoom?: number
  interactive?: boolean
}

function makeReportIcon(type: 'lost' | 'found') {
  const color = type === 'lost' ? '#ef4444' : '#22c55e'
  const border = type === 'lost' ? '#b91c1c' : '#15803d'
  return divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -24],
  })
}

function makeVetIcon() {
  return divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2.5px solid #1d4ed8;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:8px">🏥</div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  })
}

function makeContactIcon() {
  return divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#6b7280;border:2px solid #374151;box-shadow:0 1px 3px rgba(0,0,0,0.25)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  })
}

export default function LeafletMap({
  pets = [],
  vets = [],
  contacts = [],
  defaultCenter = [52.2297, 21.0122],
  defaultZoom = 12,
  interactive = true,
}: Props) {
  const t = useTranslations('pet')
  const tv = useTranslations('vet')
  const ta = useTranslations('animal_types')

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full flex-1 min-h-[400px] z-0"
      style={{ height: '100%' }}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Report markers */}
      {pets.map(pet => (
        <Marker
          key={pet.id}
          position={[pet.last_seen_lat, pet.last_seen_lng]}
          icon={makeReportIcon(pet.type)}
        >
          <Popup maxWidth={220}>
            <div className="min-w-[180px]">
              {pet.primary_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.primary_photo_url}
                  alt={pet.name ?? pet.species}
                  className="w-full h-28 object-cover rounded mb-2"
                />
              )}
              <div className={`text-xs font-bold uppercase mb-1 ${pet.type === 'lost' ? 'text-red-600' : 'text-green-600'}`}>
                {pet.type === 'lost' ? `🔴 ${t('lost')}` : `🟢 ${t('found')}`}
              </div>
              <p className="font-semibold text-sm text-gray-900">
                {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
                {pet.breed ? ` (${pet.breed})` : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{pet.description}</p>
              <Link
                href={`/pets/${pet.id}`}
                className="mt-2 block text-center text-xs bg-orange-500 text-white py-1.5 px-3 rounded font-medium hover:bg-orange-600 transition"
              >
                {t('see')} →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Vet markers */}
      {vets.filter(v => v.lat && v.lng).map(vet => (
        <Marker
          key={vet.id}
          position={[vet.lat!, vet.lng!]}
          icon={makeVetIcon()}
        >
          <Popup maxWidth={200}>
            <div className="min-w-[160px]">
              <div className="text-xs font-bold text-blue-600 mb-1">🏥 {tv('badge')}</div>
              <p className="font-semibold text-sm text-gray-900">{vet.clinic_name}</p>
              <p className="text-xs text-gray-600">{vet.vet_name}</p>
              {vet.phone && (
                <a href={`tel:${vet.phone}`} className="text-xs text-orange-500 hover:underline block mt-1">
                  📞 {vet.phone}
                </a>
              )}
              {vet.address && <p className="text-xs text-gray-500 mt-0.5">📍 {vet.address}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Contact markers */}
      {contacts.filter(c => c.lat && c.lng).map(contact => (
        <Marker
          key={contact.id}
          position={[contact.lat!, contact.lng!]}
          icon={makeContactIcon()}
        >
          <Popup maxWidth={180}>
            <div className="min-w-[140px]">
              <p className="font-semibold text-sm text-gray-900">{contact.name}</p>
              {contact.animal_type && (
                <p className="text-xs text-gray-500">{ANIMAL_EMOJI[contact.animal_type]} {ta(contact.animal_type as 'dog' | 'cat' | 'bird' | 'rabbit' | 'exotic' | 'other')}</p>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="text-xs text-orange-500 hover:underline block mt-1">
                  📞 {contact.phone}
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
