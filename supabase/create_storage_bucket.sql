-- ============================================================================
-- Printable3D - Create Supabase Storage Bucket ('product-images')
-- ============================================================================
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- This creates the public storage bucket and sets up read/write policies.
-- ============================================================================

-- 1. Create or update the 'product-images' bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760, -- 10 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Drop existing policies to prevent duplication
drop policy if exists "Public read product images" on storage.objects;
drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;

-- 3. Public read policy (anyone can view product images)
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- 4. Admin upload policy
create policy "Admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

-- 5. Admin update policy
create policy "Admins can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

-- 6. Admin delete policy
create policy "Admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
