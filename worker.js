import { INITIAL_PRODUCTS, normalizeProduct } from "./product-data.js";

const SITE_NAME = "Printable3D";
const SITE_ORIGIN = "https://printable3d.store";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Prevent direct access to sensitive repository or worker configuration files
    if (
      url.pathname === "/worker.js" ||
      url.pathname === "/product-data.js" ||
      url.pathname === "/wrangler.toml" ||
      url.pathname === "/wrangler.json" ||
      url.pathname === "/wrangler.jsonc" ||
      url.pathname.startsWith("/.git") ||
      url.pathname.startsWith("/supabase/")
    ) {
      return new Response("Not Found", { status: 404 });
    }

    // Intercept product page requests for server-side rendering
    if (url.pathname === "/product" || url.pathname === "/product.html") {
      if (request.method === "GET" || request.method === "HEAD") {
        return handleProductRequest(request, env);
      }
    }

    // Fall back to Cloudflare Workers Static Assets for all other routes and files
    return env.ASSETS.fetch(request);
  }
};

async function handleProductRequest(request, env) {
  const requestUrl = new URL(request.url);

  // If accessed via legacy /product.html?id=..., issue 301 redirect to canonical /product?id=...
  if (requestUrl.pathname === "/product.html") {
    const id = requestUrl.searchParams.get("id");
    if (id) {
      const canonicalTarget = new URL(request.url);
      canonicalTarget.pathname = "/product";
      return Response.redirect(canonicalTarget.toString(), 301);
    }
    // If /product.html is requested with no query parameters, serve static asset
    return env.ASSETS.fetch(request);
  }

  const requestedId = (requestUrl.searchParams.get("id") || "").trim();

  // Missing or invalid ID -> HTTP 404
  if (!requestedId || requestedId.length > 160) {
    return notFoundResponse();
  }

  const resolvedId = resolveProductAlias(requestedId);
  const config = await readStoreConfig(request, env);
  const product = await findPublishedProduct(request, env, resolvedId, config);

  // Unknown or unpublished product -> HTTP 404
  if (!product) {
    return notFoundResponse();
  }

  // Fetch static product.html template
  const templateRequest = new Request(new URL("/product.html", request.url), { method: "GET" });
  const templateResponse = await env.ASSETS.fetch(templateRequest);
  if (!templateResponse.ok) {
    return new Response("Product page template unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  const canonicalId = product.slug || product.id || requestedId;
  const canonicalUrl = `${SITE_ORIGIN}/product?id=${encodeURIComponent(canonicalId)}`;
  const templateHtml = await templateResponse.text();
  const html = renderProductPage(templateHtml, product, canonicalUrl, config);

  const headers = new Headers(templateResponse.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(html, { status: 200, headers });
}

async function findPublishedProduct(request, env, requestedId, config) {
  try {
    const supabaseUrl = env?.SUPABASE_URL || config.supabaseUrl;
    const supabaseAnonKey = env?.SUPABASE_ANON_KEY || config.supabaseAnonKey;

    if (supabaseUrl && supabaseAnonKey) {
      const endpoint = new URL("/rest/v1/products", supabaseUrl);
      endpoint.searchParams.set("select", "*");
      endpoint.searchParams.set("status", "eq.available");
      const response = await fetch(endpoint.toString(), {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: "application/json"
        }
      });

      if (response.ok) {
        const rows = await response.json();
        const match = Array.isArray(rows)
          ? rows.find(row => row.id === requestedId || row.slug === requestedId)
          : null;
        if (match) return normalizeProduct(match);

        // A successful public query is authoritative. Falling back here could
        // expose a seeded product after it has been unpublished in Supabase.
        return null;
      }
    }
  } catch (error) {
    console.warn("[Printable3D] Server-rendered product lookup used local fallback.", error);
  }

  return findLocalProduct(requestedId);
}

function findLocalProduct(requestedId) {
  const row = INITIAL_PRODUCTS.find(product =>
    (product.id === requestedId || product.slug === requestedId) && product.status === "available"
  );
  return row ? normalizeProduct(row) : null;
}

function resolveProductAlias(productId) {
  const aliases = {
    "lunar-moon-lamp": "3d-printed-lamp",
    "moon-lamp": "3d-printed-lamp",
    "phone-stand": "3d-printed-phone-stand",
    "mini-garage-key-holder": "3d-printed-car-key-holder",
    "mini-garage": "3d-printed-car-key-holder",
    "cute-ghost": "3d-printed-cute-ghost",
    "ghost": "3d-printed-cute-ghost"
  };
  return aliases[productId.toLowerCase()] || productId;
}

async function readStoreConfig(request, env) {
  const defaults = {
    supabaseUrl: env?.SUPABASE_URL || "https://dquvwlccuwzrrdhetuwz.supabase.co",
    supabaseAnonKey: env?.SUPABASE_ANON_KEY || "sb_publishable_clMFy-Vp3NowghS3c38pXw_cIzWlTIp",
    currencyCode: "INR",
    currencySymbol: "₹"
  };

  try {
    const response = await env.ASSETS.fetch(
      new Request(new URL("/js/config.js", request.url), { method: "GET" })
    );
    if (!response.ok) return defaults;
    const source = await response.text();
    const getString = (key, text = source) => {
      const property = text.match(new RegExp(`\\b${key}\\s*:\\s*([^,\\r\\n}]+)`));
      if (!property) return "";
      const values = [...property[1].matchAll(/["']([^"']+)["']/g)];
      return values.length ? values[values.length - 1][1] : "";
    };
    const currencyBlock = source.match(/currency\s*:\s*\{([^}]*)\}/i);
    return {
      supabaseUrl: env?.SUPABASE_URL || getString("supabaseUrl").replace(/\/$/, "") || defaults.supabaseUrl,
      supabaseAnonKey: env?.SUPABASE_ANON_KEY || getString("supabaseAnonKey") || defaults.supabaseAnonKey,
      currencyCode: (currencyBlock && getString("code", currencyBlock[1])) || defaults.currencyCode,
      currencySymbol: (currencyBlock && getString("symbol", currencyBlock[1])) || defaults.currencySymbol
    };
  } catch {
    return defaults;
  }
}

function renderProductPage(template, product, canonicalUrl, config) {
  const title = `${product.name} | ${SITE_NAME}`;
  const description = product.shortDescription || product.fullDescription || product.name;
  const imageUrls = getProductImages(product);

  let html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:type", "product");
  html = setMeta(html, "property", "og:url", canonicalUrl);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  if (imageUrls.length) html = setMeta(html, "property", "og:image", imageUrls[0]);
  html = setCanonical(html, canonicalUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: SITE_NAME }
  };
  if (description) jsonLd.description = product.fullDescription || description;
  if (imageUrls.length) jsonLd.image = imageUrls;
  const price = Number(product.price);
  if (Number.isFinite(price) && price > 0) {
    jsonLd.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      price: String(price),
      priceCurrency: config.currencyCode || "INR"
    };
  }
  const jsonLdScript = `<script id="productJsonLd" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`;
  html = html.replace(/<\/head>/i, `${jsonLdScript}\n</head>`);

  html = replaceElementContent(html, "detailTitle", escapeHtml(product.name));
  html = replaceElementContent(html, "detailBreadcrumbTitle", escapeHtml(product.name));
  html = replaceElementContent(html, "detailPrice", `${escapeHtml(config.currencySymbol || "₹")}${escapeHtml(String(product.price))}`);
  html = replaceElementContent(html, "detailOriginalPrice", product.originalPrice
    ? `${escapeHtml(config.currencySymbol || "₹")}${escapeHtml(String(product.originalPrice))}`
    : "");
  html = replaceElementContent(html, "detailFullDesc", escapeHtml(product.fullDescription || description));

  const firstImage = imageUrls[0];
  if (firstImage) {
    html = html.replace(/<img\b[^>]*\bid=["']detailMainImage["'][^>]*>/i, tag =>
      setAttribute(setAttribute(tag, "src", firstImage), "alt", product.name)
    );
  }
  const categoryUrl = `/shop?category=${encodeURIComponent(product.category || "all")}`;
  html = html.replace(/<a\b[^>]*\bid=["']detailBreadcrumbCat["'][^>]*>[\s\S]*?<\/a>/i, tag =>
    setAttribute(replaceElementTextInTag(tag, escapeHtml(product.categoryName || "Shop")), "href", categoryUrl)
  );
  html = replaceElementContent(html, "detailRatingText", product.reviewsCount > 0
    ? `${Number(product.rating).toFixed(1)} (${Number(product.reviewsCount)} verified orders)`
    : "");
  if (!(product.reviewsCount > 0)) {
    html = html.replace(/<div class="product-rating">/i, '<div class="product-rating" style="display:none">');
  }

  return html;
}

function getProductImages(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  return images.filter(image => typeof image === "string" && image.trim()).map(image => {
    try {
      return new URL(image, `${SITE_ORIGIN}/`).href;
    } catch {
      return "";
    }
  }).filter(Boolean);
}

function setMeta(html, attribute, key, value) {
  const escapedKey = escapeRegExp(key);
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${escapedKey}["'][^>]*>`, "i");
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function setCanonical(html, canonicalUrl) {
  const tag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  const pattern = /<link\b[^>]*rel=["']canonical["'][^>]*>/i;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function replaceElementContent(html, id, content) {
  const pattern = new RegExp(`(<([a-z][a-z0-9:-]*)\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>)[\\s\\S]*?(<\\/\\2>)`, "i");
  return html.replace(pattern, (_match, open, _tag, close) => `${open}${content}${close}`);
}

function replaceElementTextInTag(tag, text) {
  return tag.replace(/>([\s\S]*)<\/a>$/i, `>${text}</a>`);
}

function setAttribute(tag, name, value) {
  const escaped = escapeHtml(value);
  const pattern = new RegExp(`\\s${name}=["'][^"']*["']`, "i");
  const withoutAttribute = tag.replace(pattern, "");
  return withoutAttribute.replace(/\s*\/?>(?=\s*$)/, ` ${name}="${escaped}" />`);
}

function notFoundResponse() {
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="robots" content="noindex,follow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product Not Found | ${SITE_NAME}</title><meta name="description" content="This product is not available in the Printable3D catalogue."></head><body><main style="font-family:system-ui,sans-serif;max-width:540px;margin:4rem auto;padding:2rem;text-align:center;"><h1>Product Not Found</h1><p style="color:#64748b;margin:1rem 0 2rem;">The requested product is not available in our public catalogue.</p><a href="/shop" style="display:inline-block;padding:0.75rem 1.5rem;background:#F97316;color:#fff;text-decoration:none;border-radius:0.5rem;font-weight:600;">Browse Catalogue</a></main></body></html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
