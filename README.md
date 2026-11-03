# Printable3D – 3D Printed Products Store & Admin Console

A modern, clean, and professional e-commerce catalogue website and administration console for **Printable3D** (`printable3d.store`), specializing in functional, aesthetic, and architectural 3D-printed products.

---

## 🌟 Overview & Architecture

- **Public Storefront**: Clean, minimalist Scandinavian-inspired aesthetic with white/light backgrounds, crisp typography, responsive grids, and direct WhatsApp ordering.
- **Admin Console (`/admin`)**: A dedicated, responsive management dashboard for authorized administrators to create, edit, delete products, manage prices/shipping, and upload multiple photos with live previews.
- **Backend & Database**: Powered by **Supabase** (PostgreSQL, Supabase Auth, and Supabase Storage) with strict **Row Level Security (RLS)**.
- **Zero Payment Gateway Friction**: WhatsApp ordering with automated pre-filled messages specifying product name, price, chosen color, quantity, and product page URL.
- **Mobile-First Responsiveness**: Handcrafted and verified across 360px, 390px, 768px, 1024px, and 1440px+ viewports without horizontal overflow.

---

## 📁 Project Directory Structure

```
printable3d/
├── index.html                   # Homepage (Hero, Categories, Featured Products)
├── shop.html                    # Catalogue with live search & category filters
├── product.html                 # Dynamic product detail page & WhatsApp order
├── about.html                   # Brand story, additive manufacturing & sustainability
├── contact.html                 # Contact channels, WhatsApp inquiry builder, FAQ
├── robots.txt                   # Search crawler directives (disallows /admin)
├── sitemap.xml                  # SEO sitemap
├── README.md                    # Complete setup, security & deployment documentation
├── admin/
│   ├── index.html               # Admin Console UI (Login & CRUD dashboard)
│   └── admin.js                 # Admin controller (Supabase auth, CRUD, photo uploads)
├── assets/
│   ├── favicon.svg              # 3D isometric cube favicon
│   ├── logo.svg                 # Printable3D brand vector mark
│   └── products/                # High-resolution product images
├── css/
│   ├── style.css                # Storefront responsive design system
│   └── admin.css                # Admin console layout, modals & dark slate UI
├── images/products/             # Optimized product photography
│   ├── moon-lamp-1.jpg          # Product 1 photo 1
│   ├── moon-lamp-2.jpg          # Product 1 photo 2
│   ├── phone-stand-1.jpg        # Product 2 photo 1
│   ├── phone-stand-2.jpg        # Product 2 photo 2
│   ├── mini-garage-key-holder.png   # Product 3 concept render 1
│   └── mini-garage-key-holder-2.png # Product 3 concept render 2
├── js/
│   ├── config.js                # Central store & Supabase configuration
│   ├── supabase-client.js       # Supabase service wrapper (Auth, DB, Storage)
│   ├── products.js              # Product data layer with offline fallback
│   ├── app.js                   # Navigation drawer, sticky header & bindings
│   ├── shop.js                  # Dynamic shop filtering, search & sorting
│   ├── product-detail.js        # Image gallery switcher, specs & WhatsApp CTA
│   └── contact.js               # Interactive WhatsApp inquiry generator
└── supabase/
    └── schema.sql               # Complete PostgreSQL tables, RLS policies & seed data
```

---

## 📦 Initial Products

| # | Product Name | Price | Shipping | Status | Description & Media |
|---|---|---|---|---|---|
| **1** | **3D Printed Lamp** | ₹499 | Additional shipping charges | `available` (Public) | Minimalist lunar lithophane globe on an organic wave cradle stand. Uses actual product photographs (`moon-lamp-1.jpg`, `moon-lamp-2.jpg`). |
| **2** | **3D Printed Phone Stand** | ₹199 | Additional shipping charges | `available` (Public) | Compact, sturdy phone dock with ergonomic viewing angle and charging cable pass-through (`phone-stand-1.jpg`, `phone-stand-2.jpg`). |
| **3** | **3D Printed Mini Garage Key Holder** | ₹399 | Additional shipping charges | `draft` (Admin Only) | Wall-mounted miniature garage display for a 1:64 scale die-cast car, shutter design, warm LED lighting cavity, and 4 key-hanging hooks (`mini-garage-key-holder.png`). Kept as draft until physical manufacturing. |

> [!NOTE]
> Products with `status: 'draft'` or `status: 'unavailable'` are strictly filtered out by Supabase Row Level Security and JavaScript services. They **never appear on the public storefront** and can only be seen and managed inside `/admin`.

---

## 🔒 Security Architecture & Supabase Setup

### Security Principles
1. **No Secret Keys in Client JavaScript**: Only the public `anon` key is used in frontend code. The high-privilege `service_role` key is **never** embedded in files.
2. **PostgreSQL Row Level Security (RLS)**:
   - **Public visitors**: Allowed to `SELECT` products where `status = 'available'`.
   - **Admins**: Must be authenticated via Supabase Auth AND registered in the `public.admin_users` table. Only users returning `true` for `public.is_admin()` can insert, update, or delete products and upload to storage.
3. **Hidden Admin URL**: `/admin` is not linked in public navigation, headers, footers, or sitemaps, and is explicitly disallowed in `robots.txt`.

---

### Step-by-Step Supabase Setup

#### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) and create a free project (e.g. `printable3d`).
2. Choose your nearest region (e.g., *Mumbai / India* or *Singapore*).

#### 2. Run the Database Schema
1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Open the file [supabase/schema.sql](file:///c:/Users/Lenovo/Desktop/page%20work/printable3d/supabase/schema.sql) in this repository.
3. Copy its entire contents, paste into the Supabase SQL Editor, and click **Run**.
   - This creates the `products` table, `admin_users` table, `is_admin()` security function, `product-images` storage bucket, and seeds the 3 initial products.

#### 3. Create and Authorize Your Admin Account
1. In the Supabase Dashboard, go to **Authentication** > **Users**.
2. Click **Add user** > **Create user**:
   - Enter your email address: `printable3d.store@gmail.com`.
   - Enter a secure password.
   - Set **Auto Confirm User?** to **Enabled**.
3. Now authorize this user as an admin by running this command in the **SQL Editor**:
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'printable3d.store@gmail.com'
   on conflict (user_id) do nothing;
   ```
4. Verify authorization:
   ```sql
   select * from public.admin_users;
   ```

#### 4. Pre-Configured `js/config.js`
Your project credentials and contact information are already connected in [js/config.js](file:///c:/Users/Lenovo/Desktop/page%20work/printable3d/js/config.js):
```javascript
whatsappNumber: "918825247784",
whatsappDisplayNumber: "+91 88252 47784",
email: "printable3d.store@gmail.com",
supabaseUrl: "https://dquvwlccuwzrrdhetuwz.supabase.co",
supabaseAnonKey: "sb_publishable_clMFy-Vp3NowghS3c38pXw_cIzWlTIp",
```

---

## 🖥️ Using the Admin Dashboard (`/admin`)

1. Open your browser and navigate to `https://printable3d.store/admin` (or `http://localhost:8000/admin` in development).
2. Enter your authorized admin email and password.
3. Once logged in, the dashboard allows you to:
   - **View All Products**: Filter by status (*All*, *Available*, *Draft*, *Unavailable*) or search in real time.
   - **Add New Product**: Click **+ Add New Product**, fill in the title, price, shipping charges, category, description, specifications, and upload multiple photos.
   - **Upload Multiple Photos**: Drag and drop images or select files. Images are automatically compressed on client-side canvas before uploading to the Supabase `product-images` bucket. Live thumbnail previews let you set the primary image or delete photos.
   - **Edit Price, Shipping & Details**: Click the **Edit** icon on any product row to modify prices, descriptions, or change status.
   - **Publish Product 3 (Mini Garage Key Holder)**:
     1. Locate "3D Printed Mini Garage Key Holder" (marked with the orange `Draft` badge).
     2. Click **Edit**.
     3. Update the price or add manufactured product photographs.
     4. Change status from `Draft` to `Available (Published)`.
     5. Click **Save Product**. It will instantly go live on the public storefront!
   - **Delete Product**: Click the **Trash** icon. A confirmation modal prevents accidental deletions.
   - **Logout**: Click the **Logout** button in the top navigation to destroy the Supabase session.

---

## 📱 WhatsApp Ordering Workflow

When a visitor clicks **Order via WhatsApp** or **Buy Now via WhatsApp**:
1. The system creates a URL targeting `https://wa.me/91XXXXXXXXXX?text=ENCODED_MESSAGE`.
2. The pre-filled message includes:
   ```
   👋 Hello Printable3D!

   I would like to place an order for the following 3D-printed item:
   📦 Product: 3D Printed Lamp
   💰 Price: ₹499 (+ Additional shipping charges)
   🎨 Selected Colour: Moonlit Ivory + White Wave Stand
   🔢 Quantity: 1
   🔗 Product Link: https://printable3d.store/product.html?id=3d-printed-lamp

   Could you please calculate shipping to my pincode and confirm delivery timeline?
   ```
3. The customer can review, add their delivery address/pincode, and tap Send. No credit card or gateway account required.

---

## 🚀 Deployment to Cloudflare Pages

This website is completely self-contained with standard HTML5, CSS3, and JavaScript.

### Method 1: Cloudflare Pages Direct Upload (Drag & Drop)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Upload assets**.
2. Project name: `printable3d`.
3. Drag and drop the `printable3d` folder (including `admin/`, `assets/`, `css/`, `images/`, `js/`, and `.html` files).
4. Click **Deploy Site**.
5. Go to **Custom domains** > Add `printable3d.store`.

### Method 2: Git Repository (Continuous Deployment)
1. Push this folder to GitHub or GitLab:
   ```bash
   git init
   git add .
   git commit -m "Initial Printable3D store and admin console"
   git remote add origin https://github.com/your-username/printable3d.git
   git push -u origin main
   ```
2. In Cloudflare Pages, click **Connect to Git** and choose the repository.
3. Build Settings:
   - Framework preset: `None`
   - Build command: *(leave empty)*
   - Build output directory: `/` (root)
4. Click **Save and Deploy**. Cloudflare automatically rebuilds on every git push.

---

## 🧪 Local Testing & Verification

To preview the store locally with Python's built-in web server:

```powershell
python -m http.server 8000
```

- Public Store: `http://localhost:8000/`
- Shop Catalogue: `http://localhost:8000/shop.html`
- Product Details: `http://localhost:8000/product.html?id=3d-printed-lamp`
- Admin Console: `http://localhost:8000/admin/`

---

## 📄 License
© 2026 Printable3D. All rights reserved. Built with precision for additive manufacturing.
