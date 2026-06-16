import { createClient } from '@/lib/supabase/server'
import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import EditPetProfileForm from '@/components/EditPetProfileForm'
import type { Metadata } from 'next'
import type { PetSpecies, PetGender } from '@/lib/types'

export const metadata: Metadata = { title: 'Edytuj profil — FindMyPet' }

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const locale = await getLocale()

  if (!user) return redirect({ href: `/auth/login?next=/pets/${id}/edit`, locale })

  const { data: pet } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('id', id)
    .eq('type', 'profile')
    .single()

  if (!pet || pet.user_id !== user.id) notFound()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const existingPhotos = (pet.photos ?? []).map((p: { id: string; storage_path: string; is_primary: boolean }) => ({
    id: p.id,
    url: `${supabaseUrl}/storage/v1/object/public/pet-photos/${p.storage_path}`,
    is_primary: p.is_primary,
  }))

  const petName = pet.name ?? pet.species

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/pets/${id}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">←</Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">✏️ Edytuj profil</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{petName}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 sm:p-6">
        <EditPetProfileForm
          petId={id}
          initialData={{
            species: pet.species as PetSpecies,
            name: pet.name ?? '',
            breed: pet.breed ?? '',
            color: pet.color ?? '',
            bio: pet.description ?? '',
            gender: (pet.gender ?? 'unknown') as PetGender,
            birth_date: pet.birth_date ?? '',
            chip_id: pet.chip_id ?? '',
            character: pet.character ?? '',
            allergies: pet.allergies ?? '',
            is_neutered: pet.is_neutered ?? null,
            contact_phone: pet.contact_phone ?? '',
            contact_email: pet.contact_email ?? '',
          }}
          existingPhotos={existingPhotos}
        />
      </div>
    </div>
  )
}
