import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { resolvePet, deletePet } from '@/app/actions/pets'
import type { Metadata } from 'next'
import type { PetWithPhotos, UserContact, VetProfile } from '@/lib/types'
import DeletePetForm from './DeletePetForm'
import AddContactForm from './AddContactForm'
import DeleteContactButton from './DeleteContactButton'
import { getTranslations } from 'next-intl/server'

export const metadata: Metadata = { title: 'Mój profil' }

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

const CONTACT_TYPE_META: Record<string, { emoji: string; color: string }> = {
  owner:     { emoji: '👤', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
  vet:       { emoji: '🏥', color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300' },
  shelter:   { emoji: '🏠', color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
  emergency: { emoji: '🚨', color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
  other:     { emoji: '📋', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/profile')

  const t = await getTranslations('profile')
  const tc = await getTranslations('contact_types')
  const tv = await getTranslations('vet')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const [{ data: pets }, { data: contacts }, { data: vetData }] = await Promise.all([
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
    supabase
      .from('vet_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  const vetProfile = vetData as VetProfile | null

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
    <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-4xl shrink-0 shadow-md overflow-hidden">
          {user.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt="avatar" width={80} height={80} className="rounded-2xl w-full h-full object-cover" />
          ) : '🐾'}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {user.user_metadata?.full_name ?? user.email}
            </h1>
            {vetProfile && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                vetProfile.verified
                  ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
              }`}>
                🏥 {tv('badge')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{petsWithPhotos.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('total')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-orange-500">{active.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('active')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-green-500">{resolved.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('resolved')}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/report/lost" className="flex-1 text-center bg-red-500 hover:bg-red-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-sm shadow-red-100">
          {t('add_lost')}
        </Link>
        <Link href="/report/found" className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-sm shadow-green-100">
          {t('add_found')}
        </Link>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('active_reports', { n: active.length })}</h2>
          <div className="space-y-3">
            {active.map(pet => <PetRow key={pet.id} pet={pet} />)}
          </div>
        </section>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('resolved_reports', { n: resolved.length })}</h2>
          <div className="space-y-3 opacity-60">
            {resolved.map(pet => <PetRow key={pet.id} pet={pet} />)}
          </div>
        </section>
      )}

      {petsWithPhotos.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-3">🐾</p>
          <p className="font-medium">{t('no_reports')}</p>
          <p className="text-sm mt-1">{t('no_reports_hint')}</p>
        </div>
      )}

      {/* Vet section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">🏥 {tv('title')}</h2>
          <Link
            href="/vet"
            className="text-sm text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-xl hover:bg-green-50 dark:hover:bg-green-950 transition"
          >
            {vetProfile ? tv('edit_profile') : tv('register_cta')}
          </Link>
        </div>
        {vetProfile && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{vetProfile.clinic_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{vetProfile.vet_name}</p>
                {vetProfile.phone && <p className="text-xs text-orange-500 mt-1">📞 {vetProfile.phone}</p>}
                {vetProfile.address && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">📍 {vetProfile.address}</p>}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                vetProfile.verified
                  ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                  : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
              }`}>
                {vetProfile.verified ? `✓ ${tv('verified')}` : `⏳ ${tv('pending_verification')}`}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Contacts */}
      <section>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('contacts')}</h2>
        <div className="space-y-2 mb-3">
          {userContacts.map(contact => {
            const meta = CONTACT_TYPE_META[contact.type] ?? CONTACT_TYPE_META.other
            return (
              <div key={contact.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.emoji} {tc(contact.type as 'owner' | 'vet' | 'shelter' | 'emergency' | 'other')}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{contact.name}</p>
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
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{contact.note}</p>
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-2xl text-gray-300">
          {pet.primary_photo_url ? (
            <Image src={pet.primary_photo_url} alt={pet.name ?? pet.species} width={64} height={64} className="object-cover w-full h-full" />
          ) : SPECIES_EMOJI[pet.species]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${pet.type === 'lost' ? 'bg-red-500' : 'bg-green-500'}`}>
              {pet.type === 'lost' ? 'Zaginął' : 'Znaleziony'}
            </span>
            {pet.status === 'resolved' && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Rozwiązane</span>
            )}
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">
            {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
            {pet.breed ? ` (${pet.breed})` : ''}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(pet.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
            {pet.last_seen_address && ` • ${pet.last_seen_address.split(',')[0]}`}
          </p>
        </div>
      </div>
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <Link href={`/pets/${pet.id}`} className="flex-1 text-center text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 transition font-medium">
          Zobacz
        </Link>
        {pet.status === 'active' && (
          <form action={resolvePet.bind(null, pet.id)} className="flex-1 border-l border-gray-100 dark:border-gray-800">
            <button type="submit" className="w-full text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 py-2.5 transition font-medium">
              Rozwiązane ✓
            </button>
          </form>
        )}
        <DeletePetForm petId={pet.id} deletePetAction={deletePet} />
      </div>
    </div>
  )
}
