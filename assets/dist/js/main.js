// Smooth scrolling for mobile bottom nav
document.querySelectorAll('.mobile-bottom-nav .nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        document.querySelectorAll('.mobile-bottom-nav .nav-link').forEach(nav => {
            nav.classList.remove('active');
        });
        this.classList.add('active');

        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Update active tab on scroll
function updateActiveNavOnScroll() {
    if (window.innerWidth >= 992) return;

    const sections = ['#pills-my-work', '#pills-my-products', '#pills-about-me'];
    let current = '#pills-my-work';

    for (let id of sections) {
        const section = document.querySelector(id);
        if (section && window.scrollY >= section.offsetTop - 0) {
            current = id;
        }
    }

    document.querySelectorAll('.mobile-bottom-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === current) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveNavOnScroll);
window.addEventListener('resize', updateActiveNavOnScroll);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 992) {
        updateActiveNavOnScroll();
    }
});


// loader
  const FUI_MIN_LOAD_TIME = 1500; 
  const fuiStartTime = Date.now();

  window.addEventListener('load', () => {
    const elapsedTime = Date.now() - fuiStartTime;
    const delay = Math.max(0, FUI_MIN_LOAD_TIME - elapsedTime);

    setTimeout(() => {
      const loader = document.getElementById('fui-global-loader');
      if (loader) {
        loader.setAttribute('aria-busy', 'false');
        loader.classList.add('fui-loaded');
        
        loader.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'visibility') {
            loader.remove();
          }
        });
      }
    }, delay);
  });