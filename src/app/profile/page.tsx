import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { resolvePet, deletePet } from '@/app/actions/pets'
import type { Metadata } from 'next'
import type { PetWithPhotos, UserContact } from '@/lib/types'
import DeletePetForm from './DeletePetForm'
import AddContactForm from './AddContactForm'
import DeleteContactButton from './DeleteContactButton'

export const metadata: Metadata = { title: 'Mój profil' }

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

const CONTACT_TYPE_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
  owner:     { label: 'Właściciel',        emoji: '👤', color: 'bg-blue-100 text-blue-700' },
  vet:       { label: 'Weterynarz',        emoji: '🏥', color: 'bg-green-100 text-green-700' },
  shelter:   { label: 'Schronisko',        emoji: '🏠', color: 'bg-purple-100 text-purple-700' },
  emergency: { label: 'Kontakt awaryjny',  emoji: '🚨', color: 'bg-red-100 text-red-700' },
  other:     { label: 'Inny',              emoji: '📋', color: 'bg-gray-100 text-gray-600' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/profile')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const [{ data: pets }, { data: contacts }] = await Promise.all([
    supabase
      .from('pets')
      .select('*, photos:pet_photos(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  function getPhotoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/pet-photos/${path}`
  }

  const petsWithPhotos: PetWithPhotos[] = (pets ?? []).map(pet => {
    const photos = pet.photos ?? []
    const primary = photos.find((p: { is_primary: boolean }) => p.is_primary) ?? photos[0]
    return { ...pet, photos, primary_photo_url: primary ? getPhotoUrl(primary.storage_path) : null }
  })

  const active = petsWithPhotos.filter(p => p.status === 'active')
  const resolved = petsWithPhotos.filter(p => p.status === 'resolved')
  const userContacts = (contacts ?? []) as UserContact[]

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-2xl shrink-0">
          {user.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt="avatar" width={56} height={56} className="rounded-full" />
          ) : '🐾'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {user.user_metadata?.full_name ?? user.email}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{petsWithPhotos.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Wszystkich</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{active.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aktywnych</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{resolved.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Rozwiązanych</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/report/lost" className="flex-1 text-center bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm transition">
          + Zaginął
        </Link>
        <Link href="/report/found" className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition">
          + Znaleziony
        </Link>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Aktywne zgłoszenia ({active.length})</h2>
          <div className="space-y-3">
            {active.map(pet => <PetRow key={pet.id} pet={pet} />)}
          </div>
        </section>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-500 mb-3">Rozwiązane ({resolved.length})</h2>
          <div className="space-y-3 opacity-60">
            {resolved.map(pet => <PetRow key={pet.id} pet={pet} />)}
          </div>
        </section>
      )}

      {petsWithPhotos.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-3">🐾</p>
          <p className="font-medium">Brak zgłoszeń</p>
          <p className="text-sm mt-1">Dodaj pierwsze zgłoszenie powyżej</p>
        </div>
      )}

      {/* Contacts */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-3">Kontakty</h2>
        <div className="space-y-2 mb-3">
          {userContacts.map(contact => {
            const meta = CONTACT_TYPE_LABEL[contact.type] ?? CONTACT_TYPE_LABEL.other
            return (
              <div key={contact.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-xs text-orange-500 hover:underline block mt-0.5">
                        📞 {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-xs text-orange-500 hover:underline block mt-0.5">
                        ✉️ {contact.email}
                      </a>
                    )}
                    {contact.note && (
                      <p className="text-xs text-gray-400 mt-1">{contact.note}</p>
                    )}
                  </div>
                  <DeleteContactButton contactId={contact.id} />
                </div>
              </div>
            )
          })}
        </div>
        <AddContactForm />
      </section>
    </div>
  )
}

function PetRow({ pet }: { pet: PetWithPhotos }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Photo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center text-2xl text-gray-300">
          {pet.primary_photo_url ? (
            <Image src={pet.primary_photo_url} alt={pet.name ?? pet.species} width={64} height={64} className="object-cover w-full h-full" />
          ) : SPECIES_EMOJI[pet.species]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'}`}>
              {pet.type === 'lost' ? 'Zaginął' : 'Znaleziony'}
            </span>
            {pet.status === 'resolved' && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Rozwiązane</span>
            )}
          </div>
          <p className="font-semibold text-gray-900 mt-1 truncate">
            {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
            {pet.breed ? ` (${pet.breed})` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(pet.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
            {pet.last_seen_address && ` • ${pet.last_seen_address.split(',')[0]}`}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100">
        <Link
          href={`/pets/${pet.id}`}
          className="flex-1 text-center text-xs text-gray-600 hover:bg-gray-50 py-2.5 transition font-medium"
        >
          Zobacz
        </Link>
        {pet.status === 'active' && (
          <form action={resolvePet.bind(null, pet.id)} className="flex-1 border-l border-gray-100">
            <button type="submit" className="w-full text-xs text-green-600 hover:bg-green-50 py-2.5 transition font-medium">
              Rozwiązane ✓
            </button>
          </form>
        )}
        <DeletePetForm petId={pet.id} deletePetAction={deletePet} />
      </div>
    </div>
  )
}
