import { NextResponse } from 'next/server'
import { runMatching } from '@/lib/matching'

export async function POST(request: Request) {
  const { pet_id } = await request.json()
  if (!pet_id) return NextResponse.json({ error: 'pet_id required' }, { status: 400 })

  await runMatching(pet_id)
  return NextResponse.json({ ok: true })
}
