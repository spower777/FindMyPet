import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { deletePet } from '@/app/actions/pets'
import type { Metadata } from 'next'
import type { PetWithPhotos, VetProfile } from '@/lib/types'
import DeletePetForm from './DeletePetForm'
import { getTranslations, getLocale } from 'next-intl/server'

export const metadata: Metadata = { title: 'PetBook' }

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

export default async function PetBookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/profile', locale })

  const [t, tv, tPet, tContacts] = await Promise.all([
    getTranslations('profile'),
    getTranslations('vet'),
    getTranslations('pet'),
    getTranslations('contacts_page'),
  ])
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const [{ data: pets }, { data: vetData }] = await Promise.all([
    supabase
      .from('pets')
      .select('*, photos:pet_photos(*)')
      .eq('user_id', user.id)
      .eq('type', 'profile')
      .order('created_at', { ascending: false }),
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

  const myPets: PetWithPhotos[] = (pets ?? []).map(pet => {
    const photos = pet.photos ?? []
    const primary = photos.find((p: { is_primary: boolean }) => p.is_primary) ?? photos[0]
    return { ...pet, photos, primary_photo_url: primary ? getPhotoUrl(primary.storage_path) : null }
  })

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
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
          {myPets.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              🐾 {myPets.length} {myPets.length === 1 ? 'pupil' : 'pupili'}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/pets/new"
        className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-sm shadow-orange-100 dark:shadow-orange-900"
      >
        + {t('add_pet')}
      </Link>

      {/* Pet list */}
      {myPets.length > 0 ? (
        <section className="space-y-3">
          {myPets.map(pet => (
            <PetBookRow key={pet.id} pet={pet} tSee={tPet('see')} tDelete={tPet('delete')} tConfirm={tPet('delete_confirm')} locale={locale} />
          ))}
        </section>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">📖</p>
          <p className="font-medium text-gray-600 dark:text-gray-300">Brak pupili w PetBook</p>
          <p className="text-sm mt-1">Dodaj pierwszego pupila powyżej</p>
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
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 font-medium">
                  ⚕️ {tv(`spec_${vetProfile.specialization}` as `spec_${typeof vetProfile.specialization}`)}
                </p>
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

      {/* Contacts link */}
      <Link
        href="/contacts"
        className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 hover:border-orange-200 dark:hover:border-orange-800 transition group"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{t('contacts')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{tContacts('subtitle')}</p>
          </div>
        </div>
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-orange-400 transition text-lg">→</span>
      </Link>
    </div>
  )
}

function PetBookRow({
  pet, tSee, tDelete, tConfirm, locale,
}: {
  pet: PetWithPhotos; tSee: string; tDelete: string; tConfirm: string; locale: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-2xl text-gray-300">
          {pet.primary_photo_url
            ? <Image src={pet.primary_photo_url} alt={pet.name ?? pet.species} width={64} height={64} className="object-cover w-full h-full" />
            : SPECIES_EMOJI[pet.species]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
            {pet.breed ? <span className="font-normal text-gray-400 dark:text-gray-500"> · {pet.breed}</span> : null}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {pet.birth_date
              ? (() => {
                  const months = Math.floor((Date.now() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.5))
                  return months >= 12 ? `${Math.floor(months / 12)} lat` : `${months} mies.`
                })()
              : new Date(pet.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
            {pet.chip_id ? ` · 🔖 ${pet.chip_id}` : ''}
          </p>
        </div>
      </div>
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <Link href={`/pets/${pet.id}`} className="flex-1 text-center text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 transition font-medium">
          {tSee}
        </Link>
        <DeletePetForm petId={pet.id} deletePetAction={deletePet} />
      </div>
    </div>
  )
}
