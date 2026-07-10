create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'cliente' check (role in ('admin', 'cliente')),
  created_at timestamptz not null default now()
);

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  breed text,
  age text,
  weight text,
  temperament text,
  allergies text,
  food text,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  service text not null check (service in ('hotel', 'banho', 'tosa', 'banho_tosa', 'veterinario')),
  start_date date not null,
  end_date date,
  start_time time not null,
  status text not null default 'agendado' check (status in ('agendado', 'confirmado', 'atendido', 'faltou')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists vet_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  title text not null,
  kind text not null default 'observacao',
  record_date date not null default current_date,
  priority text not null default 'normal' check (priority in ('normal', 'alta')),
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists vaccines (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  name text not null,
  applied_at date not null,
  expires_at date,
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table pets enable row level security;
alter table appointments enable row level security;
alter table vet_records enable row level security;
alter table vaccines enable row level security;

create policy "profiles read own or admin" on profiles
  for select using (auth.uid() = id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "profiles insert own" on profiles
  for insert with check (auth.uid() = id);

create policy "pets owner or admin read" on pets
  for select using (owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "pets owner insert" on pets
  for insert with check (owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "appointments owner or admin read" on appointments
  for select using (owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "appointments owner insert" on appointments
  for insert with check (owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "vet admin all" on vet_records
  for all using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "vaccines owner or admin read" on vaccines
  for select using (
    exists (
      select 1 from pets
      where pets.id = vaccines.pet_id
      and (pets.owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

create policy "vaccines owner or admin insert" on vaccines
  for insert with check (
    exists (
      select 1 from pets
      where pets.id = vaccines.pet_id
      and (pets.owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );
