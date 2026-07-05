document.addEventListener("DOMContentLoaded", function () {
  // -------------------------
  // Bootstrap Tooltip Init
  // -------------------------
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // -------------------------
  // Back to Top Button
  // -------------------------
  const backToTopBtn = document.getElementById("backToTopBtn");

  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 500) {
        backToTopBtn.classList.remove("d-none");
        backToTopBtn.classList.add("d-flex");
      } else {
        backToTopBtn.classList.remove("d-flex");
        backToTopBtn.classList.add("d-none");
      }
    });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

