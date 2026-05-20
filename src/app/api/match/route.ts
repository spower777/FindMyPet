import { NextResponse } from 'next/server'
import { runMatching } from '@/lib/matching'

export async function POST(request: Request) {
  const configuredSecret = process.env.MATCH_API_SECRET
  const providedSecret = request.headers.get('x-match-secret')
    ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!configuredSecret) {
    return NextResponse.json({ error: 'MATCH_API_SECRET not configured' }, { status: 503 })
  }

  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pet_id } = await request.json()
  if (!pet_id) return NextResponse.json({ error: 'pet_id required' }, { status: 400 })

  await runMatching(pet_id)
  return NextResponse.json({ ok: true })
}
