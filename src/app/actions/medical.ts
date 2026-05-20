'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MedicalRecordType } from '@/lib/types'

// ── Vaccinations ─────────────────────────────────────────────

export async function addVaccination(petId: string, data: {
  name: string
  date_given: string
  next_due: string
  vet_name: string
  batch_number: string
  notes: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('pet_vaccinations').insert({
    pet_id: petId,
    user_id: user.id,
    name: data.name.trim(),
    date_given: data.date_given,
    next_due: data.next_due || null,
    vet_name: data.vet_name.trim() || null,
    batch_number: data.batch_number.trim() || null,
    notes: data.notes.trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/pets/${petId}`)
}

export async function deleteVaccination(id: string, petId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('pet_vaccinations').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath(`/pets/${petId}`)
}

// ── Medical records ───────────────────────────────────────────

export async function addMedicalRecord(petId: string, data: {
  type: MedicalRecordType
  title: string
  date: string
  vet_name: string
  clinic_name: string
  notes: string
  document_path: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('pet_medical_records').insert({
    pet_id: petId,
    user_id: user.id,
    type: data.type,
    title: data.title.trim(),
    date: data.date,
    vet_name: data.vet_name.trim() || null,
    clinic_name: data.clinic_name.trim() || null,
    notes: data.notes.trim() || null,
    document_path: data.document_path || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/pets/${petId}`)
}

export async function deleteMedicalRecord(id: string, petId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('pet_medical_records').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath(`/pets/${petId}`)
}
