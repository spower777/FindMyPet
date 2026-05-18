import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/server'
import type { Pet, PetPhoto } from '@/lib/types'

const MATCH_THRESHOLD = 0.55

interface PetWithPhoto extends Pet {
  photos: PetPhoto[]
}

export async function runMatching(petId: string) {
  const supabase = createAdminClient()

  const { data: pet } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('id', petId)
    .single() as { data: PetWithPhoto | null }

  if (!pet) return

  const oppositeType = pet.type === 'lost' ? 'found' : 'lost'
  const { data: candidates } = await supabase
    .from('pets')
    .select('*, photos:pet_photos(*)')
    .eq('type', oppositeType)
    .eq('status', 'active')
    .eq('species', pet.species)
    .order('created_at', { ascending: false })
    .limit(15) as { data: PetWithPhoto[] | null }

  if (!candidates?.length) return

  const petPhotoUrl = getPrimaryPhotoUrl(pet)
  if (!petPhotoUrl) return

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  for (const candidate of candidates) {
    const candidatePhotoUrl = getPrimaryPhotoUrl(candidate)
    if (!candidatePhotoUrl) continue

    try {
      const result = await compareImages(openai, petPhotoUrl, candidatePhotoUrl)
      if (result.score >= MATCH_THRESHOLD) {
        const lostId = pet.type === 'lost' ? pet.id : candidate.id
        const foundId = pet.type === 'found' ? pet.id : candidate.id

        await supabase.from('matches').upsert({
          lost_pet_id: lostId,
          found_pet_id: foundId,
          similarity_score: result.score,
          reasoning: result.reasoning,
          status: 'pending',
        }, { onConflict: 'lost_pet_id,found_pet_id' })
      }
    } catch {
      // skip failed comparisons
    }
  }
}

function getPrimaryPhotoUrl(pet: PetWithPhoto): string | null {
  const primary = pet.photos?.find(p => p.is_primary) ?? pet.photos?.[0]
  if (!primary) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/pet-photos/${primary.storage_path}`
}

async function compareImages(
  openai: OpenAI,
  url1: string,
  url2: string
): Promise<{ score: number; reasoning: string }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Compare these two pet photos. Could they be the same animal? Rate similarity 0.0-1.0 based on: fur pattern, color, breed, distinctive markings, body shape. Return JSON only: {"score": number, "reasoning": string}',
          },
          { type: 'image_url', image_url: { url: url1, detail: 'low' } },
          { type: 'image_url', image_url: { url: url2, detail: 'low' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  })

  const content = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(content)
  return {
    score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
    reasoning: String(parsed.reasoning || ''),
  }
}
