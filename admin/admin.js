/**
 * Printable3D - Admin Dashboard Controller
 * -------------------------------------------------------------
 * Manages Supabase authentication, product CRUD operations,
 * multi-photo uploads with previews, status management, and RLS checks.
 */

document.addEventListener("DOMContentLoaded", () => {
  initAdminApp();
});

function initAdminApp() {
  // Screens
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");
  const configNoticeBox = document.getElementById("configNoticeBox");

  // Auth Elements
  const loginForm = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");
  const loginBtn = document.getElementById("btnAdminLogin");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginSpinner = document.getElementById("loginSpinner");
  const logoutBtn = document.getElementById("btnAdminLogout");
  const currentAdminEmail = document.getElementById("currentAdminEmail");

  // Table & Filter Elements
  const tableTbody = document.getElementById("adminProductsTbody");
  const searchInput = document.getElementById("adminSearchInput");
  const filteredCountEl = document.getElementById("adminFilteredCount");
  const statCards = document.querySelectorAll(".stat-card");
  const statTotal = document.getElementById("statCountTotal");
  const statAvailable = document.getElementById("statCountAvailable");
  const statDraft = document.getElementById("statCountDraft");
  const statUnavailable = document.getElementById("statCountUnavailable");

  // Product Form Modal Elements
  const formModal = document.getElementById("productFormModal");
  const btnOpenAdd = document.getElementById("btnOpenAddModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnCancelModal = document.getElementById("btnCancelModal");
  const modalFormTitle = document.getElementById("modalFormTitle");
  const productForm = document.getElementById("productForm");

  // Form Inputs
  const formId = document.getElementById("formProductId");
  const formName = document.getElementById("formProductName");
  const formSlug = document.getElementById("formProductSlug");
  const formPrice = document.getElementById("formProductPrice");
  const formOriginalPrice = document.getElementById("formOriginalPrice");
  const formShippingInfo = document.getElementById("formShippingInfo");
  const formCategory = document.getElementById("formProductCategory");
  const formShortDesc = document.getElementById("formShortDesc");
  const formFullDesc = document.getElementById("formFullDesc");
  const formFeatures = document.getElementById("formFeatures");
  const btnSaveProduct = document.getElementById("btnSaveProduct");
  const saveBtnText = document.getElementById("saveBtnText");
  const saveSpinner = document.getElementById("saveSpinner");

  // Photo Management Elements
  const dropzone = document.getElementById("imageDropzone");
  const fileInput = document.getElementById("photoFileInput");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const manualUrlInput = document.getElementById("manualImageUrlInput");
  const btnAddManual = document.getElementById("btnAddManualImage");

  // Delete Modal Elements
  const deleteModal = document.getElementById("deleteConfirmModal");
  const deleteProductName = document.getElementById("deleteProductName");
  const btnConfirmDelete = document.getElementById("btnConfirmDelete");
  const btnCancelDelete = document.getElementById("btnCancelDelete");
  const btnCloseDeleteModal = document.getElementById("btnCloseDeleteModal");
  const deleteBtnText = document.getElementById("deleteBtnText");
  const deleteSpinner = document.getElementById("deleteSpinner");

  // State
  let products = [];
  let currentFilter = "all";
  let currentSearch = "";
  let productToDeleteId = null;

  // Active form photos state: array of { url: string, file?: File }
  let currentFormPhotos = [];

  // Check Supabase configuration notice
  if (configNoticeBox) {
    if (!window.SupabaseService || !window.SupabaseService.isConfigured()) {
      configNoticeBox.style.display = "block";
    }
  }

  // Check existing session
  checkAuthSession();

  // ==========================================================
  // AUTHENTICATION LOGIC
  // ==========================================================
  async function checkAuthSession() {
    if (window.SupabaseService && window.SupabaseService.isConfigured()) {
      try {
        const user = await window.SupabaseService.getUser();
        if (user) {
          const check = await window.SupabaseService.checkIsAdmin(user.id);
          const isAdmin = typeof check === "object" ? check.isAdmin : !!check;
          if (isAdmin) {
            showDashboard(user.email);
            return;
          }
        }
      } catch (e) {
        console.warn("[Printable3D] Session check error:", e);
      }
    }
    showLogin();
  }

  function showLogin() {
    if (loginScreen) loginScreen.style.display = "flex";
    if (dashboardScreen) dashboardScreen.style.display = "none";
  }

  function showDashboard(email) {
    if (loginScreen) loginScreen.style.display = "none";
    if (dashboardScreen) dashboardScreen.style.display = "flex";
    if (currentAdminEmail) currentAdminEmail.textContent = email || "Admin";
    loadProducts();
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      setLoading(loginBtn, loginBtnText, loginSpinner, true, "Signing In...");

      try {
        if (!window.SupabaseService || !window.SupabaseService.isConfigured()) {
          // If Supabase not yet configured, allow demo access with a helpful notice
          showToast("Running in local preview mode. Configure Supabase in js/config.js for live production storage.", "info");
          showDashboard(email);
          return;
        }

        const data = await window.SupabaseService.login(email, password);
        showToast("Signed in successfully as authorized administrator.", "success");
        showDashboard(data.user.email);
      } catch (err) {
        showToast(err.message || "Failed to sign in. Please verify your credentials.", "error");
      } finally {
        setLoading(loginBtn, loginBtnText, loginSpinner, false, "Sign In to Dashboard");
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (window.SupabaseService) {
        await window.SupabaseService.logout();
      }
      showToast("Signed out successfully.");
      showLogin();
    });
  }

  // ==========================================================
  // PRODUCT LISTING & FILTERING
  // ==========================================================
  async function loadProducts() {
    try {
      products = await ProductService.getAllAdmin();
      updateMetrics();
      renderTable();
    } catch (err) {
      showToast("Error loading products: " + err.message, "error");
    }
  }

  function updateMetrics() {
    const total = products.length;
    const available = products.filter(p => p.status === "available").length;
    const draft = products.filter(p => p.status === "draft").length;
    const unavailable = products.filter(p => p.status === "unavailable").length;

    if (statTotal) statTotal.textContent = total;
    if (statAvailable) statAvailable.textContent = available;
    if (statDraft) statDraft.textContent = draft;
    if (statUnavailable) statUnavailable.textContent = unavailable;
  }

  function renderTable() {
    if (!tableTbody) return;

    let filtered = products.filter(p => {
      if (currentFilter !== "all" && p.status !== currentFilter) return false;
      if (currentSearch) {
        const q = currentSearch.toLowerCase().trim();
        const inName = (p.name || "").toLowerCase().includes(q);
        const inSlug = (p.slug || "").toLowerCase().includes(q);
        const inCat = (p.categoryName || "").toLowerCase().includes(q);
        return inName || inSlug || inCat;
      }
      return true;
    });

    if (filteredCountEl) {
      filteredCountEl.textContent = `Showing ${filtered.length} of ${products.length} products`;
    }

    if (filtered.length === 0) {
      tableTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem 1rem; color: var(--admin-text-muted);">
            No products match the selected filter.
          </td>
        </tr>
      `;
      return;
    }

    tableTbody.innerHTML = filtered.map(product => {
      const thumb = (product.images && product.images[0]) || "images/products/phone-stand-1.jpg";
      const statusClass = product.status === "available" ? "status-available" : product.status === "draft" ? "status-draft" : "status-unavailable";
      const statusText = product.status === "available" ? "Available" : product.status === "draft" ? "Draft" : "Unavailable";
      const liveUrl = `../product.html?id=${encodeURIComponent(product.slug || product.id)}`;

      return `
        <tr>
          <td>
            <div class="product-row-info">
              <div class="product-row-thumb">
                <img
                  src="${thumb}"
                  alt="${product.name}"
                  onerror="this.onerror=null; this.src='${ProductService.getFallbackSvg(product.svgType, product.name)}';"
                />
              </div>
              <div>
                <div class="product-row-title">${product.name}</div>
                <div class="product-row-slug">/${product.slug || product.id}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-weight: 600;">${product.categoryName}</span>
          </td>
          <td>
            <div>
              <span style="font-weight: 700; font-size: 0.95rem;">${STORE_CONFIG.currency.symbol}${product.price}</span>
              ${product.originalPrice ? `<span style="font-size: 0.8rem; color: var(--admin-text-muted); text-decoration: line-through; margin-left: 0.35rem;">${STORE_CONFIG.currency.symbol}${product.originalPrice}</span>` : ""}
            </div>
            <div style="font-size: 0.75rem; color: var(--admin-text-muted);">
              ${product.shippingInfo || 'Additional shipping charges'}
            </div>
          </td>
          <td>
            <span class="status-pill ${statusClass}">${statusText}</span>
          </td>
          <td style="text-align: right;">
            <div class="row-actions" style="justify-content: flex-end;">
              ${product.status === "available" ? `
                <a href="${liveUrl}" target="_blank" class="btn-action-icon" title="View published item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </a>
              ` : ''}
              <button type="button" class="btn-action-icon btn-edit-product" data-id="${product.id}" title="Edit product">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="btn-action-icon btn-action-delete" data-id="${product.id}" data-name="${product.name}" title="Delete product">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Bind Edit Buttons
    tableTbody.querySelectorAll(".btn-edit-product").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        openEditProductModal(id);
      });
    });

    // Bind Delete Buttons
    tableTbody.querySelectorAll(".btn-action-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const name = btn.getAttribute("data-name");
        openDeleteModal(id, name);
      });
    });
  }

  // Search input live handler
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderTable();
    });
  }

  // Stat card filter pills
  statCards.forEach(card => {
    card.addEventListener("click", () => {
      statCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentFilter = card.getAttribute("data-status-filter") || "all";
      renderTable();
    });
  });

  // ==========================================================
  // ADD / EDIT MODAL & FORM LOGIC
  // ==========================================================
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener("click", () => {
      openAddProductModal();
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener("click", closeFormModal);
  if (btnCancelModal) btnCancelModal.addEventListener("click", closeFormModal);

  function openAddProductModal() {
    modalFormTitle.textContent = "Add New Product";
    formId.value = "";
    productForm.reset();
    formShippingInfo.value = "Additional shipping charges";
    currentFormPhotos = [];
    renderPhotoPreviews();
    formModal.classList.add("open");
  }

  function openEditProductModal(id) {
    const product = products.find(p => p.id === id || p.slug === id);
    if (!product) return;

    modalFormTitle.textContent = "Edit Product: " + product.name;
    formId.value = product.id;
    formName.value = product.name || "";
    formSlug.value = product.slug || "";
    formPrice.value = product.price || "";
    formOriginalPrice.value = product.originalPrice || "";
    formShippingInfo.value = product.shippingInfo || "Additional shipping charges";
    formCategory.value = product.category || "lamps";
    formShortDesc.value = product.shortDescription || "";
    formFullDesc.value = product.fullDescription || "";

    // Set Status radio
    const statusRadio = productForm.querySelector(`input[name="productStatus"][value="${product.status || 'available'}"]`);
    if (statusRadio) statusRadio.checked = true;

    // Set Features
    if (product.features && Array.isArray(product.features)) {
      formFeatures.value = product.features.join("\n");
    } else {
      formFeatures.value = "";
    }

    // Set Photos
    currentFormPhotos = (product.images || []).map(url => ({ url }));
    renderPhotoPreviews();

    formModal.classList.add("open");
  }

  function closeFormModal() {
    formModal.classList.remove("open");
  }

  // Photo Upload & Preview
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelected(e.target.files);
      }
    });
  }

  function handleFilesSelected(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const previewUrl = URL.createObjectURL(file);
      currentFormPhotos.push({
        url: previewUrl,
        file: file,
        isNew: true
      });
    });
    renderPhotoPreviews();
  }

  if (btnAddManual && manualUrlInput) {
    btnAddManual.addEventListener("click", () => {
      const url = manualUrlInput.value.trim();
      if (url) {
        currentFormPhotos.push({ url });
        manualUrlInput.value = "";
        renderPhotoPreviews();
      }
    });
  }

  function renderPhotoPreviews() {
    if (!previewContainer) return;

    if (currentFormPhotos.length === 0) {
      previewContainer.innerHTML = `<div style="font-size: 0.8125rem; color: var(--admin-text-muted); grid-column: 1 / -1;">No photos added yet. Upload at least one product photo.</div>`;
      return;
    }

    previewContainer.innerHTML = currentFormPhotos.map((photo, idx) => `
      <div class="image-preview-item" title="Photo ${idx + 1}">
        <img src="${photo.url}" alt="Preview" />
        <button type="button" class="btn-remove-image" data-index="${idx}" title="Remove photo">&times;</button>
      </div>
    `).join("");

    previewContainer.querySelectorAll(".btn-remove-image").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        currentFormPhotos.splice(idx, 1);
        renderPhotoPreviews();
      });
    });
  }

  // Handle Form Submission (Save / Update)
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = formName.value.trim();
      const price = parseFloat(formPrice.value);
      const originalPrice = formOriginalPrice.value ? parseFloat(formOriginalPrice.value) : null;
      const shippingInfo = formShippingInfo.value.trim() || "Additional shipping charges";
      const category = formCategory.value;
      const categoryName = formCategory.options[formCategory.selectedIndex].text;
      const status = productForm.querySelector('input[name="productStatus"]:checked').value;
      const shortDesc = formShortDesc.value.trim();
      const fullDesc = formFullDesc.value.trim();

      // Features from textarea
      const features = formFeatures.value
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

      // Slug generation
      let slug = formSlug.value.trim();
      if (!slug) {
        slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }

      if (currentFormPhotos.length === 0) {
        showToast("Please upload or add at least one product photo.", "error");
        return;
      }

      setLoading(btnSaveProduct, saveBtnText, saveSpinner, true, "Saving...");

      try {
        // Upload new files to Supabase Storage
        const finalImages = [];
        for (const photo of currentFormPhotos) {
          if (photo.file && window.SupabaseService && window.SupabaseService.isConfigured()) {
            const uploadedUrl = await window.SupabaseService.uploadProductImage(photo.file, slug);
            finalImages.push(uploadedUrl);
          } else {
            finalImages.push(photo.url);
          }
        }

        const productPayload = {
          name,
          slug,
          category,
          category_name: categoryName,
          categoryName: categoryName,
          price,
          original_price: originalPrice,
          originalPrice: originalPrice,
          shipping_info: shippingInfo,
          shippingInfo: shippingInfo,
          status,
          short_description: shortDesc,
          shortDescription: shortDesc,
          full_description: fullDesc,
          fullDescription: fullDesc,
          features,
          images: finalImages
        };

        const existingId = formId.value;
        if (existingId) {
          // Update
          await window.SupabaseService.updateProduct(existingId, productPayload);
          showToast(`"${name}" updated successfully.`, "success");
        } else {
          // Insert
          await window.SupabaseService.insertProduct(productPayload);
          showToast(`"${name}" added successfully.`, "success");
        }

        closeFormModal();
        await loadProducts();
      } catch (err) {
        showToast("Save failed: " + err.message, "error");
      } finally {
        setLoading(btnSaveProduct, saveBtnText, saveSpinner, false, "Save Product");
      }
    });
  }

  // ==========================================================
  // DELETE CONFIRMATION LOGIC
  // ==========================================================
  function openDeleteModal(id, name) {
    productToDeleteId = id;
    if (deleteProductName) deleteProductName.textContent = `"${name}"`;
    if (deleteModal) deleteModal.classList.add("open");
  }

  function closeDeleteModal() {
    productToDeleteId = null;
    if (deleteModal) deleteModal.classList.remove("open");
  }

  if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener("click", closeDeleteModal);
  if (btnCancelDelete) btnCancelDelete.addEventListener("click", closeDeleteModal);

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener("click", async () => {
      if (!productToDeleteId) return;

      setLoading(btnConfirmDelete, deleteBtnText, deleteSpinner, true, "Deleting...");
      try {
        await window.SupabaseService.deleteProduct(productToDeleteId);
        showToast("Product deleted permanently.", "success");
        closeDeleteModal();
        await loadProducts();
      } catch (err) {
        showToast("Delete failed: " + err.message, "error");
      } finally {
        setLoading(btnConfirmDelete, deleteBtnText, deleteSpinner, false, "Delete Forever");
      }
    });
  }

  // ==========================================================
  // HELPER UTILITIES
  // ==========================================================
  function setLoading(btn, textEl, spinnerEl, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (textEl) textEl.textContent = text;
    if (spinnerEl) spinnerEl.style.display = isLoading ? "inline-block" : "none";
  }

  function showToast(message, type = "info") {
    const toast = document.getElementById("adminToast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = "admin-toast show";
    if (type === "error") toast.classList.add("error");
    if (type === "success") toast.classList.add("success");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }
}
