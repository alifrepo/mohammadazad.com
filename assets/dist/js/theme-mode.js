/*!
 * alif-beprofessional v1.0.0
 * Modern HTML5 Portfolio Template
 * https://alfuix.com/doc/
 *
 * © 2025 Mohammad Azad & Alfuix
 */
document.addEventListener("DOMContentLoaded", function () {
  // -------------------------
  // Light / Dark Mode Toggle
  // -------------------------
  const toggleBtn = document.getElementById('toggleThemeBtn');
  const themeIcon = document.getElementById('themeIcon');
  const htmlTag = document.documentElement; // <html> tag

  function updateThemeUI(isDark) {
    if (themeIcon) {
      themeIcon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      bootstrap.Tooltip.getInstance(toggleBtn)?.dispose(); // Reset old tooltip
      new bootstrap.Tooltip(toggleBtn); // Reinitialize updated tooltip
    }
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    htmlTag.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    updateThemeUI(isDark);
    localStorage.setItem('theme', theme);
  }

  if (toggleBtn && themeIcon) {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    toggleBtn.addEventListener('click', () => {
      const currentTheme = htmlTag.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }
});

