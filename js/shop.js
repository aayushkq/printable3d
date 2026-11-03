/**
 * Printable3D - Shop Catalogue Logic
 * -------------------------------------------------------------
 * Displays published products dynamically from Supabase (or fallback),
 * powers live search, category filtering, price sorting,
 * separate shipping charges, and WhatsApp pre-filled orders.
 */

document.addEventListener("DOMContentLoaded", () => {
  initShopPage();
});

async function initShopPage() {
  const gridContainer = document.getElementById("shopProductsGrid");
  const searchInput = document.getElementById("shopSearchInput");
  const filterPillsRow = document.querySelector(".filter-categories-row");
  const sortSelect = document.getElementById("shopSortSelect");
  const countDisplay = document.getElementById("resultsCount");
  const emptyState = document.getElementById("shopEmptyState");

  if (!gridContainer) return;

  // Show loading skeleton / indicator
  gridContainer.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
      <div style="display: inline-block; width: 28px; height: 28px; border: 3px solid var(--border-light); border-top-color: var(--brand-dark); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 0.75rem;"></div>
      <p style="font-weight: 600; font-size: 0.9375rem;">Loading products...</p>
    </div>
  `;

  // Fetch published products (status = 'available' only)
  let publishedProducts = [];
  try {
    publishedProducts = await ProductService.getPublished();
  } catch (e) {
    console.warn("[Printable3D] Fallback to sync published items:", e);
    publishedProducts = ProductService.getPublishedSync();
  }

  // State
  let currentCategory = "all";
  let currentQuery = "";
  let currentSort = "featured";

  // Check URL query parameters (e.g. ?category=lamps or ?q=phone)
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get("category");
  const initialQuery = urlParams.get("q");

  if (initialCategory) {
    currentCategory = initialCategory;
  }
  if (initialQuery) {
    currentQuery = initialQuery;
    if (searchInput) searchInput.value = initialQuery;
  }

  // Populate dynamic category pills based on published products
  if (filterPillsRow) {
    const uniqueCategories = [
      { id: "all", name: "All Products" }
    ];

    publishedProducts.forEach(p => {
      if (!uniqueCategories.some(c => c.id === p.category)) {
        uniqueCategories.push({
          id: p.category,
          name: p.categoryName || (p.category.charAt(0).toUpperCase() + p.category.slice(1))
        });
      }
    });

    filterPillsRow.innerHTML = uniqueCategories.map(cat => `
      <button
        type="button"
        class="category-filter-btn ${cat.id === currentCategory ? 'active' : ''}"
        data-category="${cat.id}"
      >${cat.name}</button>
    `).join("");

    const newFilterButtons = filterPillsRow.querySelectorAll(".category-filter-btn");
    newFilterButtons.forEach(button => {
      button.addEventListener("click", () => {
        newFilterButtons.forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        currentCategory = button.dataset.category || "all";
        renderCatalogue();
      });
    });
  }

  // Render function
  function renderCatalogue() {
    let filtered = publishedProducts.filter(p => {
      // Category filter
      if (currentCategory !== "all" && p.category !== currentCategory) {
        return false;
      }
      // Search query
      if (currentQuery) {
        const q = currentQuery.toLowerCase().trim();
        const inName = p.name.toLowerCase().includes(q);
        const inDesc = (p.shortDescription || "").toLowerCase().includes(q) || (p.fullDescription || "").toLowerCase().includes(q);
        const inCat = (p.categoryName || "").toLowerCase().includes(q);
        return inName || inDesc || inCat;
      }
      return true;
    });

    // Apply Sorting
    if (currentSort === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (currentSort === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (currentSort === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Featured / default
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    // Update count display
    if (countDisplay) {
      countDisplay.textContent = `Showing ${filtered.length} of ${publishedProducts.length} published products`;
    }

    // Show empty state if no products match
    if (filtered.length === 0) {
      gridContainer.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    } else {
      if (emptyState) emptyState.style.display = "none";
    }

    // Generate HTML for product cards
    gridContainer.innerHTML = filtered.map(product => createProductCardHtml(product)).join("");

    // Setup fallback error listeners on new images
    const images = gridContainer.querySelectorAll("img[data-svg-type]");
    images.forEach(img => {
      img.addEventListener("error", function () {
        const type = img.getAttribute("data-svg-type") || "cube";
        const name = img.getAttribute("alt") || "Printable3D Item";
        this.src = ProductService.getFallbackSvg(type, name);
      });
    });
  }

  // Create Product Card HTML
  function createProductCardHtml(product) {
    const detailUrl = `product.html?id=${encodeURIComponent(product.slug || product.id)}`;
    const whatsAppUrl = STORE_CONFIG.getWhatsAppOrderUrl({
      productName: product.name,
      price: product.price,
      productId: product.slug || product.id,
      color: product.colors && product.colors[0] ? product.colors[0].name : "Standard",
      shippingInfo: product.shippingInfo || "Additional shipping charges"
    });

    let badgeClass = "badge-bestseller";
    if (product.badge === "New") badgeClass = "badge-new";
    if (product.badge === "Trending" || product.badge === "Popular") badgeClass = "badge-trending";
    if (product.badge === "Utility" || product.badge === "Essential") badgeClass = "badge-tech";

    const badgeHtml = product.badge
      ? `<div class="product-badge-pos"><span class="badge ${badgeClass}">${product.badge}</span></div>`
      : "";

    const primaryImage = (product.images && product.images[0]) || "images/products/phone-stand-1.jpg";

    return `
      <article class="product-card" data-category="${product.category}">
        <div class="product-media">
          ${badgeHtml}
          <a href="${detailUrl}" aria-label="View ${product.name}">
            <img
              src="${primaryImage}"
              alt="${product.name}"
              loading="lazy"
              data-svg-type="${product.svgType || 'cube'}"
              onerror="this.onerror=null; this.src='${ProductService.getFallbackSvg(product.svgType, product.name)}';"
            />
          </a>
        </div>
        <div class="product-content">
          <div class="product-cat">${product.categoryName}</div>
          <h3 class="product-title">
            <a href="${detailUrl}">${product.name}</a>
          </h3>
          <div class="product-rating">
            <span class="rating-stars">
              <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <span><strong>${product.rating.toFixed(1)}</strong> (${product.reviewsCount})</span>
          </div>
          <p class="product-desc-short">${product.shortDescription || ''}</p>

          <!-- Price & Separate Shipping Info Display -->
          <div class="product-price-row">
            <span class="product-price">${STORE_CONFIG.currency.symbol}${product.price}</span>
            ${product.originalPrice ? `<span class="product-price-original">${STORE_CONFIG.currency.symbol}${product.originalPrice}</span>` : ""}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            <span>+ ${product.shippingInfo || 'Additional shipping charges'}</span>
          </div>

          <div class="product-actions">
            <a href="${detailUrl}" class="btn-card-view">Details</a>
            <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-whatsapp" title="Order via WhatsApp">
              <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              <span>Order</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  // Search input live handler with debouncing
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentQuery = e.target.value;
        renderCatalogue();
      }, 150);
    });
  }

  // Sort select handler
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderCatalogue();
    });
  }

  // Initial render
  renderCatalogue();
}
