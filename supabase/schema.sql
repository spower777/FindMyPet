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

-- RLS
alter table profiles enable row level security;
alter table pets enable row level security;
alter table pet_photos enable row level security;
alter table matches enable row level security;
alter table push_subscriptions enable row level security;

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
create policy "matches_select_all" on matches for select using (true);
create policy "matches_insert_service" on matches for insert with check (true);
create policy "matches_update_service" on matches for update using (true);

-- Push subscriptions
create policy "push_subs_own" on push_subscriptions for all using (auth.uid() = user_id);

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
$$ language plpgsql security definer;

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

-- Storage bucket for pet photos
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "pet_photos_storage_select" on storage.objects
  for select using (bucket_id = 'pet-photos');

create policy "pet_photos_storage_insert" on storage.objects
  for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "pet_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'pet-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
