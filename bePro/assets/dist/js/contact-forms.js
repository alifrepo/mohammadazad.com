/*!
 * alif-beprofessional v1.0.0
 * Modern HTML5 Portfolio Template
 * https://alfuix.com/doc/
 *
 * © 2025 Mohammad Azad & Alfuix
 */
(function() {
  'use strict';
  const form = document.getElementById('contactForm');
  const modal = new bootstrap.Modal(document.getElementById('mailChoiceModal'));
  let gmailUrl = '', outlookUrl = '', mailtoUrl = '', whatsappUrl = '';

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      event.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const subject = form.querySelector('[name="subject"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();

    // CHANGE THESE VALUES
    const adminEmail = "project@your-domain.com";
    const adminWhatsApp = "971500000000"; // 👈 enter your WhatsApp number (with country code, no + sign)

    const emailSubject = encodeURIComponent(`📨 ${subject} - Message from ${name}`);
    const formattedBody = `
Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh 🌸,

I would like to contact you regarding:

━━━━━━━━━━━━━━━━━━━━━━
👤 *Name:* ${name}
📧 *Email:* ${email}
📱 *Phone:* ${phone}
📌 *Subject:* ${subject}
━━━━━━━━━━━━━━━━━━━━━━

💬 *Message:*
${message}

━━━━━━━━━━━━━━━━━━━━━━
🤲 May Allah bless your efforts and reward you for your service.
Kind Regards,
${name}
`;

    const emailBody = encodeURIComponent(formattedBody);

    gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${adminEmail}&su=${emailSubject}&body=${emailBody}`;
    outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${adminEmail}&subject=${emailSubject}&body=${emailBody}`;
    mailtoUrl = `mailto:${adminEmail}?subject=${emailSubject}&body=${emailBody}`;
    whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(formattedBody)}`;

    modal.show();
  });

  // Open Gmail
  document.getElementById('openGmail').addEventListener('click', () => {
    window.open(gmailUrl, "_blank");
    bootstrap.Modal.getInstance(document.getElementById('mailChoiceModal')).hide();
  });

  // Open Outlook
  document.getElementById('openOutlook').addEventListener('click', () => {
    window.open(outlookUrl, "_blank");
    bootstrap.Modal.getInstance(document.getElementById('mailChoiceModal')).hide();
  });

  // Open Default Mail App
  document.getElementById('openMailApp').addEventListener('click', () => {
    window.location.href = mailtoUrl;
    bootstrap.Modal.getInstance(document.getElementById('mailChoiceModal')).hide();
  });

  // Open WhatsApp
  document.getElementById('openWhatsApp').addEventListener('click', () => {
    window.open(whatsappUrl, "_blank");
    bootstrap.Modal.getInstance(document.getElementById('mailChoiceModal')).hide();
  });
})();