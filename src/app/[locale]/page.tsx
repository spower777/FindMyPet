import { createClient } from '@/lib/supabase/server'
import HomeClient from '@/components/HomeClient'
import type { PetWithPhotos, VetProfile, UserContact } from '@/lib/types'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const [{ data: pets }, { data: vetsData }, { data: contactsData }] = await Promise.all([
    supabase
      .from('pets')
      .select('*, photos:pet_photos(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('vet_profiles')
      .select('*')
      .not('lat', 'is', null)
      .not('lng', 'is', null),
    user
      ? supabase
          .from('user_contacts')
          .select('*')
          .eq('user_id', user.id)
          .not('lat', 'is', null)
          .not('lng', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  const petsWithUrls: PetWithPhotos[] = (pets ?? []).map(pet => {
    const primary = (pet.photos ?? []).find((p: { is_primary: boolean }) => p.is_primary) ?? pet.photos?.[0]
    return {
      ...pet,
      photos: pet.photos ?? [],
      primary_photo_url: primary
        ? `${supabaseUrl}/storage/v1/object/public/pet-photos/${primary.storage_path}`
        : null,
    }
  })

  return (
    <HomeClient
      pets={petsWithUrls}
      vets={(vetsData ?? []) as VetProfile[]}
      contacts={(contactsData ?? []) as UserContact[]}
    />
  )
}
