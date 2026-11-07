-- ============================================================================
-- Printable3D: Add "3D Printed Cute Ghost Figurine" to Supabase
-- ============================================================================
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/dquvwlccuwzrrdhetuwz/sql)
-- ============================================================================

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
  '3D Printed Cute Ghost Figurine',
  '3d-printed-cute-ghost',
  'decor',
  'Art & Decor',
  149,
  null,
  'Additional shipping charges',
  'available',
  'A cute little 3D printed ghost figurine with a charming face, perfect for desks, shelves and gifting.',
  'Meet your new little desk companion! This adorable 3D Printed Cute Ghost Figurine features a smooth ghost-shaped design, glossy black eyes and a tiny smile. Its compact design makes it perfect for decorating your workspace, bedroom or shelf. A fun little gift for friends and anyone who loves cute collectibles.',
  '["Cute ghost-inspired design", "3D printed with detailed surface finish", "Compact decorative desk companion", "Glossy black eyes and adorable expression", "Great for gifting and personal collections"]'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  array[
    'images/products/cute-ghost-1.png',
    'images/products/cute-ghost-2.png',
    'images/products/cute-ghost-3.png'
  ],
  true,
  5.0,
  0
) on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  category_name = excluded.category_name,
  price = excluded.price,
  original_price = excluded.original_price,
  shipping_info = excluded.shipping_info,
  status = excluded.status,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  features = excluded.features,
  specs = excluded.specs,
  colors = excluded.colors,
  images = excluded.images,
  featured = excluded.featured;
