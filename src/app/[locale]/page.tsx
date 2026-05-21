import { createClient } from '@/lib/supabase/server'
import HomeClient from '@/components/HomeClient'
import type { PetWithPhotos, VetProfile, UserContact, PetVaccination, PetMedicalRecord } from '@/lib/types'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  function photoUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/pet-photos/${path}`
  }

  // Radar: recent active lost/found reports (public, always)
  const { data: radarData, count: radarCount } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)', { count: 'exact' })
    .in('type', ['lost', 'found'])
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4)

  const radarPets: PetWithPhotos[] = (radarData ?? []).map(p => {
    const ph = (p.photos ?? []).find((x: { is_primary: boolean }) => x.is_primary) ?? (p.photos ?? [])[0]
    return { ...p, photos: p.photos ?? [], primary_photo_url: ph ? photoUrl(ph.storage_path) : null }
  })

  // Vets & public contacts for potential map use
  const { data: vetsData } = await supabase
    .from('vet_profiles')
    .select('*')
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  // Logged-in user data
  let primaryPet: PetWithPhotos | null = null
  let vaccinations: PetVaccination[] = []
  let medicalRecords: PetMedicalRecord[] = []
  let userContacts: UserContact[] = []

  if (user) {
    const { data: userPets } = await supabase
      .from('pets')
      .select('*, photos:pet_photos(*)')
      .eq('user_id', user.id)
      .eq('type', 'profile')
      .order('created_at', { ascending: true })
      .limit(1)

    if (userPets && userPets.length > 0) {
      const raw = userPets[0]
      const ph = (raw.photos ?? []).find((x: { is_primary: boolean }) => x.is_primary) ?? (raw.photos ?? [])[0]
      primaryPet = { ...raw, photos: raw.photos ?? [], primary_photo_url: ph ? photoUrl(ph.storage_path) : null }

      const petId = raw.id
      const [{ data: vaxData }, { data: medData }] = await Promise.all([
        supabase.from('pet_vaccinations').select('*').eq('pet_id', petId).order('date_given', { ascending: false }).limit(5),
        supabase.from('pet_medical_records').select('*').eq('pet_id', petId).order('date', { ascending: false }).limit(5),
      ])
      vaccinations = (vaxData ?? []) as PetVaccination[]
      medicalRecords = (medData ?? []) as PetMedicalRecord[]
    }

    const { data: contactsData } = await supabase
      .from('user_contacts')
      .select('*')
      .eq('user_id', user.id)
      .limit(5)
    userContacts = (contactsData ?? []) as UserContact[]
  }

  return (
    <HomeClient
      user={user ? { id: user.id, email: user.email ?? '' } : null}
      primaryPet={primaryPet}
      vaccinations={vaccinations}
      medicalRecords={medicalRecords}
      userContacts={userContacts}
      radarPets={radarPets}
      radarActiveCount={radarCount ?? 0}
      vets={(vetsData ?? []) as VetProfile[]}
    />
  )
}
