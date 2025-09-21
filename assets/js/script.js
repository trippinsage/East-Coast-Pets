document.addEventListener('DOMContentLoaded', () => {
  // Initialize Carousels only if they exist
  const carousels = document.querySelectorAll('.brand-carousel, .gallery-carousel');
  if (carousels.length === 0) return;

  carousels.forEach((carousel) => {
    const container = carousel.closest('.carousel-container');
    if (!container) return;

    // Add ARIA live region for accessibility
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('class', 'sr-only');
    container.appendChild(liveRegion);

    setupScrollHandling(carousel, liveRegion);
    setupAutoScroll(carousel);
  });
});

// Setup Scroll Handling for Touch and Mouse
function setupScrollHandling(carousel, liveRegion) {
  carousel.dataset.isAutoScrolling = 'true';

  // Announce slide changes for accessibility
  function announceSlideChange() {
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    const slideWidth = slides[0].offsetWidth + parseInt(getComputedStyle(slides[0]).marginRight);
    const currentScroll = carousel.scrollLeft;
    const currentSlideIndex = Math.round(currentScroll / slideWidth) + 1;
    const totalSlides = slides.length;
    liveRegion.textContent = `Slide ${currentSlideIndex} of ${totalSlides}`;
  }

  // Handle scroll events for both touch and mouse
  carousel.addEventListener('scroll', () => {
    // Pause auto-scroll during manual interaction
    carousel.dataset.isAutoScrolling = 'false';
    announceSlideChange();
    // Resume auto-scroll after 3 seconds
    clearTimeout(carousel.dataset.scrollTimeout);
    carousel.dataset.scrollTimeout = setTimeout(() => {
      carousel.dataset.isAutoScrolling = 'true';
    }, 3000);
  });

  // Enhance touch scrolling for mobile
  carousel.addEventListener('touchstart', () => {
    carousel.dataset.isAutoScrolling = 'false';
  });

  carousel.addEventListener('touchend', () => {
    // Resume auto-scroll after touch interaction
    setTimeout(() => {
      carousel.dataset.isAutoScrolling = 'true';
    }, 3000);
  });

  // Enhance mouse scrolling for desktop
  carousel.addEventListener('mouseenter', () => {
    carousel.dataset.isAutoScrolling = 'false';
  });

  carousel.addEventListener('mouseleave', () => {
    carousel.dataset.isAutoScrolling = 'true';
  });

  // Focus management for accessibility
  carousel.addEventListener('focusin', () => {
    carousel.dataset.isAutoScrolling = 'false';
  });

  carousel.addEventListener('focusout', () => {
    carousel.dataset.isAutoScrolling = 'true';
  });
}

// Auto-Scroll Functionality
function setupAutoScroll(carousel) {
  const interval = 5000; // Scroll every 5 seconds

  function autoScroll() {
    if (carousel.dataset.isAutoScrolling !== 'true') return;

    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    const slideWidth = slides[0].offsetWidth + parseInt(getComputedStyle(slides[0]).marginRight);
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;

    carousel.scrollTo({
      left: currentScroll >= maxScroll - 1 ? 0 : currentScroll + slideWidth,
      behavior: 'smooth',
    });
  }

  setInterval(autoScroll, interval);
}

// Screen reader only class
const style = document.createElement('style');
style.textContent = `
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
`;
document.head.appendChild(style);