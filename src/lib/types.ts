export type PetType = 'lost' | 'found'
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
export type PetStatus = 'active' | 'resolved'
export type PetGender = 'male' | 'female' | 'unknown'

export interface Pet {
  id: string
  user_id: string
  type: PetType
  species: PetSpecies
  name: string | null
  breed: string | null
  description: string
  color: string | null
  gender: PetGender
  birth_date: string | null
  chip_id: string | null
  character: string | null
  allergies: string | null
  is_neutered: boolean | null
  last_seen_lat: number
  last_seen_lng: number
  last_seen_address: string | null
  contact_phone: string | null
  contact_email: string | null
  status: PetStatus
  secured_by_vet_id: string | null
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

export type ContactType = 'owner' | 'vet' | 'shelter' | 'emergency' | 'volunteer' | 'other'
export type AnimalType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'exotic' | 'other'

export interface UserContact {
  id: string
  user_id: string
  type: ContactType
  animal_type: AnimalType | null
  name: string
  phone: string | null
  email: string | null
  note: string | null
  lat: number | null
  lng: number | null
  pet_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateContactData {
  type: ContactType
  animal_type: AnimalType | null
  name: string
  phone: string
  email: string
  note: string
  pet_id?: string | null
}

export interface PetSummary {
  id: string
  name: string | null
  species: PetSpecies
}

export type VetSpecialization = 'general' | 'surgery' | 'exotic' | 'dentistry' | 'dermatology' | 'orthopedics' | 'oncology' | 'other'

export interface VetProfile {
  id: string
  user_id: string
  clinic_name: string
  vet_name: string
  specialization: VetSpecialization
  license_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  verified: boolean
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

// ── Medical history ──────────────────────────────────────────

export interface PetVaccination {
  id: string
  pet_id: string
  user_id: string
  name: string
  date_given: string
  next_due: string | null
  vet_name: string | null
  batch_number: string | null
  notes: string | null
  created_at: string
}

export type MedicalRecordType = 'visit' | 'treatment' | 'surgery' | 'test' | 'prescription' | 'other'

export interface PetMedicalRecord {
  id: string
  pet_id: string
  user_id: string
  type: MedicalRecordType
  title: string
  date: string
  vet_name: string | null
  clinic_name: string | null
  notes: string | null
  document_path: string | null
  created_at: string
}

export interface VetDocument {
  id: string
  vet_id: string
  pet_id: string
  title: string
  notes: string | null
  document_path: string
  created_at: string
  vet_profile?: { vet_name: string; clinic_name: string }
}

export interface CreateVetProfileData {
  clinic_name: string
  vet_name: string
  specialization: VetSpecialization
  license_number: string
  phone: string
  email: string
  address: string
  website: string
  lat: number | null
  lng: number | null
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
  // Profile fields (optional — added in Sprint B)
  gender?: PetGender
  birth_date?: string
  chip_id?: string
  character?: string
  allergies?: string
  is_neutered?: boolean | null
}
