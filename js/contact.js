/**
 * Printable3D - Contact & FAQ Controller
 * -------------------------------------------------------------
 * Handles the direct WhatsApp inquiry generator form,
 * input validation, and FAQ accordion interaction.
 */

document.addEventListener("DOMContentLoaded", () => {
  initContactForm();
  initFaqAccordion();
});

function initContactForm() {
  const form = document.getElementById("contactInquiryForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("contactName") ? document.getElementById("contactName").value.trim() : "";
    const phone = document.getElementById("contactPhone") ? document.getElementById("contactPhone").value.trim() : "";
    const topic = document.getElementById("contactTopic") ? document.getElementById("contactTopic").value : "General Inquiry";
    const message = document.getElementById("contactMessage") ? document.getElementById("contactMessage").value.trim() : "";

    if (!message && !topic) {
      if (typeof showToast === "function") {
        showToast("Please enter your message or question.");
      }
      return;
    }

    const compiledMessage = `${message}${phone ? `\n\n(My WhatsApp Contact: ${phone})` : ""}`;

    const whatsappUrl = STORE_CONFIG.getWhatsAppInquiryUrl({
      name: name,
      topic: topic,
      message: compiledMessage
    });

    // Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (typeof showToast === "function") {
      showToast("Redirecting to WhatsApp to send your inquiry...");
    }
  });
}

function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      // Close all other accordion items for clean UX
      faqItems.forEach((other) => other.classList.remove("active"));

      // Toggle current
      if (!isActive) {
        item.classList.add("active");
      }
    });
  });
}
