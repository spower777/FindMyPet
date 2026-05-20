'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function startConversation(petId: string, petOwnerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/pets/${petId}`)
  if (user.id === petOwnerId) return

  const { data, error } = await supabase
    .from('conversations')
    .upsert({ pet_id: petId, pet_owner_id: petOwnerId, inquirer_id: user.id },
      { onConflict: 'pet_id,inquirer_id' })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message)
  redirect(`/chat/${data.id}`)
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const trimmed = content.trim()
  if (!trimmed) return

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  })

  revalidatePath(`/chat/${conversationId}`)
}
