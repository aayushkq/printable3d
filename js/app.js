/**
 * Printable3D - Core Application Logic
 * -------------------------------------------------------------
 * Manages mobile drawer, header scroll effects, image fallbacks,
 * toast alerts, and dynamic config population.
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeSystem();
  initHeader();
  initMobileDrawer();
  initGlobalConfig();
  initHomePageProducts();
  initProductCardWhatsAppButtons();
  initImageFallbacks();
});

/**
 * Website Appearance & Theme System
 * Supports Admin global settings (Light/Dark/System Default), visitor theme toggle,
 * and real-time OS prefers-color-scheme adaptation.
 */
function initThemeSystem() {
  function getSystemPreference() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function resolveTheme() {
    const userTheme = localStorage.getItem("printable3d_user_theme");
    if (userTheme === "light" || userTheme === "dark") {
      return userTheme;
    }
    const siteTheme = localStorage.getItem("printable3d_theme") || "system";
    if (siteTheme === "system") {
      return getSystemPreference();
    }
    return siteTheme;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  // Initial apply
  applyTheme(resolveTheme());

  // Asynchronously sync global setting from Supabase if configured
  if (window.SupabaseService && typeof window.SupabaseService.isConfigured === "function" && window.SupabaseService.isConfigured()) {
    window.SupabaseService.getSiteSetting("appearance").then(setting => {
      if (setting && setting.theme) {
        localStorage.setItem("printable3d_theme", setting.theme);
        // Only override if user hasn't personally clicked the toggle
        if (!localStorage.getItem("printable3d_user_theme")) {
          applyTheme(setting.theme === "system" ? getSystemPreference() : setting.theme);
        }
      }
    }).catch(() => {});
  }

  // Bind theme toggle buttons
  const toggleButtons = document.querySelectorAll(".js-theme-toggle");
  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      localStorage.setItem("printable3d_user_theme", nextTheme);
      applyTheme(nextTheme);
    });
  });

  // Listen to OS prefers-color-scheme changes
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      const userTheme = localStorage.getItem("printable3d_user_theme");
      const siteTheme = localStorage.getItem("printable3d_theme") || "system";
      if (!userTheme && siteTheme === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }
}

/**
 * Dynamically populates published products on the Homepage
 */
async function initHomePageProducts() {
  const featuredContainer = document.getElementById("featuredProductsGrid");
  if (!featuredContainer) return;

  try {
    const published = await ProductService.getPublished();
    if (!published || published.length === 0) return;

    // Render cards for all published products (e.g. Lamp and Phone Stand)
    featuredContainer.innerHTML = published.map(product => {
      const detailUrl = `product.html?id=${encodeURIComponent(product.slug || product.id)}`;
      const whatsAppUrl = STORE_CONFIG.getWhatsAppOrderUrl({
        productName: product.name,
        price: product.price,
        productId: product.slug || product.id,
        color: product.colors && product.colors[0] ? product.colors[0].name : "Standard",
        shippingInfo: product.shippingInfo || "Additional shipping charges"
      });

      const primaryImg = (product.images && product.images[0]) || "images/products/phone-stand-1.jpg";

      return `
        <article class="product-card" data-product-id="${product.id}">
          <div class="product-media">
            <div class="product-badge-pos"><span class="badge badge-bestseller">${product.badge || 'Published'}</span></div>
            <a href="${detailUrl}">
              <img
                src="${primaryImg}"
                alt="${product.name}"
                loading="lazy"
                data-svg-type="${product.svgType || 'cube'}"
                onerror="this.onerror=null; this.src='${ProductService.getFallbackSvg(product.svgType, product.name)}';"
              />
            </a>
          </div>
          <div class="product-content">
            <div class="product-cat">${product.categoryName}</div>
            <h3 class="product-title"><a href="${detailUrl}">${product.name}</a></h3>
            ${(product.reviewsCount && product.reviewsCount > 0) ? `
            <div class="product-rating">
              <span class="rating-stars"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
              <span><strong>${product.rating.toFixed(1)}</strong> (${product.reviewsCount})</span>
            </div>` : ""}
            <p class="product-desc-short">${product.shortDescription || ''}</p>
            <div class="product-price-row">
              <span class="product-price">${STORE_CONFIG.currency.symbol}${product.price}</span>
              ${product.originalPrice ? `<span class="product-price-original">${STORE_CONFIG.currency.symbol}${product.originalPrice}</span>` : ""}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
              + ${product.shippingInfo || 'Additional shipping charges'}
            </div>
            <div class="product-actions">
              <a href="${detailUrl}" class="btn-card-view">Details</a>
              <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-whatsapp">
                <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                <span>Order</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  } catch (err) {
    console.warn("[Printable3D] Home products render error:", err);
  }
}

/**
 * Handle sticky header scroll effects
 */
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}

/**
 * Mobile Navigation Drawer Toggle
 */
function initMobileDrawer() {
  const toggleBtn = document.getElementById("mobileToggle");
  const closeBtn = document.getElementById("drawerClose");
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("mobileBackdrop");

  if (!toggleBtn || !drawer || !backdrop) return;

  const openDrawer = () => {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const closeDrawer = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  };

  toggleBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  // Close on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  // Close when tapping a drawer link
  const drawerLinks = drawer.querySelectorAll(".drawer-link");
  drawerLinks.forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });
}

/**
 * Replace placeholders and bind WhatsApp numbers from STORE_CONFIG
 */
function initGlobalConfig() {
  if (typeof STORE_CONFIG === "undefined") return;

  // Set WhatsApp button links that have class .js-whatsapp-direct
  const whatsappDirectLinks = document.querySelectorAll(".js-whatsapp-direct");
  whatsappDirectLinks.forEach((el) => {
    const defaultMsg = encodeURIComponent(`Hello ${STORE_CONFIG.brandName}! I'm interested in browsing your 3D printed catalogue and custom printing options.`);
    el.href = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${defaultMsg}`;
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  });

  // Bind display phone numbers
  const phoneDisplays = document.querySelectorAll(".js-config-phone");
  phoneDisplays.forEach((el) => {
    el.textContent = STORE_CONFIG.whatsappDisplayNumber;
  });

  // Bind email addresses
  const emailDisplays = document.querySelectorAll(".js-config-email");
  emailDisplays.forEach((el) => {
    el.textContent = STORE_CONFIG.email;
    if (el.tagName === "A") {
      el.href = `mailto:${STORE_CONFIG.email}`;
    }
  });

  // Bind Instagram
  const instaDisplays = document.querySelectorAll(".js-config-insta");
  instaDisplays.forEach((el) => {
    el.textContent = STORE_CONFIG.instagramHandle;
    if (el.tagName === "A") {
      el.href = STORE_CONFIG.instagramUrl;
    }
  });

  // Year in footer
  const yearEl = document.getElementById("copyrightYear");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/**
 * Dynamically binds all static or dynamic cards to STORE_CONFIG.getWhatsAppOrderUrl
 */
function initProductCardWhatsAppButtons() {
  if (typeof STORE_CONFIG === "undefined" || typeof ProductService === "undefined") return;

  const cards = document.querySelectorAll(".product-card[data-product-id]");
  cards.forEach((card) => {
    const productId = card.getAttribute("data-product-id");
    // Use the synchronous method - static cards already have product data embedded;
    // this just updates the href for any cards that may have a placeholder '#' href
    const product = ProductService.getByIdSync(productId, false);
    const waBtn = card.querySelector(".btn-card-whatsapp");

    if (product && waBtn && waBtn.getAttribute("href") === "#") {
      const orderUrl = STORE_CONFIG.getWhatsAppOrderUrl({
        productName: product.name,
        price: product.price,
        productId: product.id,
        color: product.colors && product.colors[0] ? product.colors[0].name : "Standard"
      });
      waBtn.href = orderUrl;
      waBtn.target = "_blank";
      waBtn.rel = "noopener noreferrer";
    }
  });
}

/**
 * Robust image fallback for zero broken images
 */
function initImageFallbacks() {
  const images = document.querySelectorAll("img[data-svg-type]");
  images.forEach((img) => {
    img.addEventListener("error", function () {
      const type = img.getAttribute("data-svg-type") || "cube";
      const name = img.getAttribute("alt") || "Printable3D Item";
      if (typeof ProductService !== "undefined" && ProductService.getFallbackSvg) {
        this.src = ProductService.getFallbackSvg(type, name);
      }
    });
  });
}

/**
 * Toast Notification Utility
 */
function showToast(message, duration = 3000) {
  let toast = document.getElementById("siteToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "siteToast";
    toast.className = "toast-notice";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// Global exposure
window.showToast = showToast;
