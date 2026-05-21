import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { resolvePet, deletePet } from '@/app/actions/pets'
import type { Metadata } from 'next'
import type { PetWithPhotos } from '@/lib/types'
import DeletePetForm from '../profile/DeletePetForm'
import { getTranslations, getLocale } from 'next-intl/server'

export const metadata: Metadata = { title: 'PetRadar' }

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐇', other: '🐾',
}

export default async function PetRadarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()
  if (!user) return redirect({ href: '/auth/login?next=/radar', locale })

  const [t, tPet] = await Promise.all([
    getTranslations('profile'),
    getTranslations('pet'),
  ])
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const { data: pets } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('user_id', user.id)
    .in('type', ['lost', 'found'])
    .order('created_at', { ascending: false })

  function getPhotoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/pet-photos/${path}`
  }

  const reports: PetWithPhotos[] = (pets ?? []).map(pet => {
    const photos = pet.photos ?? []
    const primary = photos.find((p: { is_primary: boolean }) => p.is_primary) ?? photos[0]
    return { ...pet, photos, primary_photo_url: primary ? getPhotoUrl(primary.storage_path) : null }
  })

  const active = reports.filter(p => p.status === 'active')
  const resolved = reports.filter(p => p.status === 'resolved')

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📡 PetRadar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {active.length > 0
            ? `${active.length} aktywne · ${resolved.length} rozwiązane`
            : 'Twoje zgłoszenia zaginięć i znalezisk'}
        </p>
      </div>

      {/* CTAs */}
      <div className="flex gap-2">
        <Link
          href="/report/lost"
          className="flex-1 text-center bg-red-500 hover:bg-red-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-sm shadow-red-100 dark:shadow-red-900"
        >
          {t('add_lost')}
        </Link>
        <Link
          href="/report/found"
          className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition shadow-sm shadow-green-100 dark:shadow-green-900"
        >
          {t('add_found')}
        </Link>
      </div>

      {/* Active reports */}
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('active_reports', { n: active.length })}
          </h2>
          <div className="space-y-3">
            {active.map(pet => (
              <ReportRow key={pet.id} pet={pet} tPet={{
                lost: tPet('lost'), found: tPet('found'), resolved: tPet('resolved'),
                see: tPet('see'), mark_resolved: tPet('mark_resolved'), delete: tPet('delete'), delete_confirm: tPet('delete_confirm'),
              }} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('resolved_reports', { n: resolved.length })}
          </h2>
          <div className="space-y-3 opacity-60">
            {resolved.map(pet => (
              <ReportRow key={pet.id} pet={pet} tPet={{
                lost: tPet('lost'), found: tPet('found'), resolved: tPet('resolved'),
                see: tPet('see'), mark_resolved: tPet('mark_resolved'), delete: tPet('delete'), delete_confirm: tPet('delete_confirm'),
              }} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {reports.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">📡</p>
          <p className="font-medium text-gray-600 dark:text-gray-300">Brak zgłoszeń</p>
          <p className="text-sm mt-1">Dodaj zgłoszenie o zaginionym lub znalezionym zwierzęciu</p>
        </div>
      )}
    </div>
  )
}

interface ReportRowT {
  lost: string; found: string; resolved: string
  see: string; mark_resolved: string; delete: string; delete_confirm: string
}

function ReportRow({ pet, tPet, locale }: { pet: PetWithPhotos; tPet: ReportRowT; locale: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-2xl text-gray-300">
          {pet.primary_photo_url
            ? <Image src={pet.primary_photo_url} alt={pet.name ?? pet.species} width={64} height={64} className="object-cover w-full h-full" />
            : SPECIES_EMOJI[pet.species]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0 ${pet.type === 'lost' ? 'bg-red-400' : 'bg-green-400'}`}>
              {pet.type === 'lost' ? tPet.lost.toUpperCase() : tPet.found.toUpperCase()}
            </span>
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {SPECIES_EMOJI[pet.species]} {pet.name ?? pet.species}
              {pet.breed ? <span className="font-normal text-gray-400 dark:text-gray-500"> · {pet.breed}</span> : null}
            </p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {new Date(pet.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
            {pet.last_seen_address ? ` · ${pet.last_seen_address.split(',')[0]}` : ''}
          </p>
          {pet.status === 'resolved' && (
            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full mt-1 inline-block">
              {tPet.resolved}
            </span>
          )}
        </div>
      </div>
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <Link href={`/pets/${pet.id}`} className="flex-1 text-center text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 transition font-medium">
          {tPet.see}
        </Link>
        {pet.status === 'active' && (
          <form action={resolvePet.bind(null, pet.id)} className="flex-1 border-l border-gray-100 dark:border-gray-800">
            <button type="submit" className="w-full text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 py-2.5 transition font-medium">
              {tPet.mark_resolved}
            </button>
          </form>
        )}
        <DeletePetForm petId={pet.id} deletePetAction={deletePet} />
      </div>
    </div>
  )
}
