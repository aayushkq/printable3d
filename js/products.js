/**
 * Printable3D - Product Catalogue Data & Service Layer
 * -------------------------------------------------------------
 * Powers both Supabase live database synchronization and
 * initial local seed products for instant offline preview.
 */

const CATEGORIES = [
  { id: "all", name: "All Products" },
  { id: "lamps", name: "Lamps & Lighting" },
  { id: "tech", name: "Phone & Tech Stands" },
  { id: "organizers", name: "Organizers & Key Holders" },
  { id: "decor", name: "Art & Decor" }
];

/**
 * Initial Products as specified:
 * 1. 3D Printed Lamp (₹499, Available, actual lamp photos)
 * 2. 3D Printed Phone Stand (₹199, Available, actual phone stand photos)
 * 3. 3D Printed Mini Garage Key Holder (₹399, Draft, concept garage photos)
 */
const INITIAL_PRODUCTS = [
  {
    id: "3d-printed-lamp",
    name: "3D Printed Lamp",
    slug: "3d-printed-lamp",
    category: "lamps",
    categoryName: "Lamps & Lighting",
    price: 499,
    originalPrice: 899,
    shipping_info: "Additional shipping charges",
    shippingInfo: "Additional shipping charges",
    status: "available", // Published
    badge: "Bestseller",
    rating: 5.0,
    reviewsCount: 48,
    featured: true,
    shortDescription: "A minimalist 3D printed lamp, designed for stylish everyday lighting.",
    fullDescription: "A minimalist 3D printed lamp, designed for stylish everyday lighting. Features an intricate lithophane textured lunar globe resting on a sculpted continuous-wave cradle base. Emits a soft, calming ambient glow that transforms desks, bedside tables, and modern living spaces.",
    features: [
      "Precision 0.12mm lithophane layer resolution",
      "Includes sculpted architectural wave cradle stand",
      "Warm ambient diffused LED illumination",
      "Biodegradable eco-friendly PLA+ biopolymer",
      "Pre-wired inline switch for easy plug-and-play operation"
    ],
    colors: [
      { name: "Moonlit Ivory + White Wave Stand", hex: "#FAF8F5", inStock: true },
      { name: "Moonlit Ivory + Matte Black Stand", hex: "#1C1C1E", inStock: true }
    ],
    specs: {
      material: "Premium Lithophane Grade PLA+",
      layerHeight: "0.12mm Ultra-Fine Detail",
      dimensions: "140mm Globe Dia x 165mm Total Height",
      weight: "310 grams",
      lightSource: "Warm White Ambient LED with Inline Switch",
      care: "Wipe with soft dry microfiber cloth"
    },
    images: [
      "images/products/moon-lamp-1.jpg",
      "images/products/moon-lamp-2.jpg"
    ],
    svgType: "sphere"
  },
  {
    id: "3d-printed-phone-stand",
    name: "3D Printed Phone Stand",
    slug: "3d-printed-phone-stand",
    category: "tech",
    categoryName: "Phone & Tech Stands",
    price: 199,
    originalPrice: 349,
    shipping_info: "Additional shipping charges",
    shippingInfo: "Additional shipping charges",
    status: "available", // Published
    badge: "Essential",
    rating: 4.9,
    reviewsCount: 36,
    featured: true,
    shortDescription: "A compact and sturdy 3D printed phone stand for desks, study tables and offices.",
    fullDescription: "A compact and sturdy 3D printed phone stand for desks, study tables and offices. Designed with an ergonomic viewing angle for hands-free video calls, typing, and video watching. Includes a generous front cradle that accommodates phones with cases and an open cable route for hassle-free charging while docked.",
    features: [
      "Sturdy, non-wobble geometric base",
      "Ergonomic viewing angle for video calls and notifications",
      "Integrated cable pass-through for charging while docked",
      "Accommodates smartphones with thick protective cases",
      "Printed with durable, impact-resistant biopolymer"
    ],
    colors: [
      { name: "Clean White", hex: "#FFFFFF", inStock: true },
      { name: "Matte Slate", hex: "#334155", inStock: true }
    ],
    specs: {
      material: "High-Strength Tough PLA+",
      layerHeight: "0.18mm Structural Precision",
      dimensions: "90mm (H) x 75mm (W) x 85mm (D)",
      weight: "115 grams",
      compatibility: "All iPhone and Android smartphones",
      care: "Washable with mild soap and water"
    },
    images: [
      "images/products/phone-stand-1.jpg",
      "images/products/phone-stand-2.jpg"
    ],
    svgType: "phone-stand"
  },
  {
    id: "3d-printed-car-key-holder",
    name: "3D Printed Car Key Holder",
    slug: "3d-printed-car-key-holder",
    category: "organizers",
    categoryName: "Organizers & Key Holders",
    price: 249,
    originalPrice: 499,
    shipping_info: "Additional shipping charges",
    shippingInfo: "Additional shipping charges",
    status: "draft", // DRAFT - Kept as draft until actual photo & price are approved
    badge: "Draft",
    rating: 5.0,
    reviewsCount: 12,
    featured: false,
    shortDescription: "A 3D printed wall-mounted car key holder.",
    fullDescription: "A 3D printed wall-mounted car key holder. Features a miniature garage display shelf with roller shutter styling and reinforced hooks underneath for hanging car and house keys.",
    features: [
      "Miniature garage display for a 1:64 scale die-cast car",
      "Sideways car display inside the garage",
      "Garage shutter design",
      "Four key-hanging hooks underneath",
      "Wall-mounted design",
      "Editable product price and description"
    ],
    colors: [
      { name: "Industrial White", hex: "#FFFFFF", inStock: true },
      { name: "Garage Matte Black", hex: "#18181B", inStock: true }
    ],
    specs: {
      material: "Structural Rigid PLA+",
      scale: "1:64 Die-cast Car Display Slot",
      hooks: "4 Reinforced Key Pegs",
      mounting: "Dual Screw Slots / High-strength 3M tape backing",
      lighting: "Warm LED interior spotlight cavity"
    },
    images: [
      "images/products/mini-garage-key-holder.png",
      "images/products/mini-garage-key-holder-2.png"
    ],
    svgType: "garage"
  },
  {
    id: "3d-printed-butterfly-glow-lamp",
    name: "3D Printed Butterfly Glow Lamp",
    slug: "3d-printed-butterfly-glow-lamp",
    category: "lamps",
    categoryName: "Lamps & Lighting",
    price: 499,
    originalPrice: null,
    shipping_info: "Additional shipping charges",
    shippingInfo: "Additional shipping charges",
    status: "available", // Published
    badge: "New Arrival",
    rating: 5.0,
    reviewsCount: 0,
    featured: true,
    shortDescription: "A decorative 3D printed lamp featuring beautiful butterfly-shaped cutouts that create a warm, ambient glow.",
    fullDescription: "Add a touch of warmth and elegance to your space with this 3D Printed Butterfly Glow Lamp. Its detailed butterfly-patterned shade creates a beautiful lighting effect when illuminated. A unique decorative piece for bedrooms, desks and cosy corners.",
    features: [
      "Detailed 3D printed butterfly pattern",
      "Warm decorative lighting effect",
      "Unique textured lampshade",
      "Suitable for bedroom and desk decoration",
      "Distinctive handmade-style appearance"
    ],
    colors: [],
    specs: {},
    images: [
      "images/products/butterfly-lamp-hanging.png",
      "images/products/butterfly-lamp-front.png",
      "images/products/butterfly-lamp-detail.png"
    ],
    svgType: "lamp"
  },
  {
    id: "3d-printed-cute-ghost",
    name: "3D Printed Cute Ghost Figurine",
    slug: "3d-printed-cute-ghost",
    category: "decor",
    categoryName: "Art & Decor",
    price: 149,
    originalPrice: null,
    shipping_info: "Additional shipping charges",
    shippingInfo: "Additional shipping charges",
    status: "available", // Published
    badge: "Popular Desk Companion",
    rating: 5.0,
    reviewsCount: 0,
    featured: true,
    shortDescription: "A cute little 3D printed ghost figurine with a charming face, perfect for desks, shelves and gifting.",
    fullDescription: "Meet your new little desk companion! This adorable 3D Printed Cute Ghost Figurine features a smooth ghost-shaped design, glossy black eyes and a tiny smile. Its compact design makes it perfect for decorating your workspace, bedroom or shelf. A fun little gift for friends and anyone who loves cute collectibles.",
    features: [
      "Cute ghost-inspired design",
      "3D printed with detailed surface finish",
      "Compact decorative desk companion",
      "Glossy black eyes and adorable expression",
      "Great for gifting and personal collections"
    ],
    colors: [],
    specs: {},
    images: [
      "images/products/cute-ghost-1.png",
      "images/products/cute-ghost-2.png",
      "images/products/cute-ghost-3.png"
    ],
    svgType: "ghost"
  }
];

// Global local cache
window.LOCAL_PRODUCTS = [...INITIAL_PRODUCTS];

/**
 * Product Data Service Layer
 * Automatically fetches from Supabase if configured, or falls back to LOCAL_PRODUCTS.
 */
const ProductService = {
  /**
   * Returns published products only (status = 'available').
   * Public visitors never receive draft or unavailable items.
   */
  getPublished: async function () {
    if (window.SupabaseService && window.SupabaseService.isConfigured()) {
      try {
        const rows = await window.SupabaseService.getPublishedProducts();
        if (rows && rows.length > 0) {
          const supabaseProducts = rows.map(normalizeProduct);
          const existingSlugs = new Set(supabaseProducts.map(p => p.slug || p.id));
          const localOnly = window.LOCAL_PRODUCTS
            .filter(p => p.status === "available" && !existingSlugs.has(p.slug) && !existingSlugs.has(p.id))
            .map(normalizeProduct);
          return [...supabaseProducts, ...localOnly];
        }
      } catch (e) {
        console.warn("[Printable3D] Supabase query failed, falling back to local published products:", e);
      }
    }
    return window.LOCAL_PRODUCTS.filter(p => p.status === "available").map(normalizeProduct);
  },

  /**
   * Synchronous accessor for fast initial renders
   */
  getPublishedSync: function () {
    return window.LOCAL_PRODUCTS.filter(p => p.status === "available").map(normalizeProduct);
  },

  /**
   * Admin-only: Returns all products including draft and unavailable
   */
  getAllAdmin: async function () {
    if (window.SupabaseService && window.SupabaseService.isConfigured()) {
      try {
        const rows = await window.SupabaseService.getAllProductsAdmin();
        if (rows && rows.length > 0) {
          const supabaseProducts = rows.map(normalizeProduct);
          const existingSlugs = new Set(supabaseProducts.map(p => p.slug || p.id));
          const localOnly = window.LOCAL_PRODUCTS
            .filter(p => !existingSlugs.has(p.slug) && !existingSlugs.has(p.id))
            .map(normalizeProduct);
          return [...supabaseProducts, ...localOnly];
        }
      } catch (err) {
        console.warn("[Printable3D] Supabase admin fetch warning (table may not be created yet):", err.message);
      }
    }
    return window.LOCAL_PRODUCTS.map(normalizeProduct);
  },

  /**
   * Slug alias resolution for backward compatibility with previous links
   */
  resolveSlugAlias: function (slug) {
    if (!slug) return slug;
    const aliases = {
      "lunar-moon-lamp": "3d-printed-lamp",
      "moon-lamp": "3d-printed-lamp",
      "phone-stand": "3d-printed-phone-stand",
      "mini-garage-key-holder": "3d-printed-car-key-holder",
      "mini-garage": "3d-printed-car-key-holder",
      "cute-ghost": "3d-printed-cute-ghost",
      "ghost": "3d-printed-cute-ghost"
    };
    return aliases[slug.toLowerCase()] || slug;
  },

  /**
   * Get single product by ID or Slug
   */
  getById: async function (idOrSlug, isAdmin = false) {
    const resolvedId = ProductService.resolveSlugAlias(idOrSlug);
    if (window.SupabaseService && window.SupabaseService.isConfigured()) {
      try {
        const row = await window.SupabaseService.getProductByIdOrSlug(resolvedId, isAdmin);
        if (row) return normalizeProduct(row);
      } catch (e) {
        console.warn("[Printable3D] Supabase single product query failed:", e);
      }
    }

    const all = window.LOCAL_PRODUCTS;
    const found = all.find(p => p.id === resolvedId || p.slug === resolvedId || p.id === idOrSlug || p.slug === idOrSlug);
    if (!found) return null;
    if (!isAdmin && found.status !== "available") return null;
    return normalizeProduct(found);
  },

  /**
   * Synchronous fallback for instant single product lookup
   */
  getByIdSync: function (idOrSlug, isAdmin = false) {
    const resolvedId = ProductService.resolveSlugAlias(idOrSlug);
    const all = window.LOCAL_PRODUCTS;
    const found = all.find(p => p.id === resolvedId || p.slug === resolvedId || p.id === idOrSlug || p.slug === idOrSlug);
    if (!found) return all.find(p => p.status === "available") || all[0];
    if (!isAdmin && found.status !== "available") return all.find(p => p.status === "available") || null;
    return normalizeProduct(found);
  },

  getCategories: () => CATEGORIES,

  getFallbackSvg: function (type, name) {
    const safeName = (name || "Printable3D Item").replace(/</g, "&lt;");
    let iconPath = '';

    switch (type) {
      case 'garage':
        iconPath = `
          <rect x="80" y="70" width="140" height="90" rx="4" fill="#18181B" stroke="#F8FAFC" stroke-width="3"/>
          <rect x="95" y="85" width="110" height="35" rx="2" fill="#E2E8F0"/>
          <line x1="95" y1="94" x2="205" y2="94" stroke="#94A3B8" stroke-width="2"/>
          <line x1="95" y1="104" x2="205" y2="104" stroke="#94A3B8" stroke-width="2"/>
          <line x1="95" y1="114" x2="205" y2="114" stroke="#94A3B8" stroke-width="2"/>
          <!-- Car silhouette inside -->
          <path d="M120 145 L130 135 L170 135 L180 145 Z" fill="#EA580C"/>
          <circle cx="132" cy="148" r="5" fill="#FFFFFF"/>
          <circle cx="168" cy="148" r="5" fill="#FFFFFF"/>
          <!-- Hooks underneath -->
          <path d="M100 160 V185 C100 195 110 195 110 185" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M130 160 V185 C130 195 140 195 140 185" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M160 160 V185 C160 195 170 195 170 185" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M190 160 V185 C190 195 200 195 200 185" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round"/>
        `;
        break;
      case 'phone-stand':
        iconPath = `
          <rect x="110" y="70" width="80" height="135" rx="8" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
          <path d="M95 185 L205 185 L190 220 L110 220 Z" fill="#E2E8F0" stroke="#0F172A" stroke-width="3"/>
          <path d="M135 185 V205 H165 V185" fill="#0F172A"/>
        `;
        break;
      case 'sphere':
      case 'lamp':
        iconPath = `
          <circle cx="150" cy="105" r="50" fill="#FEF3C7" opacity="0.95"/>
          <circle cx="130" cy="90" r="8" fill="#FDE68A"/>
          <circle cx="165" cy="120" r="10" fill="#FDE68A"/>
          <path d="M100 170 Q125 150 150 165 T200 170 L205 185 Q160 170 95 185 Z" fill="#334155"/>
        `;
        break;
      case 'ghost':
      case 'decor':
        iconPath = `
          <path d="M110 185 C105 110 120 75 150 75 C180 75 195 110 190 185 C182 178 174 190 166 182 C158 176 150 188 142 180 C134 175 126 186 118 180 Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="4"/>
          <circle cx="136" cy="125" r="6" fill="#0F172A"/>
          <circle cx="164" cy="125" r="6" fill="#0F172A"/>
          <path d="M144 138 Q150 144 156 138" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        `;
        break;
      default:
        iconPath = `
          <path d="M150 80 L205 110 L205 175 L150 205 L95 175 L95 110 Z" stroke="#0F172A" stroke-width="4" fill="#F1F5F9"/>
        `;
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" width="100%" height="100%">
        <rect width="300" height="260" fill="#F8FAFC"/>
        ${iconPath}
        <text x="150" y="240" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" fill="#64748B" text-anchor="middle">${safeName}</text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString.trim());
  }
};

/**
 * Normalizes product properties across snake_case (Supabase) and camelCase
 */
function normalizeProduct(p) {
  if (!p) return null;
  const shipping = p.shipping_info || p.shippingInfo || "Additional shipping charges";
  const desc = p.full_description || p.fullDescription || p.description || "";
  const shortDesc = p.short_description || p.shortDescription || (desc ? desc.substring(0, 120) + "..." : "");
  const catName = p.category_name || p.categoryName || (p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "General");
  const origPrice = p.original_price !== undefined ? p.original_price : p.originalPrice;

  let images = p.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch (e) {
      images = [images];
    }
  }
  if (!Array.isArray(images) || images.length === 0) {
    images = ["images/products/phone-stand-1.jpg"];
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug || p.id,
    category: p.category || "general",
    categoryName: catName,
    price: Number(p.price) || 0,
    originalPrice: origPrice ? Number(origPrice) : null,
    shippingInfo: shipping,
    shipping_info: shipping,
    status: p.status || "available",
    shortDescription: shortDesc,
    fullDescription: desc,
    features: p.features || [],
    specs: p.specs || {},
    colors: p.colors || [],
    images: images,
    featured: !!p.featured,
    rating: Number(p.rating) || 5.0,
    reviewsCount: Number(p.reviews_count || p.reviewsCount || 0),
    svgType: p.svgType || (p.category === "lamps" ? "sphere" : p.category === "tech" ? "phone-stand" : "garage")
  };
}

if (typeof window !== "undefined") {
  window.ProductService = ProductService;
  window.PRODUCTS = window.LOCAL_PRODUCTS;
  window.CATEGORIES = CATEGORIES;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ProductService, INITIAL_PRODUCTS, CATEGORIES };
}
