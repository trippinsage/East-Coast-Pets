document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Consolidated scroll handler (header + back-to-top + parallax) ---
  const header = document.querySelector('.site-header');
  const backToTop = document.querySelector('.back-to-top');
  const heroBg = document.querySelector('#hero .hero-bg');
  const heroEl = document.getElementById('hero');

  if (header || backToTop || heroBg) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (header) header.classList.toggle('scrolled', scrollY > 80);
        if (backToTop) backToTop.classList.toggle('visible', scrollY > 500);
        if (heroBg && !prefersReducedMotion && heroEl && scrollY <= heroEl.offsetHeight) {
          heroBg.style.transform = `translateY(${scrollY * 0.3}px)`;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  // --- Navigation toggle (hamburger menu) ---
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (navToggle && mainNav) {
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    function openNav() {
      navToggle.classList.add('active');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close navigation menu');
      mainNav.classList.add('open');
      overlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }

    function closeNav() {
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation menu');
      mainNav.classList.remove('open');
      overlay.classList.remove('visible');
      document.body.style.overflow = '';
    }

    navToggle.addEventListener('click', () => {
      mainNav.classList.contains('open') ? closeNav() : openNav();
    });

    overlay.addEventListener('click', closeNav);

    mainNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (mainNav.classList.contains('open')) closeNav();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mainNav.classList.contains('open')) {
        closeNav();
        navToggle.focus();
      }
    });
  }

  // --- Scroll-reveal animations ---
  const revealElements = document.querySelectorAll('.info-section, .brands-section, .services-section, .gallery-section, .hours-container');
  if (revealElements.length > 0) {
    if (prefersReducedMotion) {
      revealElements.forEach(el => el.classList.add('reveal', 'visible'));
    } else {
      revealElements.forEach(el => el.classList.add('reveal'));
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealElements.forEach(el => revealObserver.observe(el));
    }
  }

  // --- Carousels ---
  const carousels = document.querySelectorAll('.brand-carousel, .gallery-carousel');
  if (carousels.length === 0) return;

  carousels.forEach((carousel) => {
    const container = carousel.closest('.carousel-container');
    if (!container) return;

    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('class', 'sr-only');
    container.appendChild(liveRegion);

    setupScrollHandling(carousel, liveRegion);
    if (!prefersReducedMotion) setupAutoScroll(carousel);
  });
});

// --- Carousel scroll handling ---
function setupScrollHandling(carousel, liveRegion) {
  carousel.dataset.isAutoScrolling = 'true';
  let scrollTimeout = null;
  let userInteracting = false;

  function announceSlideChange() {
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    if (slides.length === 0) return;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
    const slideWidth = slides[0].offsetWidth + gap;
    const currentSlideIndex = Math.round(carousel.scrollLeft / slideWidth) + 1;
    liveRegion.textContent = `Slide ${currentSlideIndex} of ${slides.length}`;
  }

  function pauseAutoScroll() {
    userInteracting = true;
    carousel.dataset.isAutoScrolling = 'false';
    clearTimeout(scrollTimeout);
  }

  function resumeAutoScroll(delay) {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      userInteracting = false;
      carousel.dataset.isAutoScrolling = 'true';
    }, delay);
  }

  carousel.addEventListener('scroll', () => {
    announceSlideChange();
    if (userInteracting) return;
  }, { passive: true });

  carousel.addEventListener('touchstart', () => pauseAutoScroll(), { passive: true });
  carousel.addEventListener('touchend', () => resumeAutoScroll(3000), { passive: true });
  carousel.addEventListener('mouseenter', () => pauseAutoScroll());
  carousel.addEventListener('mouseleave', () => resumeAutoScroll(0));
  carousel.addEventListener('focusin', () => pauseAutoScroll());
  carousel.addEventListener('focusout', () => resumeAutoScroll(0));
}

// --- Carousel auto-scroll ---
function setupAutoScroll(carousel) {
  const interval = 5000;

  function autoScroll() {
    if (carousel.dataset.isAutoScrolling !== 'true') return;

    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    if (slides.length === 0) return;

    const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
    const slideWidth = slides[0].offsetWidth + gap;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    carousel.scrollTo({
      left: carousel.scrollLeft >= maxScroll - 1 ? 0 : carousel.scrollLeft + slideWidth,
      behavior: 'smooth',
    });
  }

  setInterval(autoScroll, interval);
}