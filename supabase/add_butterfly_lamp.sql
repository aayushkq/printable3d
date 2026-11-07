-- ============================================================================
-- Printable3D: Add "3D Printed Butterfly Glow Lamp" to Supabase
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
  '3D Printed Butterfly Glow Lamp',
  '3d-printed-butterfly-glow-lamp',
  'lamps',
  'Lamps & Lighting',
  499,
  null,
  'Additional shipping charges',
  'available',
  'A decorative 3D printed lamp featuring beautiful butterfly-shaped cutouts that create a warm, ambient glow.',
  'Add a touch of warmth and elegance to your space with this 3D Printed Butterfly Glow Lamp. Its detailed butterfly-patterned shade creates a beautiful lighting effect when illuminated. A unique decorative piece for bedrooms, desks and cosy corners.',
  '["Detailed 3D printed butterfly pattern", "Warm decorative lighting effect", "Unique textured lampshade", "Suitable for bedroom and desk decoration", "Distinctive handmade-style appearance"]'::jsonb,
  '{}'::jsonb,
  '[]'::jsonb,
  array[
    'images/products/butterfly-lamp-hanging.png',
    'images/products/butterfly-lamp-front.png',
    'images/products/butterfly-lamp-detail.png'
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
