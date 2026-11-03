-- ============================================================================
-- Printable3D - Supabase Database Schema & Storage Setup
-- ============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- to create tables, row-level security (RLS) policies, and storage bucket.
-- ============================================================================

-- 1. Create Products Table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text not null default 'general',
  category_name text not null default 'General',
  price numeric not null check (price >= 0),
  original_price numeric check (original_price is null or original_price >= 0),
  shipping_info text not null default 'Additional shipping charges',
  status text not null default 'draft' check (status in ('available', 'unavailable', 'draft')),
  short_description text,
  full_description text not null,
  features jsonb default '[]'::jsonb,
  specs jsonb default '{}'::jsonb,
  colors jsonb default '[]'::jsonb,
  images text[] not null default '{}',
  featured boolean not null default false,
  rating numeric not null default 5.0,
  reviews_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for public querying
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_slug on public.products (slug);

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_products_updated on public.products;
create trigger on_products_updated
  before update on public.products
  for each row execute function public.handle_updated_at();


-- 2. Admin Users Table (Controls who is authorized to manage the store)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- Helper function to check if current authenticated user is an authorized admin
create or replace function public.is_admin()
returns boolean
security definer
set search_path = public
language sql as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;


-- 3. Enable Row Level Security (RLS) on Products Table
alter table public.products enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public visitors can view available products only" on public.products;
drop policy if exists "Admins have full read access to all products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;

-- Public can ONLY read published/available products (draft and unavailable are hidden)
create policy "Public visitors can view available products only"
  on public.products
  for select
  using (status = 'available');

-- Authenticated admins can view ALL products (including drafts and unavailable items)
create policy "Admins have full read access to all products"
  on public.products
  for select
  to authenticated
  using (public.is_admin());

-- Only authenticated admins can insert products
create policy "Admins can insert products"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

-- Only authenticated admins can update products
create policy "Admins can update products"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Only authenticated admins can delete products
create policy "Admins can delete products"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());


-- 4. Enable RLS on Admin Users Table
alter table public.admin_users enable row level security;

drop policy if exists "Admins can view admin list" on public.admin_users;
create policy "Admins can view admin list"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());


-- 5. Supabase Storage Setup: 'product-images' bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Storage RLS Policies
drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;

-- Anyone can view product images
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Only authenticated admins can upload images
create policy "Admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

-- Only authenticated admins can update images
create policy "Admins can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Only authenticated admins can delete images
create policy "Admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());


-- ============================================================================
-- 6. Initial Seed Data (Products 1, 2, and 3)
-- ============================================================================

-- Clear existing sample records if re-seeding
delete from public.products where slug in ('3d-printed-lamp', '3d-printed-phone-stand', '3d-printed-mini-garage-key-holder');

-- PRODUCT 1: 3D Printed Lamp
insert into public.products (
  name,
  slug,
  category,
  category_name,
  price,
  original_price,
  shipping_info,
  status,
  short_description,
  full_description,
  features,
  specs,
  colors,
  images,
  featured,
  rating,
  reviews_count
) values (
  '3D Printed Lamp',
  '3d-printed-lamp',
  'lamps',
  'Lamps & Lighting',
  499,
  899,
  'Additional shipping charges',
  'available',
  'A minimalist 3D printed lamp, designed for stylish everyday lighting.',
  'A minimalist 3D printed lamp, designed for stylish everyday lighting. Features an intricate lithophane textured lunar globe resting on a sculpted continuous-wave cradle base. Emits a soft, calming ambient glow that transforms desks, bedside tables, and modern living spaces.',
  '["Precision 0.12mm lithophane layer resolution", "Includes sculpted architectural wave cradle stand", "Warm ambient diffused LED illumination", "Biodegradable eco-friendly PLA+ biopolymer", "Pre-wired inline switch for easy plug-and-play operation"]'::jsonb,
  '{"material": "Premium Lithophane Grade PLA+", "layerHeight": "0.12mm Ultra-Fine Detail", "dimensions": "140mm Globe Dia x 165mm Total Height", "weight": "310 grams", "lightSource": "Warm White Ambient LED with Inline Switch", "power": "Pre-wired USB / standard adapter compatible"}'::jsonb,
  '[{"name": "Moonlit Ivory + White Wave Stand", "hex": "#FAF8F5", "inStock": true}, {"name": "Moonlit Ivory + Matte Black Stand", "hex": "#1C1C1E", "inStock": true}]'::jsonb,
  array['images/products/moon-lamp-1.jpg', 'images/products/moon-lamp-2.jpg'],
  true,
  5.0,
  48
);

-- PRODUCT 2: 3D Printed Phone Stand
insert into public.products (
  name,
  slug,
  category,
  category_name,
  price,
  original_price,
  shipping_info,
  status,
  short_description,
  full_description,
  features,
  specs,
  colors,
  images,
  featured,
  rating,
  reviews_count
) values (
  '3D Printed Phone Stand',
  '3d-printed-phone-stand',
  'tech',
  'Phone & Tech Stands',
  199,
  349,
  'Additional shipping charges',
  'available',
  'A compact and sturdy 3D printed phone stand for desks, study tables and offices.',
  'A compact and sturdy 3D printed phone stand for desks, study tables and offices. Designed with an ergonomic viewing angle for hands-free video calls, typing, and video watching. Includes a generous front cradle that accommodates phones with cases and an open cable route for hassle-free charging while docked.',
  '["Sturdy, non-wobble geometric base", "Ergonomic viewing angle for video calls and notifications", "Integrated cable pass-through for charging while docked", "Accommodates smartphones with thick protective cases", "Printed with durable, impact-resistant biopolymer"]'::jsonb,
  '{"material": "High-Strength Tough PLA+", "layerHeight": "0.18mm Structural Precision", "dimensions": "90mm (H) x 75mm (W) x 85mm (D)", "weight": "115 grams", "compatibility": "All iPhone and Android smartphones"}'::jsonb,
  '[{"name": "Clean White", "hex": "#FFFFFF", "inStock": true}, {"name": "Matte Slate", "hex": "#334155", "inStock": true}]'::jsonb,
  array['images/products/phone-stand-1.jpg', 'images/products/phone-stand-2.jpg'],
  true,
  4.9,
  36
);

-- PRODUCT 3: 3D Printed Mini Garage Key Holder (DRAFT)
insert into public.products (
  name,
  slug,
  category,
  category_name,
  price,
  original_price,
  shipping_info,
  status,
  short_description,
  full_description,
  features,
  specs,
  colors,
  images,
  featured,
  rating,
  reviews_count
) values (
  '3D Printed Mini Garage Key Holder',
  '3d-printed-mini-garage-key-holder',
  'organizers',
  'Organizers & Key Holders',
  399,
  699,
  'Additional shipping charges',
  'draft',
  'A miniature 3D-printed garage key holder featuring a die-cast car displayed sideways inside, a roller shutter design, warm LED lighting and 4 hooks.',
  'A miniature 3D-printed garage featuring a Hot Wheels-style die-cast car displayed sideways inside, a roller shutter design, warm LED-style lighting and hooks underneath for hanging car keys. Designed for wall mounting in entryways, garages, and bedrooms.',
  '["Miniature garage display for a 1:64 scale die-cast car", "Sideways car display inside the garage", "Garage shutter design", "Four key-hanging hooks underneath", "Wall-mounted design", "Editable product price and description"]'::jsonb,
  '{"material": "Structural Rigid PLA+", "scale": "1:64 Die-cast Car Display Slot", "hooks": "4 Reinforced Key Pegs", "mounting": "Dual Screw Slots / High-strength 3M tape backing", "lighting": "Warm LED interior spotlight cavity"}'::jsonb,
  '[{"name": "Industrial White", "hex": "#FFFFFF", "inStock": true}, {"name": "Garage Matte Black", "hex": "#18181B", "inStock": true}]'::jsonb,
  array['images/products/mini-garage-key-holder.png', 'images/products/mini-garage-key-holder-2.png'],
  false,
  5.0,
  12
);


-- ============================================================================
-- 7. How to Authorize Your Admin Account
-- ============================================================================
-- After you create your admin account with your email and password in Supabase Auth:
-- (Supabase Dashboard -> Authentication -> Users -> Add User -> Create User)
-- Run this single command to grant full admin permissions:
--
-- insert into public.admin_users (user_id, email)
-- select id, email from auth.users where email = 'printable3d.store@gmail.com'
-- on conflict (user_id) do nothing;
-- ============================================================================
