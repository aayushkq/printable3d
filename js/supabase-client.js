/**
 * Printable3D - Supabase Client & API Helper
 * -------------------------------------------------------------
 * Provides authenticated Supabase access, RLS-compliant queries,
 * image upload to Supabase Storage, and fallback to local products.
 */

(function () {
  let supabaseInstance = null;

  function getClient() {
    if (supabaseInstance) return supabaseInstance;

    if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
      const rawUrl = (window.STORE_CONFIG && window.STORE_CONFIG.supabaseUrl) || "";
      const key = (window.STORE_CONFIG && window.STORE_CONFIG.supabaseAnonKey) || "";

      // Clean URL: strip /rest/v1, /rest/v1/ or trailing slashes
      const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

      // Check if credentials are valid and not placeholders
      const isConfigured = url && key &&
        !url.includes("your-project-id") &&
        !key.includes("YOUR_SUPABASE_ANON_PUBLIC_KEY");

      if (isConfigured) {
        try {
          supabaseInstance = window.supabase.createClient(url, key, {
            auth: {
              persistSession: true,
              autoRefreshToken: true
            }
          });
          return supabaseInstance;
        } catch (err) {
          console.warn("[Printable3D] Supabase client initialization error:", err);
        }
      }
    }
    return null;
  }

  const SupabaseService = {
    isConfigured: function () {
      return getClient() !== null;
    },

    getClient: getClient,

    // ==========================================================
    // AUTHENTICATION
    // ==========================================================
    login: async function (email, password) {
      const client = getClient();
      if (!client) {
        throw new Error("Supabase is not configured yet. Please enter your Supabase URL and anon key in js/config.js.");
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      // Check if user is an authorized admin in public.admin_users
      const check = await this.checkIsAdmin(data.user.id);
      if (check.tableMissing) {
        await client.auth.signOut();
        throw new Error("Database schema not installed yet. Please open Supabase SQL Editor and run supabase/schema.sql.");
      }
      if (!check.isAdmin) {
        // Sign them out immediately if not authorized as an admin
        await client.auth.signOut();
        throw new Error("Access denied: Your account is not authorized as an administrator. Please add your email to the admin_users table.");
      }

      return data;
    },

    logout: async function () {
      const client = getClient();
      if (client) {
        await client.auth.signOut();
      }
    },

    getSession: async function () {
      const client = getClient();
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data ? data.session : null;
    },

    getUser: async function () {
      const client = getClient();
      if (!client) return null;
      const { data } = await client.auth.getUser();
      return data ? data.user : null;
    },

    checkIsAdmin: async function (userId) {
      const client = getClient();
      if (!client) return { isAdmin: false, tableMissing: false };
      try {
        const { data, error } = await client
          .from("admin_users")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.warn("[Printable3D] Admin check warning:", error.message);
          const isTableMissing = error.code === "PGRST205" ||
            (error.message && error.message.toLowerCase().includes("could not find the table"));
          return { isAdmin: false, tableMissing: isTableMissing, error: error.message };
        }
        return { isAdmin: !!data, tableMissing: false };
      } catch (e) {
        return { isAdmin: false, tableMissing: false, error: e.message };
      }
    },

    // ==========================================================
    // PRODUCTS (DATABASE)
    // ==========================================================

    /**
     * Public visitor query: ONLY reads products where status = 'available'.
     * Draft and unavailable products are filtered out at the RLS database level.
     */
    getPublishedProducts: async function () {
      const client = getClient();
      if (!client) {
        // Return local available products from products.js
        if (typeof window !== "undefined" && window.LOCAL_PRODUCTS) {
          return window.LOCAL_PRODUCTS.filter(p => p.status === "available");
        }
        return [];
      }

      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Printable3D] Error fetching published products, falling back to local:", error.message);
        return (window.LOCAL_PRODUCTS || []).filter(p => p.status === "available");
      }

      return data || [];
    },

    /**
     * Admin query: reads all products (available, draft, unavailable).
     * Protected by RLS on Supabase.
     */
    getAllProductsAdmin: async function () {
      const client = getClient();
      if (!client) {
        return window.LOCAL_PRODUCTS || [];
      }

      const { data, error } = await client
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },

    /**
     * Fetch a single product by ID or Slug.
     * Public visitors will only receive it if status = 'available' (via RLS).
     */
    getProductByIdOrSlug: async function (idOrSlug, isAdmin = false) {
      const client = getClient();
      if (!client) {
        const all = window.LOCAL_PRODUCTS || [];
        const found = all.find(p => p.id === idOrSlug || p.slug === idOrSlug);
        if (!found) return null;
        if (!isAdmin && found.status !== "available") return null;
        return found;
      }

      let query = client.from("products").select("*");

      // Check if it's a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      if (isUuid) {
        query = query.or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
      } else {
        query = query.eq("slug", idOrSlug);
      }

      if (!isAdmin) {
        query = query.eq("status", "available");
      }

      const { data, error } = await query.maybeSingle();
      if (error) {
        console.warn("[Printable3D] Error fetching product:", error.message);
        return null;
      }
      return data;
    },

    /**
     * Helper to sanitize product payload to strict Supabase PostgreSQL schema columns.
     * Prevents PGRST204 errors when frontend passes camelCase convenience properties.
     */
    sanitizeProductPayload: function (p) {
      const payload = {};
      if (p.name !== undefined) payload.name = p.name;
      if (p.slug !== undefined) payload.slug = p.slug;
      if (p.category !== undefined) payload.category = p.category;
      if (p.category_name !== undefined || p.categoryName !== undefined) {
        payload.category_name = p.category_name || p.categoryName;
      }
      if (p.price !== undefined) payload.price = Number(p.price);
      if (p.original_price !== undefined || p.originalPrice !== undefined) {
        const op = p.original_price !== undefined ? p.original_price : p.originalPrice;
        payload.original_price = op ? Number(op) : null;
      }
      if (p.shipping_info !== undefined || p.shippingInfo !== undefined) {
        payload.shipping_info = p.shipping_info || p.shippingInfo;
      }
      if (p.status !== undefined) payload.status = p.status;
      if (p.short_description !== undefined || p.shortDescription !== undefined) {
        payload.short_description = p.short_description !== undefined ? p.short_description : p.shortDescription;
      }
      if (p.full_description !== undefined || p.fullDescription !== undefined) {
        payload.full_description = p.full_description !== undefined ? p.full_description : p.fullDescription;
      }
      if (p.features !== undefined) payload.features = Array.isArray(p.features) ? p.features : [];
      if (p.specs !== undefined) payload.specs = p.specs || {};
      if (p.colors !== undefined) payload.colors = Array.isArray(p.colors) ? p.colors : [];
      if (p.images !== undefined) payload.images = Array.isArray(p.images) ? p.images : [p.images];
      if (p.featured !== undefined) payload.featured = Boolean(p.featured);
      if (p.rating !== undefined) payload.rating = Number(p.rating);
      if (p.reviews_count !== undefined || p.reviewsCount !== undefined) {
        payload.reviews_count = Number(p.reviews_count !== undefined ? p.reviews_count : p.reviewsCount);
      }
      return payload;
    },

    /**
     * Insert product (Admin only)
     */
    insertProduct: async function (productData) {
      const sanitized = this.sanitizeProductPayload(productData);
      const client = getClient();
      if (!client) {
        // Fallback for offline demo mode
        const newProduct = {
          ...productData,
          ...sanitized,
          id: "local-" + Date.now(),
          created_at: new Date().toISOString()
        };
        if (window.LOCAL_PRODUCTS) {
          window.LOCAL_PRODUCTS.unshift(newProduct);
        }
        return newProduct;
      }

      const { data, error } = await client
        .from("products")
        .insert([sanitized])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * Update product (Admin only)
     */
    updateProduct: async function (id, updates) {
      const sanitized = this.sanitizeProductPayload(updates);
      const client = getClient();
      if (!client) {
        if (window.LOCAL_PRODUCTS) {
          const idx = window.LOCAL_PRODUCTS.findIndex(p => p.id === id || p.slug === id);
          if (idx !== -1) {
            window.LOCAL_PRODUCTS[idx] = { ...window.LOCAL_PRODUCTS[idx], ...updates, ...sanitized, updated_at: new Date().toISOString() };
            return window.LOCAL_PRODUCTS[idx];
          }
        }
        return null;
      }

      const { data, error } = await client
        .from("products")
        .update(sanitized)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * Delete product (Admin only)
     */
    deleteProduct: async function (id) {
      const client = getClient();
      if (!client) {
        if (window.LOCAL_PRODUCTS) {
          window.LOCAL_PRODUCTS = window.LOCAL_PRODUCTS.filter(p => p.id !== id && p.slug !== id);
        }
        return true;
      }

      const { error } = await client
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    },

    // ==========================================================
    // SITE SETTINGS (GLOBAL THEME & APPEARANCE)
    // ==========================================================
    getSiteSetting: async function (key) {
      const client = getClient();
      if (!client) {
        try {
          const local = localStorage.getItem("printable3d_setting_" + key);
          return local ? JSON.parse(local) : null;
        } catch (e) {
          return null;
        }
      }

      try {
        const { data, error } = await client
          .from("site_settings")
          .select("value")
          .eq("key", key)
          .maybeSingle();

        if (error) {
          console.warn("[Printable3D] site_settings query notice:", error.message);
          const local = localStorage.getItem("printable3d_setting_" + key);
          return local ? JSON.parse(local) : null;
        }
        if (data && data.value) {
          try {
            localStorage.setItem("printable3d_setting_" + key, JSON.stringify(data.value));
          } catch (e) {}
          return data.value;
        }
        return null;
      } catch (err) {
        const local = localStorage.getItem("printable3d_setting_" + key);
        return local ? JSON.parse(local) : null;
      }
    },

    saveSiteSetting: async function (key, value) {
      try {
        localStorage.setItem("printable3d_setting_" + key, JSON.stringify(value));
      } catch (e) {}

      const client = getClient();
      if (!client) return value;

      try {
        const { error } = await client
          .from("site_settings")
          .upsert({ key, value, updated_at: new Date().toISOString() });

        if (error) {
          console.warn("[Printable3D] Could not save site_setting to Supabase (using local):", error.message);
        }
      } catch (err) {
        console.warn("[Printable3D] Supabase site_settings save error:", err);
      }
      return value;
    },

    // ==========================================================
    // STORAGE (IMAGE UPLOADS)
    // ==========================================================

    /**
     * Upload an image to Supabase Storage with optimization
     * Supports JPG, JPEG, PNG, WEBP (up to 10MB)
     * @param {File|Blob} file - Image file to upload
     * @param {string} [customFileName] - Optional custom filename
     * @returns {Promise<string>} Public URL of uploaded image
     */
    uploadProductImage: async function (file, customFileName) {
      const client = getClient();
      if (!client) {
        throw new Error("Supabase is not configured. Please set up your Supabase project credentials in js/config.js.");
      }

      // Determine extension & MIME
      let ext = "jpg";
      let contentType = "image/jpeg";
      const rawExt = file.name ? file.name.split(".").pop().toLowerCase() : "";

      if (file.type === "image/png" || rawExt === "png") {
        ext = "png";
        contentType = "image/png";
      } else if (file.type === "image/webp" || rawExt === "webp") {
        ext = "webp";
        contentType = "image/webp";
      }

      // Optimize image (resizes to max 1920px width/height and compresses preserving high detail)
      const optimizedBlob = await this.optimizeImage(file, 1920, 0.88);

      const bucket = (window.STORE_CONFIG && window.STORE_CONFIG.supabaseStorageBucket) || "product-images";
      const cleanName = (customFileName || (file.name ? file.name.replace(/\.[^/.]+$/, "") : "product"))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      const uniquePath = `products/${Date.now()}-${cleanName}.${ext}`;

      const { data, error } = await client.storage
        .from(bucket)
        .upload(uniquePath, optimizedBlob, {
          cacheControl: "31536000",
          upsert: true,
          contentType: contentType
        });

      if (error) {
        if (error.statusCode === "404" || error.code === "NoSuchBucket" || (error.message && error.message.toLowerCase().includes("bucket not found"))) {
          throw new Error(`Storage bucket '${bucket}' not found. Please create a public bucket named '${bucket}' in Supabase Dashboard (Storage -> New bucket) or execute supabase/create_storage_bucket.sql in the SQL Editor.`);
        }
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = client.storage
        .from(bucket)
        .getPublicUrl(uniquePath);

      return publicUrlData.publicUrl;
    },

    /**
     * Delete image from storage bucket
     */
    deleteProductImage: async function (imageUrl) {
      const client = getClient();
      if (!client || !imageUrl) return false;

      const bucket = (window.STORE_CONFIG && window.STORE_CONFIG.supabaseStorageBucket) || "product-images";
      try {
        const urlObj = new URL(imageUrl);
        const pathParts = urlObj.pathname.split(`${bucket}/`);
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await client.storage.from(bucket).remove([filePath]);
          return true;
        }
      } catch (e) {
        console.warn("[Printable3D] Could not parse image URL for deletion:", e);
      }
      return false;
    },

    /**
     * Client-side image optimizer using HTML Canvas
     * Supports JPG, JPEG, PNG, WEBP with high visual quality retention
     */
    optimizeImage: function (file, maxDimension = 1920, quality = 0.88) {
      return new Promise((resolve) => {
        // If not an image or SVG, return as is
        if (!file.type.startsWith("image/") || file.type.includes("svg")) {
          return resolve(file);
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = function () {
            let width = img.width;
            let height = img.height;

            // Only downscale if larger than maxDimension
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            let mime = "image/jpeg";
            if (file.type === "image/png") {
              mime = "image/png";
            } else if (file.type === "image/webp") {
              mime = "image/webp";
            }

            canvas.toBlob(
              (blob) => {
                resolve(blob || file);
              },
              mime,
              quality
            );
          };
          img.onerror = () => resolve(file);
          img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });
    }
  };

  if (typeof window !== "undefined") {
    window.SupabaseService = SupabaseService;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = SupabaseService;
  }
})();
