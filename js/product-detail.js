/**
 * Printable3D - Product Detail View Controller
 * -------------------------------------------------------------
 * Displays product data dynamically from Supabase (or fallback),
 * handles multi-photo gallery switcher, color swatches,
 * separate shipping display, and real-time WhatsApp pre-filled order.
 */

document.addEventListener("DOMContentLoaded", () => {
  initProductDetailPage();
});

async function initProductDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  // DOM Elements
  const breadcrumbCategory = document.getElementById("detailBreadcrumbCat");
  const breadcrumbTitle = document.getElementById("detailBreadcrumbTitle");
  const mainImage = document.getElementById("detailMainImage");
  const thumbsContainer = document.getElementById("detailThumbnails");
  const titleEl = document.getElementById("detailTitle");
  const badgeContainer = document.getElementById("detailBadgeContainer");
  const priceEl = document.getElementById("detailPrice");
  const originalPriceEl = document.getElementById("detailOriginalPrice");
  const ratingEl = document.getElementById("detailRatingText");
  const descEl = document.getElementById("detailFullDesc");
  const swatchesContainer = document.getElementById("detailSwatches");
  const selectedColorText = document.getElementById("detailSelectedColorName");
  const qtyDisplay = document.getElementById("detailQtyDisplay");
  const btnQtyMinus = document.getElementById("btnQtyMinus");
  const btnQtyPlus = document.getElementById("btnQtyPlus");
  const btnWhatsApp = document.getElementById("detailWhatsAppBtn");
  const specsTableBody = document.getElementById("detailSpecsBody");
  const relatedGrid = document.getElementById("relatedProductsGrid");

  // Fetch product dynamically
  let product = null;
  try {
    product = await ProductService.getById(productId || "3d-printed-lamp");
  } catch (e) {
    product = ProductService.getByIdSync(productId || "3d-printed-lamp");
  }

  // If still not found or draft
  if (!product) {
    const mainSection = document.querySelector(".product-detail-section .container");
    if (mainSection) {
      mainSection.innerHTML = `
        <div style="text-align: center; padding: 5rem 1.5rem; background-color: var(--bg-surface); border: 1px dashed var(--border-light); border-radius: var(--radius-lg); margin: 2rem auto; max-width: 600px;">
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--brand-dark);">Product Unavailable</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            This product is either currently in draft stage or no longer available in our public catalogue.
          </p>
          <a href="shop.html" class="btn btn-primary">Browse Available Products</a>
        </div>
      `;
    }
    return;
  }

  // Set page meta title dynamically
  document.title = `${product.name} | Printable3D`;

  // State
  let selectedColor = product.colors && product.colors.length > 0 ? product.colors[0].name : "Standard";
  let quantity = 1;

  // Populate Breadcrumbs
  if (breadcrumbCategory) {
    breadcrumbCategory.textContent = product.categoryName;
    breadcrumbCategory.href = `shop.html?category=${encodeURIComponent(product.category)}`;
  }
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = product.name;
  }

  // Populate Title & Badges
  if (titleEl) titleEl.textContent = product.name;
  if (badgeContainer) {
    if (product.badge) {
      let badgeClass = "badge-bestseller";
      if (product.badge.toLowerCase().includes("new")) badgeClass = "badge-new";
      if (product.badge.toLowerCase().includes("draft")) badgeClass = "badge-trending";
      badgeContainer.innerHTML = `<span class="badge ${badgeClass}">${product.badge}</span>`;
    } else {
      badgeContainer.innerHTML = "";
    }
  }

  // Populate Pricing & Separate Shipping Info
  if (priceEl) priceEl.textContent = `${STORE_CONFIG.currency.symbol}${product.price}`;
  if (originalPriceEl) {
    if (product.originalPrice) {
      originalPriceEl.textContent = `${STORE_CONFIG.currency.symbol}${product.originalPrice}`;
      originalPriceEl.style.display = "inline";
    } else {
      originalPriceEl.style.display = "none";
    }
  }

  // Insert or update separate shipping badge right next to pricing
  const priceBox = document.querySelector(".detail-price-box");
  if (priceBox) {
    let shippingNoteEl = document.getElementById("detailShippingInfo");
    if (!shippingNoteEl) {
      shippingNoteEl = document.createElement("div");
      shippingNoteEl.id = "detailShippingInfo";
      shippingNoteEl.style.cssText = "font-size: 0.8125rem; color: #B45309; background: #FEF3C7; padding: 0.25rem 0.65rem; border-radius: var(--radius-full); font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;";
      priceBox.appendChild(shippingNoteEl);
    }
    shippingNoteEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
      <span>+ ${product.shippingInfo || 'Additional shipping charges'}</span>
    `;
  }

  if (ratingEl) {
    if (product.reviewsCount && product.reviewsCount > 0) {
      ratingEl.textContent = `${product.rating.toFixed(1)} (${product.reviewsCount} verified orders)`;
      const ratingWrap = ratingEl.closest(".product-rating");
      if (ratingWrap) ratingWrap.style.display = "flex";
    } else {
      const ratingWrap = ratingEl.closest(".product-rating");
      if (ratingWrap) ratingWrap.style.display = "none";
    }
  }

  // Populate Description & Features
  if (descEl) {
    let html = `<p>${product.fullDescription}</p>`;
    if (product.features && product.features.length > 0) {
      html += `
        <div style="margin-top: 1.25rem;">
          <h4 style="font-size: 0.9375rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--brand-dark);">Key Features:</h4>
          <ul style="list-style: disc; padding-left: 1.25rem; font-size: 0.9375rem; color: var(--text-secondary); line-height: 1.6;">
            ${product.features.map(f => `<li>${f}</li>`).join("")}
          </ul>
        </div>
      `;
    }
    descEl.innerHTML = html;
  }

  // Main Image
  const images = product.images && product.images.length > 0 ? product.images : ["images/products/phone-stand-1.jpg"];
  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = product.name;
    mainImage.setAttribute("data-svg-type", product.svgType || "cube");
    mainImage.onerror = function () {
      this.onerror = null;
      this.src = ProductService.getFallbackSvg(product.svgType, product.name);
    };
  }

  // Thumbnails
  if (thumbsContainer && images.length > 0) {
    thumbsContainer.innerHTML = images.map((imgSrc, idx) => `
      <div class="detail-thumb ${idx === 0 ? 'active' : ''}" data-index="${idx}">
        <img
          src="${imgSrc}"
          alt="${product.name} view ${idx + 1}"
          onerror="this.onerror=null; this.src='${ProductService.getFallbackSvg(product.svgType, product.name)}';"
        />
      </div>
    `).join("");

    const thumbs = thumbsContainer.querySelectorAll(".detail-thumb");
    thumbs.forEach(thumb => {
      thumb.addEventListener("click", () => {
        thumbs.forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
        const idx = parseInt(thumb.getAttribute("data-index"), 10);
        if (mainImage && images[idx]) {
          mainImage.src = images[idx];
        }
      });
    });
  }

  // Color Swatches
  if (swatchesContainer && product.colors && product.colors.length > 0) {
    swatchesContainer.innerHTML = product.colors.map((c, idx) => `
      <button
        type="button"
        class="swatch-btn ${idx === 0 ? 'active' : ''}"
        style="background-color: ${c.hex};"
        data-color-name="${c.name}"
        title="${c.name}"
        aria-label="Color ${c.name}"
      ></button>
    `).join("");

    const swatchBtns = swatchesContainer.querySelectorAll(".swatch-btn");
    swatchBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        swatchBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedColor = btn.dataset.colorName;
        if (selectedColorText) selectedColorText.textContent = selectedColor;
        updateWhatsAppLink();
      });
    });

    if (selectedColorText) selectedColorText.textContent = selectedColor;
  } else {
    // Hide color group if product has no color choices
    const swatchGroup = document.querySelector(".swatch-group");
    if (swatchGroup) swatchGroup.style.display = "none";
  }

  // Quantity Controls
  if (btnQtyMinus) {
    btnQtyMinus.addEventListener("click", () => {
      if (quantity > 1) {
        quantity--;
        if (qtyDisplay) qtyDisplay.textContent = quantity;
        updateWhatsAppLink();
      }
    });
  }
  if (btnQtyPlus) {
    btnQtyPlus.addEventListener("click", () => {
      if (quantity < 50) {
        quantity++;
        if (qtyDisplay) qtyDisplay.textContent = quantity;
        updateWhatsAppLink();
      }
    });
  }

  // Update WhatsApp link based on live state
  function updateWhatsAppLink() {
    if (!btnWhatsApp) return;
    const url = STORE_CONFIG.getWhatsAppOrderUrl({
      productName: product.name,
      price: product.price,
      productId: product.slug || product.id,
      color: selectedColor,
      quantity: quantity,
      shippingInfo: product.shippingInfo || "Additional shipping charges"
    });
    btnWhatsApp.href = url;
  }

  updateWhatsAppLink();

  // Populate Specifications Table
  if (specsTableBody) {
    const specEntries = [];

    if (product.specs) {
      if (product.specs.material) specEntries.push({ label: "Material Composition", value: product.specs.material });
      if (product.specs.layerHeight) specEntries.push({ label: "Layer Resolution", value: product.specs.layerHeight });
      if (product.specs.dimensions) specEntries.push({ label: "Physical Dimensions", value: product.specs.dimensions });
      if (product.specs.weight) specEntries.push({ label: "Product Weight", value: product.specs.weight });
      if (product.specs.lightSource) specEntries.push({ label: "Light Source", value: product.specs.lightSource });
      if (product.specs.compatibility) specEntries.push({ label: "Compatibility", value: product.specs.compatibility });
      if (product.specs.scale) specEntries.push({ label: "Display Scale", value: product.specs.scale });
      if (product.specs.hooks) specEntries.push({ label: "Hooks Capacity", value: product.specs.hooks });
      if (product.specs.mounting) specEntries.push({ label: "Mounting Option", value: product.specs.mounting });
      if (product.specs.care) specEntries.push({ label: "Care Instructions", value: product.specs.care });
    }

    const specsCard = specsTableBody.closest(".specs-card");
    if (specEntries.length === 0) {
      // Hide technical specifications card if product has no technical specs defined
      if (specsCard) specsCard.style.display = "none";
    } else {
      if (specsCard) specsCard.style.display = "block";
      // Always include shipping note in specs
      specEntries.push({ label: "Shipping Policy", value: product.shippingInfo || "Additional shipping charges (calculated by delivery pincode)" });

      specsTableBody.innerHTML = specEntries.map(spec => `
        <tr>
          <th>${spec.label}</th>
          <td>${spec.value}</td>
        </tr>
      `).join("");
    }
  }

  // Populate Related Published Products
  if (relatedGrid) {
    const published = await ProductService.getPublished();
    const related = published.filter(p => p.id !== product.id && p.slug !== product.slug);

    if (related.length === 0) {
      relatedGrid.parentElement.innerHTML = `
        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: var(--radius-lg); padding: 2.5rem 2rem; color: #FFFFFF; text-align: center; margin-top: 1rem;">
          <span class="badge badge-tech" style="margin-bottom: 0.75rem;">Custom 3D Printing</span>
          <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">Have a Custom Model or Idea?</h3>
          <p style="font-size: 0.9375rem; color: #CBD5E1; max-width: 580px; margin: 0 auto 1.5rem;">
            We print custom STL designs, personalized dimensions, and corporate batches. Chat with us on WhatsApp for an instant quote!
          </p>
          <a href="#" class="btn btn-whatsapp btn-lg js-whatsapp-direct">
            <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            <span>Request Custom 3D Print</span>
          </a>
        </div>
      `;
    } else {
      relatedGrid.innerHTML = related.map(relProduct => {
        const relUrl = `product.html?id=${encodeURIComponent(relProduct.slug || relProduct.id)}`;
        const relWaUrl = STORE_CONFIG.getWhatsAppOrderUrl({
          productName: relProduct.name,
          price: relProduct.price,
          productId: relProduct.slug || relProduct.id,
          color: relProduct.colors && relProduct.colors[0] ? relProduct.colors[0].name : "Standard",
          shippingInfo: relProduct.shippingInfo || "Additional shipping charges"
        });

        const relImg = (relProduct.images && relProduct.images[0]) || "images/products/phone-stand-1.jpg";

        return `
          <article class="product-card">
            <div class="product-media">
              <a href="${relUrl}">
                <img
                  src="${relImg}"
                  alt="${relProduct.name}"
                  loading="lazy"
                  data-svg-type="${relProduct.svgType || 'cube'}"
                  onerror="this.onerror=null; this.src='${ProductService.getFallbackSvg(relProduct.svgType, relProduct.name)}';"
                />
              </a>
            </div>
            <div class="product-content">
              <div class="product-cat">${relProduct.categoryName}</div>
              <h4 class="product-title"><a href="${relUrl}">${relProduct.name}</a></h4>
              <div class="product-price-row">
                <span class="product-price">${STORE_CONFIG.currency.symbol}${relProduct.price}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                + ${relProduct.shippingInfo || 'Additional shipping charges'}
              </div>
              <div class="product-actions">
                <a href="${relUrl}" class="btn-card-view">Details</a>
                <a href="${relWaUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-whatsapp">Order</a>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }
  }
}
