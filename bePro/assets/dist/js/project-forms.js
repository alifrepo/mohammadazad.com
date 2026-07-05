/*!
 * alif-beprofessional v1.0.0
 * Modern HTML5 Portfolio Template
 * https://alfuix.com/doc/
 *
 * © 2025 Mohammad Azad & Alfuix
 */
document.addEventListener('DOMContentLoaded', function() {
  'use strict';
  
  // Selectors for the Project Quote form and modal
  const form = document.getElementById('quoteForm');
  const modalEl = document.getElementById('projectChoiceModal'); // renamed from sendChoiceModal
  const serviceError = document.getElementById('serviceError');
  
  if (!form || !modalEl || !serviceError) return; // Safety check

  const modal = new bootstrap.Modal(modalEl);
  let gmailUrl = '', outlookUrl = '', mailtoUrl = '', whatsappUrl = '';

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    let valid = form.checkValidity();

    // Validate services
    const checkedServices = Array.from(form.querySelectorAll('input[name="services[]"]:checked')).map(cb => cb.value);
    if (checkedServices.length === 0) {
      valid = false;
      serviceError.style.display = 'block';
    } else {
      serviceError.style.display = 'none';
    }

    if (!valid) {
      form.classList.add('was-validated');
      event.stopPropagation();
      return;
    }

    // Collect form data
    const company = form.company_name.value.trim();
    const website = form.website.value.trim();
    const project = form.project_description.value.trim();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const timeline = form.timeline.value.trim();
    const budget = form.budget.value.trim();

    // Admin contact details (change these)
    const adminEmail = "projects@your-domain.com";
    const adminWhatsApp = "971500000000"; // Without "+"

    const subject = encodeURIComponent(`🚀 New Project Quote Request from ${company}`);
    const bodyText = `
Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh 🌸,

A new project quote request has been submitted.

━━━━━━━━━━━━━━━━━━━━━━
🏢 *Company:* ${company}
🌐 *Website:* ${website || 'N/A'}
🛠️ *Services:* ${checkedServices.join(', ')}
💬 *Project Description:* ${project}

⏰ *Timeline:* ${timeline || 'N/A'}
💰 *Budget:* ${budget || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━
👤 *Contact Person:* ${name}
📧 *Email:* ${email}
📱 *Phone:* ${phone}
━━━━━━━━━━━━━━━━━━━━━━

🤲 May Allah bless this collaboration and grant barakah in our work.
Kind Regards,
${name}
`;

    const encodedBody = encodeURIComponent(bodyText);
    gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${adminEmail}&su=${subject}&body=${encodedBody}`;
    outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${adminEmail}&subject=${subject}&body=${encodedBody}`;
    mailtoUrl = `mailto:${adminEmail}?subject=${subject}&body=${encodedBody}`;
    whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(bodyText)}`;

    modal.show();
  });

  // Modal Button Actions (renamed IDs)
  document.getElementById('projectGmail').addEventListener('click', () => {
    window.open(gmailUrl, "_blank");
    modal.hide();
  });

  document.getElementById('projectOutlook').addEventListener('click', () => {
    window.open(outlookUrl, "_blank");
    modal.hide();
  });

  document.getElementById('projectMailApp').addEventListener('click', () => {
    window.location.href = mailtoUrl;
    modal.hide();
  });

  document.getElementById('projectWhatsApp').addEventListener('click', () => {
    window.open(whatsappUrl, "_blank");
    modal.hide();
  });
});
