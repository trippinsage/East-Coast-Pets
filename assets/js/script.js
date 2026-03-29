document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Store open/closed status ---
  initStoreStatus();

  // --- Scroll handler (header + back-to-top) ---
  const header = document.querySelector('.site-header');
  const backToTop = document.querySelector('.back-to-top');

  if (header || backToTop) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (header) {
          // Hysteresis: shrink at 80px, restore only below 20px to prevent jitter
          const isScrolled = header.classList.contains('scrolled');
          if (!isScrolled && scrollY > 80) header.classList.add('scrolled');
          else if (isScrolled && scrollY < 20) header.classList.remove('scrolled');
        }
        if (backToTop) backToTop.classList.toggle('visible', scrollY > 500);
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

  // --- Active nav tracking ---
  initActiveNav();

  // --- Smooth scroll with header offset ---
  initSmoothScroll(prefersReducedMotion);

  // --- Mobile navigation ---
  initMobileNav(prefersReducedMotion);

  // --- Scroll-reveal + staggered children ---
  initScrollReveal(prefersReducedMotion);

  // --- Small media decoding/perf optimizations ---
  optimizeImages();

  // --- Gallery lightbox ---
  initLightbox();

  // --- Accordion (Live Animals) ---
  initAccordion();

  // --- Legal tabs ---
  initLegalTabs();

  // --- Carousels ---
  initCarousels(prefersReducedMotion);
});

/* ---- Small media decoding/perf optimizations ---- */
function optimizeImages() {
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
  });
}

/* ---- Store open/closed status ---- */
function initStoreStatus() {
  const badge = document.querySelector('.store-status');
  if (!badge) return;

  const dayMap = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
    Friday: 5, Saturday: 6, Sunday: 0
  };

  function update() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/St_Johns',
      hour: 'numeric', minute: 'numeric', weekday: 'long', hour12: false
    }).formatToParts(new Date());

    const weekday = parts.find(p => p.type === 'weekday').value;
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const day = dayMap[weekday] ?? -1;
    const time = hour + minute / 60;

    let isOpen = false;
    if ((day >= 1 && day <= 3) || day === 5) isOpen = time >= 12 && time < 19;
    else if (day === 4) isOpen = time >= 12 && time < 20;
    else if (day === 6) isOpen = time >= 12 && time < 18;

    badge.classList.toggle('open', isOpen);
    badge.classList.toggle('closed', !isOpen);
    const label = badge.querySelector('.store-status-label');
    if (label) label.textContent = isOpen ? 'Open Now' : 'Closed';
  }

  update();
  setInterval(update, 60000);
}

/* ---- Active nav section tracking ---- */
function initActiveNav() {
  const navLinks = document.querySelectorAll('.main-nav .nav-link');
  const sections = [];

  navLinks.forEach(link => {
    const id = link.getAttribute('href');
    if (id && id.startsWith('#')) {
      const el = document.querySelector(id);
      if (el) sections.push({ el, link });
    }
  });

  if (sections.length === 0) return;

  const visibility = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });

    let best = null;
    sections.forEach(section => {
      const ratio = visibility.get(section.el) || 0;
      if (!best || ratio > best.ratio) best = { ratio, link: section.link };
    });

    if (best && best.ratio > 0) {
      navLinks.forEach(l => l.classList.remove('active'));
      best.link.classList.add('active');
    }
  }, { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.7], rootMargin: '-80px 0px -35% 0px' });

  sections.forEach(s => observer.observe(s.el));
}

/* ---- Smooth scroll with header offset ---- */
function scrollToHash(hash, prefersReducedMotion) {
  if (!hash || hash === '#') return false;

  let target = null;
  try {
    target = document.querySelector(hash);
  } catch (error) {
    return false;
  }

  if (!target) return false;

  const header = document.querySelector('.site-header');
  const offset = header ? header.offsetHeight + 16 : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  return true;
}

function initSmoothScroll(prefersReducedMotion) {
  document.querySelectorAll('a[href*="#"]').forEach(link => {
    link.addEventListener('click', e => {
      // Let the mobile nav handler manage its own links entirely
      if (link.closest('.main-nav')) return;

      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref === '#') return;

      const hashIndex = rawHref.indexOf('#');
      if (hashIndex < 0) return;

      const hash = rawHref.substring(hashIndex);
      if (!scrollToHash(hash, prefersReducedMotion)) return;

      // Only smooth-scroll when target exists on current page.
      e.preventDefault();
    });
  });
}
/* ---- Mobile navigation ---- */
function initMobileNav(prefersReducedMotion) {
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (!navToggle || !mainNav) return;

  const mobileBreakpoint = window.matchMedia('(max-width: 768px)');
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
  if (mobileBreakpoint.matches) {
    mainNav.setAttribute('aria-hidden', 'true');
  }

  function normalizePath(pathname) {
    if (!pathname) return '/';
    return pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;
  }

  function getLinkNavigation(link) {
    const href = link.getAttribute('href');
    if (!href || href === '#') return { href, targetHref: href, samePageHash: false, hash: '' };

    if (href.startsWith('#')) {
      return { href, targetHref: href, samePageHash: true, hash: href };
    }

    try {
      const url = new URL(href, window.location.href);
      const currentPath = normalizePath(window.location.pathname);
      const targetPath = normalizePath(url.pathname);
      const samePageHash = url.origin === window.location.origin && currentPath === targetPath && Boolean(url.hash);
      return { href, targetHref: url.href, samePageHash, hash: url.hash };
    } catch (error) {
      return { href, targetHref: href, samePageHash: false, hash: '' };
    }
  }

  function afterMenuClose(callback) {
    // Use a short timeout to let the CSS transition start and body overflow reset
    window.setTimeout(callback, prefersReducedMotion ? 0 : 50);
  }

  function openNav() {
    navToggle.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close navigation menu');
    mainNav.classList.add('open');
    mainNav.setAttribute('aria-hidden', 'false');
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation menu');
    mainNav.classList.remove('open');
    mainNav.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-open');
  }

  navToggle.addEventListener('click', () => {
    mainNav.classList.contains('open') ? closeNav() : openNav();
  });

  overlay.addEventListener('click', () => {
    if (mainNav.classList.contains('open')) closeNav();
  });

  mainNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if (!mainNav.classList.contains('open') || !mobileBreakpoint.matches) return;

      const { href, targetHref, samePageHash, hash } = getLinkNavigation(link);
      if (!href) {
        closeNav();
        return;
      }

      e.preventDefault();
      closeNav();

      afterMenuClose(() => {
        if (samePageHash && scrollToHash(hash, prefersReducedMotion)) return;
        window.location.assign(targetHref);
      });
    });
  });

  const handleViewportChange = () => {
    if (!mobileBreakpoint.matches) {
      if (mainNav.classList.contains('open')) closeNav();
      mainNav.removeAttribute('aria-hidden');
    } else {
      if (!mainNav.classList.contains('open')) {
        mainNav.setAttribute('aria-hidden', 'true');
      }
    }
  };

  if (typeof mobileBreakpoint.addEventListener === 'function') {
    mobileBreakpoint.addEventListener('change', handleViewportChange);
  } else if (typeof mobileBreakpoint.addListener === 'function') {
    mobileBreakpoint.addListener(handleViewportChange);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('open')) {
      e.preventDefault();
      closeNav();
      navToggle.focus();
    }
  });
}
/* ---- Scroll reveal + staggered children ---- */
function initScrollReveal(prefersReducedMotion) {
  const revealEls = document.querySelectorAll(
    '.info-section, .brands-section, .services-section, .gallery-section, .hours-container, .live-animals-section'
  );
  const staggerEls = document.querySelectorAll(
    '.pet-categories, .services-grid, .contact-cards, .perfect-for-grid, .hours, .housing-grid'
  );

  if (prefersReducedMotion) {
    revealEls.forEach(el => el.classList.add('reveal', 'visible'));
    staggerEls.forEach(el => el.classList.add('stagger-children', 'in-view'));
    return;
  }

  revealEls.forEach(el => el.classList.add('reveal'));
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  staggerEls.forEach(el => el.classList.add('stagger-children'));
  const staggerObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        staggerObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  staggerEls.forEach(el => staggerObs.observe(el));
}

/* ---- Gallery lightbox ---- */
function initLightbox() {
  const slides = document.querySelectorAll('.gallery-slide img');
  if (slides.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image viewer');
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="Close image viewer">&times;</button>' +
    '<img src="" alt="" />';
  document.body.appendChild(overlay);

  const img = overlay.querySelector('img');
  const closeBtn = overlay.querySelector('.lightbox-close');

  function open(src, alt) {
    img.src = src;
    img.alt = alt;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  slides.forEach(slide => {
    slide.style.cursor = 'zoom-in';
    slide.addEventListener('click', () => open(slide.src, slide.alt));
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) close();
  });
}

/* ---- Accordion (Live Animals section) ---- */
function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');
  if (triggers.length === 0) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;

      // Close all others first
      triggers.forEach(other => {
        if (other !== trigger) {
          other.setAttribute('aria-expanded', 'false');
          const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
          if (otherPanel) otherPanel.hidden = true;
        }
      });

      // Toggle clicked
      trigger.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  });
}

/* ---- Legal page tabs ---- */
function initLegalTabs() {
  const tabs = document.querySelectorAll('.legal-tab');
  const panels = document.querySelectorAll('.legal-tab-panel');
  if (tabs.length === 0 || panels.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      panels.forEach(p => p.hidden = true);

      // Activate clicked
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.removeAttribute('tabindex');
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = false;
    });

    // Arrow key navigation between tabs
    tab.addEventListener('keydown', e => {
      const tabArray = Array.from(tabs);
      const idx = tabArray.indexOf(tab);
      let newIdx = -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIdx = (idx + 1) % tabArray.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIdx = (idx - 1 + tabArray.length) % tabArray.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIdx = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIdx = tabArray.length - 1;
      }

      if (newIdx >= 0) {
        tabArray[newIdx].focus();
        tabArray[newIdx].click();
      }
    });
  });
}

/* ---- Carousels ---- */
function initCarousels(prefersReducedMotion) {
  const carousels = document.querySelectorAll('.brand-carousel, .gallery-carousel');
  if (carousels.length === 0) return;

  carousels.forEach(carousel => {
    const container = carousel.closest('.carousel-container');
    if (!container) return;

    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    container.appendChild(liveRegion);

    setupScrollHandling(carousel, liveRegion);
    setupDragScroll(carousel);
    if (!prefersReducedMotion) setupAutoScroll(carousel);
  });
}

function setupScrollHandling(carousel, liveRegion) {
  carousel.dataset.isAutoScrolling = 'true';
  let scrollTimeout = null;
  let userInteracting = false;

  function announce() {
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    if (slides.length === 0) return;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
    const w = slides[0].offsetWidth + gap;
    const idx = Math.round(carousel.scrollLeft / w) + 1;
    liveRegion.textContent = 'Slide ' + idx + ' of ' + slides.length;
  }

  function pause() {
    userInteracting = true;
    carousel.dataset.isAutoScrolling = 'false';
    clearTimeout(scrollTimeout);
  }

  function resume(delay) {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      userInteracting = false;
      carousel.dataset.isAutoScrolling = 'true';
    }, delay);
  }

  carousel.addEventListener('scroll', announce, { passive: true });
  carousel.addEventListener('touchstart', () => pause(), { passive: true });
  carousel.addEventListener('touchend', () => resume(3000), { passive: true });
  carousel.addEventListener('mouseenter', () => pause());
  carousel.addEventListener('mouseleave', () => resume(0));
  carousel.addEventListener('focusin', () => pause());
  carousel.addEventListener('focusout', () => resume(0));
}

function setupDragScroll(carousel) {
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasDragged = false;

  carousel.addEventListener('mousedown', e => {
    if (e.target.closest('a, button')) return;
    isDown = true;
    hasDragged = false;
    startX = e.pageX;
    scrollStart = carousel.scrollLeft;
    carousel.style.scrollBehavior = 'auto';
    carousel.style.scrollSnapType = 'none';
    carousel.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', e => {
    if (!isDown) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 3) hasDragged = true;
    carousel.scrollLeft = scrollStart - dx;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    carousel.style.scrollBehavior = '';
    carousel.style.scrollSnapType = '';
    carousel.style.cursor = '';
  });

  carousel.addEventListener('click', e => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }, true);
}

function setupAutoScroll(carousel) {
  const interval = 5000;
  let timer = null;
  let inView = false;

  function tick() {
    if (document.hidden || carousel.dataset.isAutoScrolling !== 'true') return;
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    if (slides.length === 0) return;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
    const w = slides[0].offsetWidth + gap;
    const max = carousel.scrollWidth - carousel.clientWidth;
    carousel.scrollTo({
      left: carousel.scrollLeft >= max - 1 ? 0 : carousel.scrollLeft + w,
      behavior: 'smooth'
    });
  }

  function start() {
    if (inView && !document.hidden && !timer) timer = setInterval(tick, interval);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });
  }, { threshold: 0.1 });

  observer.observe(carousel);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
}