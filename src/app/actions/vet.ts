'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateVetProfileData } from '@/lib/types'

export async function findPetByChipOrName(query: string): Promise<{ id: string; name: string | null; species: string; chip_id: string | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Exact chip match first, then name contains
  const trimmed = query.trim()
  if (!trimmed) return null

  const { data: byChip } = await supabase
    .from('pets')
    .select('id, name, species, chip_id')
    .eq('chip_id', trimmed)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (byChip) return byChip

  const { data: byName } = await supabase
    .from('pets')
    .select('id, name, species, chip_id')
    .ilike('name', `%${trimmed}%`)
    .eq('status', 'active')
    .limit(1)
    .single()

  return byName ?? null
}

export async function uploadVetDocument(petId: string, data: {
  title: string
  notes: string
  document_path: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: vetProfile } = await supabase
    .from('vet_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vetProfile) throw new Error('Brak profilu weterynarza')

  const { error } = await supabase.from('vet_documents').insert({
    vet_id: vetProfile.id,
    pet_id: petId,
    title: data.title.trim(),
    notes: data.notes.trim() || null,
    document_path: data.document_path,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/pets/${petId}`)
  revalidatePath('/vet')
}

export async function deleteVetDocument(id: string, petId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('vet_documents').delete().eq('id', id)
  revalidatePath(`/pets/${petId}`)
  revalidatePath('/vet')
}

export async function upsertVetProfile(data: CreateVetProfileData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('vet_profiles')
    .upsert({
      user_id: user.id,
      clinic_name: data.clinic_name,
      vet_name: data.vet_name,
      specialization: data.specialization,
      license_number: data.license_number || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      website: data.website || null,
      lat: data.lat,
      lng: data.lng,
    }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
  revalidatePath('/vet')
}

export async function secureAnimal(petId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: vetProfile } = await supabase
    .from('vet_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vetProfile) throw new Error('No vet profile')

  const { error } = await supabase
    .from('pets')
    .update({ secured_by_vet_id: vetProfile.id })
    .eq('id', petId)

  if (error) throw new Error(error.message)

  revalidatePath(`/pets/${petId}`)
}
