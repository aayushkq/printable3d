export const INITIAL_PRODUCTS = [
  {
    id: "3d-printed-lamp",
    slug: "3d-printed-lamp",
    name: "3D Printed Lamp",
    category: "lamps",
    categoryName: "Lamps & Lighting",
    price: 499,
    originalPrice: 899,
    status: "available",
    shortDescription: "A minimalist 3D printed lamp, designed for stylish everyday lighting.",
    fullDescription: "A minimalist 3D printed lamp, designed for stylish everyday lighting. Features an intricate lithophane textured lunar globe resting on a sculpted continuous-wave cradle base. Emits a soft, calming ambient glow that transforms desks, bedside tables, and modern living spaces.",
    shippingInfo: "Additional shipping charges",
    rating: 5,
    reviewsCount: 48,
    images: ["images/products/moon-lamp-1.jpg", "images/products/moon-lamp-2.jpg"]
  },
  {
    id: "3d-printed-phone-stand",
    slug: "3d-printed-phone-stand",
    name: "3D Printed Phone Stand",
    category: "tech",
    categoryName: "Phone & Tech Stands",
    price: 199,
    originalPrice: 349,
    status: "available",
    shortDescription: "A compact and sturdy 3D printed phone stand for desks, study tables and offices.",
    fullDescription: "A compact and sturdy 3D printed phone stand for desks, study tables and offices. Designed with an ergonomic viewing angle for hands-free video calls, typing, and video watching. Includes a generous front cradle that accommodates phones with cases and an open cable route for hassle-free charging while docked.",
    shippingInfo: "Additional shipping charges",
    rating: 4.9,
    reviewsCount: 36,
    images: ["images/products/phone-stand-1.jpg", "images/products/phone-stand-2.jpg"]
  },
  {
    id: "3d-printed-butterfly-glow-lamp",
    slug: "3d-printed-butterfly-glow-lamp",
    name: "3D Printed Butterfly Glow Lamp",
    category: "lamps",
    categoryName: "Lamps & Lighting",
    price: 499,
    originalPrice: null,
    status: "available",
    shortDescription: "A decorative 3D printed lamp featuring beautiful butterfly-shaped cutouts that create a warm, ambient glow.",
    fullDescription: "Add a touch of warmth and elegance to your space with this 3D Printed Butterfly Glow Lamp. Its detailed butterfly-patterned shade creates a beautiful lighting effect when illuminated. A unique decorative piece for bedrooms, desks and cosy corners.",
    shippingInfo: "Additional shipping charges",
    rating: 5,
    reviewsCount: 0,
    images: ["images/products/butterfly-lamp-hanging.png", "images/products/butterfly-lamp-front.png", "images/products/butterfly-lamp-detail.png"]
  },
  {
    id: "3d-printed-cute-ghost",
    slug: "3d-printed-cute-ghost",
    name: "3D Printed Cute Ghost Figurine",
    category: "decor",
    categoryName: "Art & Decor",
    price: 149,
    originalPrice: null,
    status: "available",
    shortDescription: "A cute little 3D printed ghost figurine with a charming face, perfect for desks, shelves and gifting.",
    fullDescription: "Meet your new little desk companion! This adorable 3D Printed Cute Ghost Figurine features a smooth ghost-shaped design, glossy black eyes and a tiny smile. Its compact design makes it perfect for decorating your workspace, bedroom or shelf. A fun little gift for friends and anyone who loves cute collectibles.",
    shippingInfo: "Additional shipping charges",
    rating: 5,
    reviewsCount: 0,
    images: ["images/products/cute-ghost-1.png", "images/products/cute-ghost-2.png", "images/products/cute-ghost-3.png"]
  }
];

export function normalizeProduct(row) {
  if (!row) return null;
  let images = row.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }
  if (!Array.isArray(images)) images = [];

  const fullDescription = row.full_description || row.fullDescription || row.description || "";
  return {
    id: row.id,
    slug: row.slug || row.id,
    name: row.name,
    category: row.category || "general",
    categoryName: row.category_name || row.categoryName || row.category || "General",
    price: Number(row.price),
    originalPrice: row.original_price !== undefined ? row.original_price : row.originalPrice,
    status: row.status || "available",
    shortDescription: row.short_description || row.shortDescription || (fullDescription ? `${fullDescription.substring(0, 120)}...` : ""),
    fullDescription,
    shippingInfo: row.shipping_info || row.shippingInfo || "Additional shipping charges",
    rating: Number(row.rating),
    reviewsCount: Number(row.reviews_count || row.reviewsCount || 0),
    images
  };
}
