'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateVetProfileData } from '@/lib/types'

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
