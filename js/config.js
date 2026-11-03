/**
 * Printable3D - Store & Backend Configuration
 * -------------------------------------------------------------
 * Single source of truth for your store's WhatsApp number,
 * Supabase backend credentials, and brand settings.
 */

const STORE_CONFIG = {
  // Brand details
  brandName: "Printable3D",
  tagline: "Precision 3D Printed Living & Workspace Essentials",
  domain: "printable3d.store",
  websiteUrl: "https://printable3d.store",

  // ============================================================
  // 1. CONFIGURE YOUR WHATSAPP NUMBER HERE
  // Format: '91' + your 10 digit number without '+' or spaces.
  // ============================================================
  whatsappNumber: "918825247784",
  whatsappDisplayNumber: "+91 88252 47784",

  // ============================================================
  // 2. SUPABASE BACKEND CONFIGURATION
  // Connected to Supabase Project: dquvwlccuwzrrdhetuwz
  // - Project URL: https://dquvwlccuwzrrdhetuwz.supabase.co
  // - Publishable / Anon Key: sb_publishable_clMFy-Vp3NowghS3c38pXw_cIzWlTIp
  //
  // SECURITY NOTICE:
  // - The publishable / anon key is designed to be public and is guarded by
  //   Row Level Security (RLS) policies in PostgreSQL.
  // - NEVER enter your "service_role" secret key here!
  // ============================================================
  supabaseUrl: (typeof window !== "undefined" && window.ENV && window.ENV.SUPABASE_URL) || "https://dquvwlccuwzrrdhetuwz.supabase.co",
  supabaseAnonKey: (typeof window !== "undefined" && window.ENV && window.ENV.SUPABASE_ANON_KEY) || "sb_publishable_clMFy-Vp3NowghS3c38pXw_cIzWlTIp",
  supabaseStorageBucket: "product-images",

  // Contact & Social channels
  email: "printable3d.store@gmail.com",
  instagramUrl: "https://instagram.com/printable3d.store",
  instagramHandle: "@printable3d.store",
  location: "Made & Shipped across India",
  defaultShippingInfo: "Additional shipping charges",

  // Currency
  currency: {
    symbol: "₹",
    code: "INR"
  },

  /**
   * Generates a pre-filled WhatsApp order URL conforming to:
   * https://wa.me/91XXXXXXXXXX?text=ENCODED_MESSAGE
   */
  getWhatsAppOrderUrl: function ({ productName, price, color, quantity = 1, productId, shippingInfo }) {
    let productUrl = "";
    try {
      if (typeof window !== "undefined" && window.location) {
        if (productId) {
          const origin = window.location.origin;
          const pathname = window.location.pathname;
          const basePath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
          productUrl = `${origin}${basePath}product.html?id=${encodeURIComponent(productId)}`;
        } else {
          productUrl = window.location.href;
        }
      } else {
        productUrl = `${this.websiteUrl}/product.html?id=${productId || ''}`;
      }
    } catch (e) {
      productUrl = `${this.websiteUrl}/product.html?id=${productId || ''}`;
    }

    const shippingText = shippingInfo || this.defaultShippingInfo;

    const messageLines = [
      `👋 Hello ${this.brandName}!`,
      ``,
      `I would like to place an order for the following 3D-printed item:`,
      `📦 Product: *${productName}*`,
      `💰 Price: *${this.currency.symbol}${price}* (+ ${shippingText})`,
      color ? `🎨 Selected Colour: *${color}*` : null,
      quantity > 1 ? `🔢 Quantity: *${quantity}*` : null,
      `🔗 Product Link: ${productUrl}`,
      ``,
      `Could you please calculate shipping to my pincode and confirm delivery timeline?`
    ].filter(line => line !== null);

    const messageText = messageLines.join("\n");
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(messageText)}`;
  },

  /**
   * Generates an inquiry WhatsApp URL
   */
  getWhatsAppInquiryUrl: function ({ name = "", topic = "General Inquiry", message = "" }) {
    const lines = [
      `👋 Hello ${this.brandName}!`,
      name ? `My name is *${name}*.` : null,
      `Topic: *${topic}*`,
      ``,
      message ? `Message: ${message}` : `I have a question regarding your 3D printed products and custom printing services.`,
      ``,
      `Looking forward to hearing from you!`
    ].filter(line => line !== null);

    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }
};

if (typeof window !== "undefined") {
  window.STORE_CONFIG = STORE_CONFIG;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = STORE_CONFIG;
}
