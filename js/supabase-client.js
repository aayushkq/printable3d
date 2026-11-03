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
     * Insert product (Admin only)
     */
    insertProduct: async function (productData) {
      const client = getClient();
      if (!client) {
        // Fallback for offline demo mode
        const newProduct = {
          ...productData,
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
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * Update product (Admin only)
     */
    updateProduct: async function (id, updates) {
      const client = getClient();
      if (!client) {
        if (window.LOCAL_PRODUCTS) {
          const idx = window.LOCAL_PRODUCTS.findIndex(p => p.id === id || p.slug === id);
          if (idx !== -1) {
            window.LOCAL_PRODUCTS[idx] = { ...window.LOCAL_PRODUCTS[idx], ...updates, updated_at: new Date().toISOString() };
            return window.LOCAL_PRODUCTS[idx];
          }
        }
        return null;
      }

      const { data, error } = await client
        .from("products")
        .update(updates)
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
    // STORAGE (IMAGE UPLOADS)
    // ==========================================================

    /**
     * Upload an image to Supabase Storage with optimization
     * @param {File|Blob} file - Image file to upload
     * @param {string} [customFileName] - Optional custom filename
     * @returns {Promise<string>} Public URL of uploaded image
     */
    uploadProductImage: async function (file, customFileName) {
      const client = getClient();
      if (!client) {
        throw new Error("Supabase is not configured. Please set up your Supabase project credentials in js/config.js.");
      }

      // 1. Optimize image (resizes to max 1600px width/height and compresses to WebP/JPEG)
      const optimizedBlob = await this.optimizeImage(file, 1600, 0.85);

      const bucket = (window.STORE_CONFIG && window.STORE_CONFIG.supabaseStorageBucket) || "product-images";
      const fileExt = file.name ? file.name.split(".").pop().toLowerCase() : "jpg";
      const cleanName = (customFileName || (file.name ? file.name.replace(/\.[^/.]+$/, "") : "product"))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      const uniquePath = `products/${Date.now()}-${cleanName}.${fileExt === "png" ? "png" : "jpg"}`;

      const { data, error } = await client.storage
        .from(bucket)
        .upload(uniquePath, optimizedBlob, {
          cacheControl: "31536000",
          upsert: true,
          contentType: fileExt === "png" ? "image/png" : "image/jpeg"
        });

      if (error) throw error;

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
     */
    optimizeImage: function (file, maxDimension = 1600, quality = 0.85) {
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
            ctx.drawImage(img, 0, 0, width, height);

            const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
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
