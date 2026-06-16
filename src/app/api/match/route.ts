import { NextResponse } from 'next/server'
import { runMatching } from '@/lib/matching'

// In-memory rate limit: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

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

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { pet_id } = await request.json()
  if (!pet_id) return NextResponse.json({ error: 'pet_id required' }, { status: 400 })

  await runMatching(pet_id)
  return NextResponse.json({ ok: true })
}
