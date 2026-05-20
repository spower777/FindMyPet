import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription, lat, lng } = await request.json()
  if (!subscription) return NextResponse.json({ error: 'subscription required' }, { status: 400 })

  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    subscription,
    lat: lat ?? null,
    lng: lng ?? null,
  }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
