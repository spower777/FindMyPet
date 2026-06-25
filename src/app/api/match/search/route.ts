import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const SEARCH_THRESHOLD = 0.35
const MAX_CANDIDATES = 15

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image, species } = await request.json()
  if (!image || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
  }

  type Photo = { storage_path: string; is_primary: boolean }
  type Candidate = {
    id: string
    name: string | null
    type: string
    species: string
    last_seen_address: string | null
    photos: Photo[]
  }

  let query = supabase
    .from('pets')
    .select('id, name, type, species, last_seen_address, photos:pet_photos(storage_path, is_primary)')
    .in('type', ['lost', 'found'])
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(MAX_CANDIDATES)

  if (species) query = (query as typeof query).eq('species', species)

  const { data: candidates } = await query as { data: Candidate[] | null }

  if (!candidates?.length) return NextResponse.json({ results: [] })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const results = []

  for (const candidate of candidates) {
    const primary = candidate.photos?.find(p => p.is_primary) ?? candidate.photos?.[0]
    if (!primary) continue

    const candidateUrl = `${supabaseUrl}/storage/v1/object/public/pet-photos/${primary.storage_path}`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Compare these two pet photos. Could they be the same animal? Rate similarity 0.0-1.0 based on: fur pattern, color, breed, distinctive markings, body shape. Return JSON only: {"score": number, "reasoning": string}',
            },
            { type: 'image_url', image_url: { url: image, detail: 'low' } },
            { type: 'image_url', image_url: { url: candidateUrl, detail: 'low' } },
          ],
        }],
        response_format: { type: 'json_object' },
        max_tokens: 150,
      })

      const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
      const score = Math.max(0, Math.min(1, Number(parsed.score) || 0))

      if (score >= SEARCH_THRESHOLD) {
        results.push({
          id: candidate.id,
          name: candidate.name,
          type: candidate.type,
          species: candidate.species,
          score,
          reasoning: String(parsed.reasoning || ''),
          photo_url: candidateUrl,
          last_seen_address: candidate.last_seen_address,
        })
      }
    } catch {
      // skip failed comparisons
    }
  }

  results.sort((a, b) => b.score - a.score)
  return NextResponse.json({ results })
}
