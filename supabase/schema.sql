-- FindMyPet database schema
-- Run this in Supabase SQL editor

-- Profiles (auto-created on signup)
create table if not exists profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Pets (lost or found reports)
create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('lost', 'found')) not null,
  species text check (species in ('dog', 'cat', 'bird', 'rabbit', 'other')) not null,
  name text,
  breed text,
  color text,
  description text not null,
  last_seen_lat double precision not null,
  last_seen_lng double precision not null,
  last_seen_address text,
  contact_phone text,
  contact_email text,
  status text check (status in ('active', 'resolved')) default 'active' not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pet photos
create table if not exists pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade not null,
  storage_path text not null,
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- AI-suggested matches
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  lost_pet_id uuid references pets(id) on delete cascade not null,
  found_pet_id uuid references pets(id) on delete cascade not null,
  similarity_score float not null,
  reasoning text,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamptz default now(),
  unique (lost_pet_id, found_pet_id)
);

-- Web Push subscriptions with location
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  subscription jsonb not null,
  lat double precision,
  lng double precision,
  created_at timestamptz default now(),
  unique (user_id)
);

-- Conversations between pet owners and inquirers
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade not null,
  pet_owner_id uuid references profiles(id) on delete cascade not null,
  inquirer_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (pet_id, inquirer_id),
  check (pet_owner_id <> inquirer_id)
);

-- Chat messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  created_at timestamptz default now()
);

create index if not exists conversations_pet_owner_idx on conversations(pet_owner_id);
create index if not exists conversations_inquirer_idx on conversations(inquirer_id);
create index if not exists conversations_pet_idx on conversations(pet_id);
create index if not exists messages_conversation_created_idx on messages(conversation_id, created_at);

-- RLS
alter table profiles enable row level security;
alter table pets enable row level security;
alter table pet_photos enable row level security;
alter table matches enable row level security;
alter table push_subscriptions enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Re-runnable policies
drop policy if exists "profiles_select_all" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "pets_select_active" on pets;
drop policy if exists "pets_insert_own" on pets;
drop policy if exists "pets_update_own" on pets;
drop policy if exists "pets_delete_own" on pets;
drop policy if exists "pet_photos_select_all" on pet_photos;
drop policy if exists "pet_photos_insert_own" on pet_photos;
drop policy if exists "pet_photos_delete_own" on pet_photos;
drop policy if exists "matches_select_all" on matches;
drop policy if exists "matches_insert_service" on matches;
drop policy if exists "matches_update_service" on matches;
drop policy if exists "matches_select_participants" on matches;
drop policy if exists "matches_update_owners" on matches;
drop policy if exists "push_subs_own" on push_subscriptions;
drop policy if exists "conversations_select_participants" on conversations;
drop policy if exists "conversations_insert_inquirer" on conversations;
drop policy if exists "messages_select_participants" on messages;
drop policy if exists "messages_insert_participants" on messages;

-- Profiles
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Pets
create policy "pets_select_active" on pets for select using (status = 'active' or auth.uid() = user_id);
create policy "pets_insert_own" on pets for insert with check (auth.uid() = user_id);
create policy "pets_update_own" on pets for update using (auth.uid() = user_id);
create policy "pets_delete_own" on pets for delete using (auth.uid() = user_id);

-- Pet photos
create policy "pet_photos_select_all" on pet_photos for select using (true);
create policy "pet_photos_insert_own" on pet_photos for insert with check (
  exists (select 1 from pets where id = pet_id and user_id = auth.uid())
);
create policy "pet_photos_delete_own" on pet_photos for delete using (
  exists (select 1 from pets where id = pet_id and user_id = auth.uid())
);

-- Matches
create policy "matches_select_participants" on matches for select using (
  exists (
    select 1 from pets
    where pets.id in (lost_pet_id, found_pet_id)
      and pets.user_id = auth.uid()
  )
);

create policy "matches_update_owners" on matches for update using (
  exists (
    select 1 from pets
    where pets.id in (lost_pet_id, found_pet_id)
      and pets.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from pets
    where pets.id in (lost_pet_id, found_pet_id)
      and pets.user_id = auth.uid()
  )
);

-- Push subscriptions
create policy "push_subs_own" on push_subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations
create policy "conversations_select_participants" on conversations for select using (
  auth.uid() = pet_owner_id or auth.uid() = inquirer_id
);

create policy "conversations_insert_inquirer" on conversations for insert with check (
  auth.uid() = inquirer_id
  and pet_owner_id <> inquirer_id
  and exists (
    select 1 from pets
    where pets.id = pet_id
      and pets.user_id = pet_owner_id
      and pets.status = 'active'
  )
);

-- Messages
create policy "messages_select_participants" on messages for select using (
  exists (
    select 1 from conversations
    where conversations.id = conversation_id
      and (conversations.pet_owner_id = auth.uid() or conversations.inquirer_id = auth.uid())
  )
);

create policy "messages_insert_participants" on messages for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from conversations
    where conversations.id = conversation_id
      and (conversations.pet_owner_id = auth.uid() or conversations.inquirer_id = auth.uid())
  )
);

-- ============================================================
-- User contacts
-- ============================================================

create table if not exists user_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('owner', 'vet', 'shelter', 'emergency', 'other')) not null default 'other',
  name text not null,
  phone text,
  email text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_contacts enable row level security;

create index if not exists user_contacts_user_id_idx on user_contacts(user_id);

create policy "contacts_select_own" on user_contacts for select using (auth.uid() = user_id);
create policy "contacts_insert_own" on user_contacts for insert with check (auth.uid() = user_id);
create policy "contacts_update_own" on user_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contacts_delete_own" on user_contacts for delete using (auth.uid() = user_id);

create or replace function update_user_contacts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_contacts_updated_at
  before update on user_contacts
  for each row execute function update_user_contacts_updated_at();

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at on pets
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pets_updated_at on pets;
create trigger pets_updated_at
  before update on pets
  for each row execute procedure update_updated_at();

-- Auto-update updated_at on conversations when a message is added
create or replace function touch_conversation_updated_at()
returns trigger as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists messages_touch_conversation on messages;
create trigger messages_touch_conversation
  after insert on messages
  for each row execute procedure touch_conversation_updated_at();

-- Realtime for chat messages
alter table messages replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end;
$$;

-- Add animal_type + lat/lng to user_contacts (if not already present)
alter table user_contacts add column if not exists animal_type text check (animal_type in ('dog','cat','bird','rabbit','exotic','other'));
alter table user_contacts add column if not exists lat double precision;
alter table user_contacts add column if not exists lng double precision;
-- Sprint D: link contact to a specific pet
alter table user_contacts add column if not exists pet_id uuid references pets(id) on delete set null;
-- Add volunteer contact type (alter check constraint)
-- Note: PostgreSQL doesn't support ALTER CHECK directly — drop and recreate if needed:
-- alter table user_contacts drop constraint if exists user_contacts_type_check;
-- alter table user_contacts add constraint user_contacts_type_check check (type in ('owner','vet','shelter','emergency','volunteer','other'));

-- Vet profiles
create table if not exists vet_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  clinic_name text not null,
  vet_name text not null,
  specialization text check (specialization in ('general','surgery','exotic','dentistry','dermatology','orthopedics','oncology','other')) default 'general' not null,
  license_number text,
  phone text,
  email text,
  address text,
  website text,
  verified boolean default false not null,
  lat double precision,
  lng double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table vet_profiles enable row level security;

drop policy if exists "vet_profiles_select" on vet_profiles;
drop policy if exists "vet_profiles_insert" on vet_profiles;
drop policy if exists "vet_profiles_update" on vet_profiles;

create policy "vet_profiles_select" on vet_profiles for select using (true);
create policy "vet_profiles_insert" on vet_profiles for insert with check (auth.uid() = user_id);
create policy "vet_profiles_update" on vet_profiles for update using (auth.uid() = user_id);

drop trigger if exists vet_profiles_updated_at on vet_profiles;
create trigger vet_profiles_updated_at
  before update on vet_profiles
  for each row execute procedure update_updated_at();

-- Add secured_by_vet_id to pets (nullable FK to vet_profiles)
alter table pets add column if not exists secured_by_vet_id uuid references vet_profiles(id) on delete set null;

-- Pet profile fields (Sprint B)
alter table pets add column if not exists gender text check (gender in ('male', 'female', 'unknown')) default 'unknown';
alter table pets add column if not exists birth_date date;
alter table pets add column if not exists chip_id text;
alter table pets add column if not exists character text;
alter table pets add column if not exists allergies text;
alter table pets add column if not exists is_neutered boolean;

-- ============================================================
-- Sprint D — Vet document sharing
-- ============================================================

create table if not exists vet_documents (
  id uuid primary key default gen_random_uuid(),
  vet_id uuid references vet_profiles(id) on delete cascade not null,
  pet_id uuid references pets(id) on delete cascade not null,
  title text not null,
  notes text,
  document_path text not null,
  created_at timestamptz default now()
);

alter table vet_documents enable row level security;
create index if not exists vet_documents_pet_id_idx on vet_documents(pet_id);
create index if not exists vet_documents_vet_id_idx on vet_documents(vet_id);

drop policy if exists "vet_docs_select" on vet_documents;
drop policy if exists "vet_docs_insert" on vet_documents;
drop policy if exists "vet_docs_delete" on vet_documents;

-- Vet can see their own uploads; pet owner sees docs for their pets
create policy "vet_docs_select" on vet_documents for select using (
  exists (select 1 from vet_profiles where id = vet_id and user_id = auth.uid())
  or exists (select 1 from pets where id = pet_id and user_id = auth.uid())
);
create policy "vet_docs_insert" on vet_documents for insert with check (
  exists (select 1 from vet_profiles where id = vet_id and user_id = auth.uid())
);
create policy "vet_docs_delete" on vet_documents for delete using (
  exists (select 1 from vet_profiles where id = vet_id and user_id = auth.uid())
);

-- ============================================================
-- Sprint C — Medical history
-- ============================================================

create table if not exists pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  date_given date not null,
  next_due date,
  vet_name text,
  batch_number text,
  notes text,
  created_at timestamptz default now()
);

alter table pet_vaccinations enable row level security;
create index if not exists pet_vaccinations_pet_id_idx on pet_vaccinations(pet_id);

drop policy if exists "vaccinations_select_owner" on pet_vaccinations;
drop policy if exists "vaccinations_insert_owner" on pet_vaccinations;
drop policy if exists "vaccinations_delete_owner" on pet_vaccinations;
create policy "vaccinations_select_owner" on pet_vaccinations for select using (auth.uid() = user_id);
create policy "vaccinations_insert_owner" on pet_vaccinations for insert with check (auth.uid() = user_id);
create policy "vaccinations_delete_owner" on pet_vaccinations for delete using (auth.uid() = user_id);

create table if not exists pet_medical_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references pets(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('visit', 'treatment', 'surgery', 'test', 'prescription', 'other')) not null default 'visit',
  title text not null,
  date date not null,
  vet_name text,
  clinic_name text,
  notes text,
  document_path text,
  created_at timestamptz default now()
);

alter table pet_medical_records enable row level security;
create index if not exists pet_medical_records_pet_id_idx on pet_medical_records(pet_id);

drop policy if exists "medical_select_owner" on pet_medical_records;
drop policy if exists "medical_insert_owner" on pet_medical_records;
drop policy if exists "medical_delete_owner" on pet_medical_records;
create policy "medical_select_owner" on pet_medical_records for select using (auth.uid() = user_id);
create policy "medical_insert_owner" on pet_medical_records for insert with check (auth.uid() = user_id);
create policy "medical_delete_owner" on pet_medical_records for delete using (auth.uid() = user_id);

-- Private storage for pet documents (PDFs) — user-scoped
insert into storage.buckets (id, name, public)
values ('pet-documents', 'pet-documents', false)
on conflict (id) do nothing;

drop policy if exists "pet_docs_select_own" on storage.objects;
drop policy if exists "pet_docs_insert_own" on storage.objects;
drop policy if exists "pet_docs_delete_own" on storage.objects;

create policy "pet_docs_select_own" on storage.objects
  for select using (bucket_id = 'pet-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "pet_docs_insert_own" on storage.objects
  for insert with check (bucket_id = 'pet-documents' and auth.role() = 'authenticated' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "pet_docs_delete_own" on storage.objects
  for delete using (bucket_id = 'pet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Storage bucket for pet photos
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

drop policy if exists "pet_photos_storage_select" on storage.objects;
drop policy if exists "pet_photos_storage_insert" on storage.objects;
drop policy if exists "pet_photos_storage_delete" on storage.objects;

create policy "pet_photos_storage_select" on storage.objects
  for select using (bucket_id = 'pet-photos');

create policy "pet_photos_storage_insert" on storage.objects
  for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "pet_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'pet-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Pet profile type (standalone digital identity, not a report)
-- ============================================================
alter table pets drop constraint if exists pets_type_check;
alter table pets add constraint pets_type_check check (type in ('lost', 'found', 'profile'));

-- Allow null description and location for profile-type pets
alter table pets alter column description drop not null;
alter table pets alter column last_seen_lat drop not null;
alter table pets alter column last_seen_lng drop not null;
