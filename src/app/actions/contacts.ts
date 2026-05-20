'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateContactData } from '@/lib/types'

export async function createContact(data: CreateContactData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('user_contacts').insert({
    user_id: user.id,
    type: data.type,
    animal_type: data.animal_type,
    name: data.name.trim(),
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    note: data.note.trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
  revalidatePath('/contacts')
}

export async function updateContact(contactId: string, data: CreateContactData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('user_contacts')
    .update({
      type: data.type,
      animal_type: data.animal_type,
      name: data.name.trim(),
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      note: data.note.trim() || null,
    })
    .eq('id', contactId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
  revalidatePath('/contacts')
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('user_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', user.id)

  revalidatePath('/profile')
  revalidatePath('/contacts')
}
