export type PetType = 'lost' | 'found'
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
export type PetStatus = 'active' | 'resolved'

export interface Pet {
  id: string
  user_id: string
  type: PetType
  species: PetSpecies
  name: string | null
  breed: string | null
  description: string
  color: string | null
  last_seen_lat: number
  last_seen_lng: number
  last_seen_address: string | null
  contact_phone: string | null
  contact_email: string | null
  status: PetStatus
  created_at: string
  updated_at: string
}

export interface PetPhoto {
  id: string
  pet_id: string
  storage_path: string
  is_primary: boolean
  created_at: string
}

export interface PetWithPhotos extends Pet {
  photos: PetPhoto[]
  primary_photo_url: string | null
}

export interface Match {
  id: string
  lost_pet_id: string
  found_pet_id: string
  similarity_score: number
  reasoning: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  lost_pet?: PetWithPhotos
  found_pet?: PetWithPhotos
}

export interface ProfileSummary {
  id: string
  email: string | null
  full_name: string | null
}

export interface ConversationPetSummary {
  id: string
  name: string | null
  species: PetSpecies
  type: PetType
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface ChatMessagePreview {
  content: string
  created_at: string
  sender_id: string
}

export interface ConversationListItem {
  id: string
  created_at: string
  updated_at: string
  pet: ConversationPetSummary | null
  pet_owner: ProfileSummary | null
  inquirer: ProfileSummary | null
  messages: ChatMessagePreview[] | null
}

export interface ConversationDetail {
  id: string
  pet: ConversationPetSummary | null
  pet_owner: ProfileSummary | null
  inquirer: ProfileSummary | null
}

export type ContactType = 'owner' | 'vet' | 'shelter' | 'emergency' | 'other'

export interface UserContact {
  id: string
  user_id: string
  type: ContactType
  name: string
  phone: string | null
  email: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface CreateContactData {
  type: ContactType
  name: string
  phone: string
  email: string
  note: string
}

export interface CreatePetData {
  type: PetType
  species: PetSpecies
  name: string
  breed: string
  color: string
  description: string
  last_seen_lat: number
  last_seen_lng: number
  last_seen_address: string
  contact_phone: string
  contact_email: string
  photo_paths: string[]
}
