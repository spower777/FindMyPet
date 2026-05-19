'use server'

import { createClient } from '@/lib/supabase/server'
import { runMatching } from '@/lib/matching'
import { sendPetAlert } from '@/lib/push'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CreatePetData } from '@/lib/types'

export async function createPet(data: CreatePetData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: pet, error } = await supabase
    .from('pets')
    .insert({
      user_id: user.id,
      type: data.type,
      species: data.species,
      name: data.name || null,
      breed: data.breed || null,
      color: data.color || null,
      description: data.description,
      last_seen_lat: data.last_seen_lat,
      last_seen_lng: data.last_seen_lng,
      last_seen_address: data.last_seen_address || null,
      contact_phone: data.contact_phone || null,
      contact_email: data.contact_email || user.email,
    })
    .select()
    .single()

  if (error || !pet) throw new Error(error?.message ?? 'Błąd podczas zapisu')

  if (data.photo_paths.length > 0) {
    await supabase.from('pet_photos').insert(
      data.photo_paths.map((path, i) => ({
        pet_id: pet.id,
        storage_path: path,
        is_primary: i === 0,
      }))
    )
  }

  // Run AI matching + send push notifications (best-effort)
  try {
    await Promise.all([
      runMatching(pet.id),
      sendPetAlert(pet.last_seen_lat, pet.last_seen_lng, {
        title: pet.type === 'lost' ? 'Zaginęło zwierzę w pobliżu!' : 'Znaleziono zwierzę w pobliżu!',
        body: `${pet.species}${pet.name ? ` — ${pet.name}` : ''}. Sprawdź mapę.`,
        url: `/pets/${pet.id}`,
      }),
    ])
  } catch {
    // non-blocking — pet is already saved
  }

  revalidatePath('/')
  redirect(`/pets/${pet.id}`)
}

export async function resolvePet(petId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('pets')
    .update({ status: 'resolved' })
    .eq('id', petId)
    .eq('user_id', user.id)

  revalidatePath('/')
  revalidatePath(`/pets/${petId}`)
}

export async function deletePet(petId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('pets').delete().eq('id', petId).eq('user_id', user.id)

  revalidatePath('/')
  redirect('/profile')
}

export async function updateMatchStatus(matchId: string, status: 'accepted' | 'rejected') {
  const supabase = await createClient()
  await supabase.from('matches').update({ status }).eq('id', matchId)
  revalidatePath('/')
}
