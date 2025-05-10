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

    setupCarouselControls(carousel, container, liveRegion);
    setupAutoScroll(carousel);
  });
});

// Setup Carousel Navigation Controls
function setupCarouselControls(carousel, container, liveRegion) {
  const prevBtn = container.querySelector('.carousel-btn.prev');
  const nextBtn = container.querySelector('.carousel-btn.next');
  if (!prevBtn || !nextBtn) return;

  function scrollToSlide(direction) {
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    const slideWidth = slides[0].offsetWidth + parseInt(getComputedStyle(slides[0]).marginRight);
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;
    let newScroll;

    if (direction === 'next') {
      newScroll = currentScroll >= maxScroll - 1 ? 0 : currentScroll + slideWidth;
    } else {
      newScroll = currentScroll <= 0 ? maxScroll : currentScroll - slideWidth;
    }

    carousel.scrollTo({
      left: newScroll,
      behavior: 'smooth',
    });

    // Announce slide change for screen readers
    const currentSlideIndex = Math.round(newScroll / slideWidth) + 1;
    const totalSlides = slides.length;
    liveRegion.textContent = `Slide ${currentSlideIndex} of ${totalSlides}`;

    // Pause auto-scroll during interaction
    carousel.dataset.isAutoScrolling = 'false';
    setTimeout(() => {
      carousel.dataset.isAutoScrolling = 'true';
    }, 3000);
  }

  prevBtn.addEventListener('click', () => scrollToSlide('prev'));
  nextBtn.addEventListener('click', () => scrollToSlide('next'));

  // Keyboard navigation
  [prevBtn, nextBtn].forEach((btn) => {
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
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
  carousel.dataset.isAutoScrolling = 'true';
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

  const autoScrollInterval = setInterval(autoScroll, interval);

  // Pause auto-scroll on hover or focus
  carousel.addEventListener('mouseenter', () => {
    carousel.dataset.isAutoScrolling = 'false';
  });

  carousel.addEventListener('mouseleave', () => {
    carousel.dataset.isAutoScrolling = 'true';
  });

  // Pause on touch interaction
  carousel.addEventListener('touchstart', () => {
    carousel.dataset.isAutoScrolling = 'false';
    setTimeout(() => {
      carousel.dataset.isAutoScrolling = 'true';
    }, 3000);
  });
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