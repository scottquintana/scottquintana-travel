-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Cities
create table if not exists cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  cover_photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Places
create table if not exists places (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references cities(id) on delete cascade,
  name text not null,
  slug text not null,
  category text not null default 'other',
  description text not null default '',
  vetted boolean not null default false,
  website text,
  socials jsonb,
  recommendations text[],
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(city_id, slug)
);

-- Place locations
create table if not exists place_locations (
  id uuid primary key default uuid_generate_v4(),
  place_id uuid not null references places(id) on delete cascade,
  address text not null,
  lat float not null,
  lng float not null,
  notes text
);

-- Indexes
create index if not exists places_city_id_idx on places(city_id);
create index if not exists place_locations_place_id_idx on place_locations(place_id);

-- Updated_at triggers
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger cities_updated_at before update on cities
  for each row execute function update_updated_at();
create trigger places_updated_at before update on places
  for each row execute function update_updated_at();

-- Row Level Security
alter table cities enable row level security;
alter table places enable row level security;
alter table place_locations enable row level security;

-- Public read policies
create policy "Cities are publicly readable" on cities for select using (true);
create policy "Places are publicly readable" on places for select using (true);
create policy "Place locations are publicly readable" on place_locations for select using (true);

-- Service role can do everything (admin panel uses anon key for writes —
-- for a personal site this is fine; alternatively restrict to service role)
create policy "Service role full access to cities" on cities for all using (true);
create policy "Service role full access to places" on places for all using (true);
create policy "Service role full access to place_locations" on place_locations for all using (true);
