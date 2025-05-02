document.addEventListener('DOMContentLoaded', () => {
  // Initialize Carousels
  document.querySelectorAll('.brand-carousel, .gallery-carousel').forEach((carousel) => {
    const container = carousel.closest('.carousel-container');
    if (!container) return;

    setupCarouselControls(carousel, container);
    setupAutoScroll(carousel);
  });
});

// Setup Carousel Navigation Controls
function setupCarouselControls(carousel, container) {
  const prevBtn = container.querySelector('.carousel-btn.prev');
  const nextBtn = container.querySelector('.carousel-btn.next');
  if (!prevBtn || !nextBtn) return;

  function scrollToSlide(slideIndex) {
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    const slideWidth = slides[0].offsetWidth + parseInt(getComputedStyle(slides[0]).marginRight);
    carousel.scrollTo({
      left: slideIndex * slideWidth,
      behavior: 'smooth',
    });
  }

  prevBtn.addEventListener('click', () => {
    const slideWidth = carousel.querySelector('.brand-slide, .gallery-slide').offsetWidth + parseInt(getComputedStyle(carousel.querySelector('.brand-slide, .gallery-slide')).marginRight);
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;

    if (currentScroll <= 0) {
      // Loop to the end
      carousel.scrollTo({
        left: maxScroll,
        behavior: 'smooth',
      });
    } else {
      carousel.scrollBy({
        left: -slideWidth,
        behavior: 'smooth',
      });
    }

    carousel.dataset.isAutoScrolling = 'false'; // Pause auto-scroll
    setTimeout(() => {
      carousel.dataset.isAutoScrolling = 'true'; // Resume after scroll
    }, 1000);
  });

  nextBtn.addEventListener('click', () => {
    const slideWidth = carousel.querySelector('.brand-slide, .gallery-slide').offsetWidth + parseInt(getComputedStyle(carousel.querySelector('.brand-slide, .gallery-slide')).marginRight);
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;

    if (currentScroll >= maxScroll - 1) {
      // Loop to the start
      carousel.scrollTo({
        left: 0,
        behavior: 'smooth',
      });
    } else {
      carousel.scrollBy({
        left: slideWidth,
        behavior: 'smooth',
      });
    }

    carousel.dataset.isAutoScrolling = 'false';
    setTimeout(() => {
      carousel.dataset.isAutoScrolling = 'true';
    }, 1000);
  });

  // No need for button state updates since round-robin allows continuous navigation
}

// Auto-Scroll Functionality
function setupAutoScroll(carousel) {
  carousel.dataset.isAutoScrolling = 'true';
  const interval = 5000; // Scroll every 5 seconds

  function autoScroll() {
    if (carousel.dataset.isAutoScrolling !== 'true') return;

    const slideWidth = carousel.querySelector('.brand-slide, .gallery-slide').offsetWidth + parseInt(getComputedStyle(carousel.querySelector('.brand-slide, .gallery-slide')).marginRight);
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;

    if (currentScroll >= maxScroll - 1) {
      carousel.scrollTo({
        left: 0,
        behavior: 'smooth',
      });
    } else {
      carousel.scrollBy({
        left: slideWidth,
        behavior: 'smooth',
      });
    }
  }

  setInterval(autoScroll, interval);

  // Pause auto-scroll on hover
  carousel.addEventListener('mouseenter', () => {
    carousel.dataset.isAutoScrolling = 'false';
  });
  carousel.addEventListener('mouseleave', () => {
    carousel.dataset.isAutoScrolling = 'true';
  });
}