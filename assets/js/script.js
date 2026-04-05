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

  // --- Animal fact ticker ---
  initAnimalFacts();
});

/* ---- Small media decoding/perf optimizations ---- */
function optimizeImages() {
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
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
    '.info-section, .brands-section, .services-section, .gallery-section, .hours-container, .live-animals-section, .why-us-section, .faq-section, .in-store-section'
  );
  const staggerEls = document.querySelectorAll(
    '.pet-categories, .services-grid, .contact-cards, .perfect-for-grid, .hours, .housing-grid, .why-us-grid, .faq-list'
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

  // Pre-load lazy images before their section scrolls into view
  const preloadObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('img[loading="lazy"]').forEach(img => {
          img.loading = 'eager';
        });
        preloadObs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px 300px 0px' });
  revealEls.forEach(el => preloadObs.observe(el));

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

  const slideArray = Array.from(slides);
  let currentIndex = 0;

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

  function show(index) {
    currentIndex = (index + slideArray.length) % slideArray.length;
    const source = slideArray[currentIndex];
    img.src = source.src;
    img.alt = source.alt;
  }

  function open(index) {
    show(index);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  slideArray.forEach((slide, i) => {
    slide.style.cursor = 'zoom-in';
    slide.addEventListener('click', () => open(i));
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Touch swipe support
  let touchStartX = 0;
  overlay.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  overlay.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) show(currentIndex + 1);
      else show(currentIndex - 1);
    }
  }, { passive: true });

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(currentIndex + 1);
    else if (e.key === 'ArrowLeft') show(currentIndex - 1);
  });
}

/* ---- Accordion (Live Animals section) ---- */
function initAccordion() {
  const items = document.querySelectorAll('.accordion-item');
  if (items.length === 0) return;

  // Remove any hidden attributes so CSS max-height controls visibility
  items.forEach(item => {
    const panel = item.querySelector('.accordion-panel');
    if (panel) {
      panel.removeAttribute('hidden');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  items.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const panel = item.querySelector('.accordion-panel');
    if (!trigger || !panel) return;

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      // Close all other panels
      items.forEach(other => {
        const ot = other.querySelector('.accordion-trigger');
        const op = other.querySelector('.accordion-panel');
        if (ot && ot !== trigger) {
          ot.setAttribute('aria-expanded', 'false');
          if (op) { op.classList.remove('is-open'); op.setAttribute('aria-hidden', 'true'); }
        }
      });

      // Toggle clicked
      trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.classList.toggle('is-open', !isOpen);
      panel.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    });
  });
}

/* ---- Animal fact ticker ---- */
function initAnimalFacts() {
  const display    = document.getElementById('factDisplay');
  const emojiEl    = document.getElementById('factEmoji');
  const tagEl      = document.getElementById('factTag');
  const counterEl  = document.getElementById('factCounter');
  const progressEl = document.getElementById('factProgressBar');
  const nextBtn    = document.querySelector('.fact-next');
  const prevBtn    = document.querySelector('.fact-prev');
  const catBtns    = document.querySelectorAll('.fact-cat');
  const card       = document.querySelector('.fact-card');
  if (!display) return;

  const CYCLE_MS = 10000;    // auto-advance interval
  const FADE_MS  = 300;      // fade-out duration

  const facts = [
    // ---- Reptiles ----
    { cat: 'reptile', emoji: '🐍', tag: 'Reptile', text: 'Ball pythons can live over 30 years with proper care, making them genuine lifelong companions.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Axolotls can regenerate their limbs, spinal cord, and even parts of their heart and brain.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Crested geckos were thought extinct until 1994 when they were rediscovered in New Caledonia.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Leopard geckos store fat in their tails. A plump tail means a healthy, well-fed gecko.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Bearded dragons wave one arm as a social signal, essentially saying "I see you, we\'re good."' },
    { cat: 'reptile', emoji: '🐍', tag: 'Reptile', text: 'Corn snakes are docile, beginner-friendly, and come in hundreds of selectively bred colour morphs.' },
    { cat: 'reptile', emoji: '🐊', tag: 'Reptile', text: 'Blue-tongued skinks flash their vivid tongue to startle predators. It\'s a bluff almost every time.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Chameleons change colour to communicate mood and regulate temperature, not for camouflage.' },
    { cat: 'reptile', emoji: '🐍', tag: 'Reptile', text: 'Hognose snakes play dead when threatened, dramatically rolling belly-up to sell the act.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Gargoyle geckos are named for their horn-like cranial bumps. They\'re fully arboreal and very calm.' },
    { cat: 'reptile', emoji: '🐢', tag: 'Reptile', text: 'A turtle\'s shell contains about 60 fused bones covered in keratin scutes. It\'s literally part of the skeleton.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Tokay geckos are among the loudest reptiles. Their "to-kay!" bark can be heard across a room.' },
    { cat: 'reptile', emoji: '🐍', tag: 'Reptile', text: 'Ball pythons are ambush hunters. In captivity they prefer snug hides that touch their body on all sides.' },
    { cat: 'reptile', emoji: '🦎', tag: 'Reptile', text: 'Bearded dragons need a basking spot of 38\u201343 \u00b0C and full-spectrum UVB to stay healthy long-term.' },

    // ---- Fish ----
    { cat: 'fish', emoji: '🐠', tag: 'Fish', text: 'Clownfish are all born male. The dominant individual in a group changes sex to become female.' },
    { cat: 'fish', emoji: '🐟', tag: 'Fish', text: 'Bettas breathe air using a labyrinth organ and will surface for oxygen just like we do.' },
    { cat: 'fish', emoji: '🐡', tag: 'Fish', text: 'Male bettas recognise their own reflection and will flare aggressively at a mirror for minutes.' },
    { cat: 'fish', emoji: '🐟', tag: 'Fish', text: 'Goldfish remember things for at least three months. The "3-second memory" myth is completely false.' },
    { cat: 'fish', emoji: '🐠', tag: 'Fish', text: 'Neon tetras school together to confuse predators. In a planted tank, they look like moving starlight.' },
    { cat: 'fish', emoji: '🐡', tag: 'Fish', text: 'Dwarf puffers are fully freshwater, surprisingly intelligent, and will beg their keeper for food.' },
    { cat: 'fish', emoji: '🐡', tag: 'Fish', text: 'Discus are called the "king of aquarium fish" due to their beauty and demanding water requirements.' },
    { cat: 'fish', emoji: '🐟', tag: 'Fish', text: 'Corydoras catfish "blink" by tilting their eyes downward, making them one of the few fish with visible expressions.' },
    { cat: 'fish', emoji: '🐠', tag: 'Fish', text: 'Otocinclus are gentle dwarf catfish that graze algae nonstop, perfect for planted tank clean-up.' },
    { cat: 'fish', emoji: '🐟', tag: 'Fish', text: 'Kuhli loaches are nocturnal and eel-shaped. They burrow into substrate and thrive in groups.' },
    { cat: 'fish', emoji: '🐠', tag: 'Fish', text: 'Rainbowfish display their brightest colours at dawn when competing for mates. It\'s a daily light show in your tank.' },
    { cat: 'fish', emoji: '🐟', tag: 'Fish', text: 'Plecos have bony armour plates instead of scales, and some species live well over 20 years.' },
    { cat: 'fish', emoji: '🐠', tag: 'Fish', text: 'A single goldfish needs at least a 75-litre tank. Bowls are far too small and stunt their growth.' },
    { cat: 'fish', emoji: '🐟', tag: 'Fish', text: 'Guppies reproduce incredibly fast. One female can produce 20\u201360 fry every 30 days.' },

    // ---- Invertebrates ----
    { cat: 'invert', emoji: '🦐', tag: 'Invertebrate', text: 'Cherry shrimp graze on algae and biofilm around the clock, making them nature\'s perfect tank cleaning crew.' },
    { cat: 'invert', emoji: '🐚', tag: 'Invertebrate', text: 'Nerite snails eat algae voraciously but can\'t breed in freshwater, so they\'ll never overrun your tank.' },
    { cat: 'invert', emoji: '🦀', tag: 'Invertebrate', text: 'Vampire crabs have striking yellow eyes and need a paludarium with both land and water zones.' },
    { cat: 'invert', emoji: '🦐', tag: 'Invertebrate', text: 'A small group of Amano shrimp can visibly clear algae from a tank in just a few days.' },
    { cat: 'invert', emoji: '🦐', tag: 'Invertebrate', text: 'Blue Bolt shrimp are selectively bred from Taiwan Bee lines and require very soft, acidic water.' },
    { cat: 'invert', emoji: '🐚', tag: 'Invertebrate', text: 'Mystery snails breathe air and will cruise to the surface for a gulp, unlike most aquatic snails.' },
    { cat: 'invert', emoji: '🦐', tag: 'Invertebrate', text: 'Bamboo shrimp are filter feeders that fan feathery appendages into the current to catch micro-food.' },
    { cat: 'invert', emoji: '🦀', tag: 'Invertebrate', text: 'Thai micro crabs are only about 1 cm wide and live entirely underwater. They\'re true hidden gems of the hobby.' },
    { cat: 'invert', emoji: '🦐', tag: 'Invertebrate', text: 'Shrimp are sensitive to copper. Always check medications and fertilisers for copper before dosing a shrimp tank.' },
    { cat: 'invert', emoji: '🐚', tag: 'Invertebrate', text: 'Snails need calcium-rich water or supplements to keep their shells strong. Cuttlebone works great.' },

    // ---- Birds ----
    { cat: 'bird', emoji: '🐦', tag: 'Bird', text: 'Budgies are the world\'s best talking birds. Some individuals have learned over 1,700 words.' },
    { cat: 'bird', emoji: '🦜', tag: 'Bird', text: 'Cockatiels recognise their owners by voice and face, often greeting them with a unique song.' },
    { cat: 'bird', emoji: '🐦', tag: 'Bird', text: 'Budgies need 3\u20134 hours of out-of-cage time daily. Flight and play are vital for their health.' },
    { cat: 'bird', emoji: '🦜', tag: 'Bird', text: 'Lovebirds mate for life and can pine away if separated from their bonded partner too long.' },
    { cat: 'bird', emoji: '🐦', tag: 'Bird', text: 'Finches communicate through complex songs, and males rehearse new melodies throughout their lives.' },
    { cat: 'bird', emoji: '🦜', tag: 'Bird', text: 'Conures are nicknamed the "clowns of the bird world" because they hang upside down, roll over, and dance.' },
    { cat: 'bird', emoji: '🐦', tag: 'Bird', text: 'Canaries were used in coal mines as gas detectors. Their sensitivity to toxins saved countless lives.' },
    { cat: 'bird', emoji: '🦜', tag: 'Bird', text: 'Parrots have two toes forward and two back, giving them an incredibly precise grip for climbing.' },
    { cat: 'bird', emoji: '🐦', tag: 'Bird', text: 'Non-stick cookware fumes can be fatal to birds. Always keep birds out of the kitchen when cooking.' },
    { cat: 'bird', emoji: '🦜', tag: 'Bird', text: 'A seed-only diet shortens a bird\'s lifespan. Pellets, fresh vegetables, and fruit make a balanced meal.' },

    // ---- Dogs ----
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'A dog\'s sense of smell is up to 100,000\u00d7 more sensitive than a human\'s.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Every dog\'s nose print is unique. Like a human fingerprint, no two are alike.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Dogs can understand around 250 words, count to five, and even do simple arithmetic.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Puppies are born both deaf and blind. Their ears and eyes don\'t open until about two weeks old.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Dogs curl up when sleeping to protect their organs, an instinct inherited from their wild ancestors.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'A Greyhound can hit 72 km/h in three strides, making it the second-fastest land animal.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Grapes, raisins, chocolate, and xylitol are all toxic to dogs. Keep these out of reach at all times.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Daily walks aren\'t just exercise. Sniffing new scents is mental enrichment that reduces anxiety.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Rotating protein sources in your dog\'s diet can reduce the risk of food sensitivities over time.' },
    { cat: 'dog', emoji: '🐶', tag: 'Dog', text: 'Dental disease affects over 80% of dogs by age three. Dental chews and regular brushing help prevent it.' },

    // ---- Cats ----
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Cats have 32 muscles per ear, letting them rotate each one independently to pinpoint sounds.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'A cat\'s purr vibrates at 25\u201350 Hz, the same frequency range known to promote bone healing.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Cats spend about 70% of their lives asleep. That\'s roughly 13\u201316 hours every single day.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'A group of cats is a "clowder." A group of kittens? That\'s called a "kindle."' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Cat whiskers detect tiny changes in air current, helping them navigate in complete darkness.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Cats slow-blink at people they trust. Return the blink and you\'re speaking their language.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Lilies, even the pollen, are extremely toxic to cats. A single nibble can cause kidney failure.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'The rule of thumb for litter boxes is one per cat, plus one extra. Placement matters too.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Wet food helps cats stay hydrated because they naturally have a low thirst drive.' },
    { cat: 'cat', emoji: '🐱', tag: 'Cat', text: 'Scratching posts aren\'t a luxury. Cats need them to shed claw sheaths, stretch, and mark territory.' },

    // ---- Small Pets ----
    { cat: 'small', emoji: '🐹', tag: 'Small Pet', text: 'Hamsters run up to 8 km on their wheel each night. A proper wheel isn\'t optional, it\'s essential.' },
    { cat: 'small', emoji: '🐰', tag: 'Small Pet', text: 'Rabbits "binky" by leaping and twisting mid-air. It\'s a pure expression of happiness.' },
    { cat: 'small', emoji: '🐹', tag: 'Small Pet', text: 'Guinea pigs "popcorn" with spontaneous hops and spins when they\'re excited or content.' },
    { cat: 'small', emoji: '🐹', tag: 'Small Pet', text: 'A hamster\'s cheek pouches stretch all the way back to its hips, carrying food equal to its body weight.' },
    { cat: 'small', emoji: '🐰', tag: 'Small Pet', text: 'Rabbit teeth never stop growing. Unlimited hay keeps them worn down safely.' },
    { cat: 'small', emoji: '🐹', tag: 'Small Pet', text: 'Guinea pigs should never live alone. In Switzerland it\'s actually illegal to keep just one.' },
    { cat: 'small', emoji: '🐭', tag: 'Small Pet', text: 'Gerbils thump their hind legs to warn the colony of danger. It\'s their built-in alarm system.' },
    { cat: 'small', emoji: '🐰', tag: 'Small Pet', text: 'A rabbit\'s field of vision is nearly 360\u00b0, so they can see behind themselves without turning.' },
    { cat: 'small', emoji: '🐹', tag: 'Small Pet', text: 'Guinea pigs can\'t make their own vitamin C. Fresh bell peppers and leafy greens are a daily must.' },
    { cat: 'small', emoji: '🐹', tag: 'Small Pet', text: 'Wire-bottom cages cause sore hocks in rabbits and guinea pigs. Solid flooring with soft bedding is safest.' },

    // ---- Care Tips ----
    { cat: 'care', emoji: '💧', tag: 'Care Tip', text: 'Never skip the nitrogen cycle. It takes 4\u20136 weeks, but it\'s the #1 factor in keeping fish alive.' },
    { cat: 'care', emoji: '🌡️', tag: 'Care Tip', text: 'Reptiles can\'t self-regulate temperature. A proper warm-side/cool-side gradient is non-negotiable.' },
    { cat: 'care', emoji: '🌿', tag: 'Care Tip', text: 'Live aquarium plants outcompete algae, boost oxygen, and visibly reduce fish stress.' },
    { cat: 'care', emoji: '🐾', tag: 'Care Tip', text: 'Raw or freeze-dried food toppers on kibble can improve dental health and coat condition.' },
    { cat: 'care', emoji: '🫧', tag: 'Care Tip', text: 'Overfeeding is the #1 cause of poor water quality. Feed small amounts and remove leftovers.' },
    { cat: 'care', emoji: '🧪', tag: 'Care Tip', text: 'Test aquarium water weekly with a liquid kit. pH, ammonia, nitrite, and nitrate are the essentials.' },
    { cat: 'care', emoji: '💡', tag: 'Care Tip', text: 'Without UVB lighting, most reptiles can\'t metabolise calcium, which leads to metabolic bone disease.' },
    { cat: 'care', emoji: '🪵', tag: 'Care Tip', text: 'Bioactive setups use live plants, isopods, and natural substrate to create self-cleaning habitats.' },
    { cat: 'care', emoji: '🔄', tag: 'Care Tip', text: 'Change 20\u201330% of aquarium water weekly. Consistency matters more than volume.' },
    { cat: 'care', emoji: '🏠', tag: 'Care Tip', text: 'A single hamster needs at least 600 sq in of floor space. Most pet-store cages are too small.' },
    { cat: 'care', emoji: '🥬', tag: 'Care Tip', text: 'A rabbit\'s primary diet should be unlimited hay. Pellets and greens are supplements, not staples.' },
    { cat: 'care', emoji: '🧊', tag: 'Care Tip', text: 'Never release pets into local waterways. It spreads disease and introduces invasive species.' },
    { cat: 'care', emoji: '🪨', tag: 'Care Tip', text: 'Isopods and springtails in a bioactive vivarium break down waste, reducing manual cleaning.' },
    { cat: 'care', emoji: '🩺', tag: 'Care Tip', text: 'Annual vet check-ups apply to exotic pets too. Early detection saves reptile, bird, and small mammal lives.' },
    { cat: 'care', emoji: '🌡️', tag: 'Care Tip', text: 'Use a thermostat on every heat source. Unregulated heat mats and bulbs can overheat and burn reptiles.' },
    { cat: 'care', emoji: '🐟', tag: 'Care Tip', text: 'Acclimate new fish slowly by floating the bag and gradually mixing tank water in. Temperature shock kills.' },
    { cat: 'care', emoji: '🪴', tag: 'Care Tip', text: 'Quarantine new aquarium plants for 1\u20132 weeks before adding them. They can carry snails, pests, or disease.' },
    { cat: 'care', emoji: '💧', tag: 'Care Tip', text: 'Always dechlorinate tap water before adding it to an aquarium. Chlorine and chloramine harm fish and bacteria.' },
    { cat: 'care', emoji: '🪟', tag: 'Care Tip', text: 'Never place a tank in direct sunlight. It causes uncontrollable algae blooms and dangerous temperature swings.' },
    { cat: 'care', emoji: '🦎', tag: 'Care Tip', text: 'Reptile hides should be snug, not spacious. A tight fit makes them feel secure and reduces chronic stress.' },
    { cat: 'care', emoji: '🐾', tag: 'Care Tip', text: 'Check the first five ingredients on any pet food. Named meat protein should always come before fillers.' },
    { cat: 'care', emoji: '🧹', tag: 'Care Tip', text: 'Clean filter media in old tank water, never tap water. Chlorine kills the beneficial bacteria you need.' },
    { cat: 'care', emoji: '🐍', tag: 'Care Tip', text: 'Snakes often refuse food when they\'re about to shed. Cloudy eyes and dull skin are the telltale signs.' },
    { cat: 'care', emoji: '🌊', tag: 'Care Tip', text: 'Stable water parameters are more important than perfect numbers. Avoid chasing a "textbook" pH.' },
    { cat: 'care', emoji: '🐦', tag: 'Care Tip', text: 'Avoid scented candles, aerosols, and air fresheners near birds. Their respiratory systems are extremely sensitive.' },
    { cat: 'care', emoji: '🪱', tag: 'Care Tip', text: 'Gut-load feeder insects with vegetables before offering them. Your reptile absorbs whatever the insect ate.' },
    { cat: 'care', emoji: '🧊', tag: 'Care Tip', text: 'Frozen raw food should be thawed in the fridge, not at room temperature, to prevent bacterial growth.' },
    { cat: 'care', emoji: '💡', tag: 'Care Tip', text: 'Fish need a consistent light cycle. Use a timer to give 8\u201310 hours of light and full darkness at night.' },
    { cat: 'care', emoji: '🐢', tag: 'Care Tip', text: 'Dust feeder insects with calcium powder at every feeding for young reptiles, and every other feeding for adults.' },
    { cat: 'care', emoji: '💧', tag: 'Care Tip', text: 'Mist tropical reptile enclosures daily or use a fogger to maintain proper humidity. Dehydration causes bad sheds.' },
    { cat: 'care', emoji: '🏠', tag: 'Care Tip', text: 'Research an animal\'s adult size before buying. Many fish and reptiles outgrow starter tanks within a year.' },
    { cat: 'care', emoji: '🐾', tag: 'Care Tip', text: 'Rotate your pet\'s toys and enrichment weekly. Novel items prevent boredom and encourage natural behaviours.' },
    { cat: 'care', emoji: '🔬', tag: 'Care Tip', text: 'Cloudy aquarium water usually means a bacterial bloom. Don\'t do a massive water change. Let the cycle catch up.' },
    { cat: 'care', emoji: '🐠', tag: 'Care Tip', text: 'Match tankmates carefully. Peaceful community fish can be stressed or killed by one aggressive species.' },
    { cat: 'care', emoji: '🪵', tag: 'Care Tip', text: 'Provide multiple hides per reptile, at least one on the warm side and one on the cool side.' },
    { cat: 'care', emoji: '🧪', tag: 'Care Tip', text: 'Ammonia and nitrite should always read zero in a cycled tank. Any detectable amount means something is wrong.' },
  ];

  // --- Shuffle helper (Fisher-Yates) ---
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // --- State ---
  var activeCat = 'all';
  var filtered  = shuffle(facts.slice());
  var current   = 0;
  var timer     = null;
  var progressFrame = null;
  var cycleStart    = 0;

  // --- Filter ---
  function applyFilter(cat) {
    activeCat = cat;
    filtered = cat === 'all' ? facts.slice() : facts.filter(function(f) { return f.cat === cat; });
    shuffle(filtered);
    current = 0;
    showFact(current);
    startTimer();
  }

  catBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      catBtns.forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      applyFilter(btn.dataset.cat);
    });
  });

  // --- Display ---
  function showFact(index) {
    var f = filtered[index];
    if (!f) return;

    display.classList.add('fade-out');
    display.classList.remove('fade-in');

    setTimeout(function() {
      if (emojiEl) {
        emojiEl.textContent = f.emoji;
        emojiEl.classList.remove('pop');
        void emojiEl.offsetWidth; // reflow
        emojiEl.classList.add('pop');
        setTimeout(function() { emojiEl.classList.remove('pop'); }, 400);
      }
      if (tagEl) tagEl.textContent = f.tag;
      display.textContent = f.text;

      display.classList.remove('fade-out');
      display.classList.add('fade-in');
      setTimeout(function() { display.classList.remove('fade-in'); }, 350);

      if (counterEl) counterEl.textContent = (index + 1) + ' / ' + filtered.length;
    }, FADE_MS);
  }

  // --- Progress bar ---
  function animateProgress() {
    if (progressFrame) cancelAnimationFrame(progressFrame);
    cycleStart = performance.now();

    function tick(now) {
      var elapsed = now - cycleStart;
      var pct = Math.min((elapsed / CYCLE_MS) * 100, 100);
      if (progressEl) progressEl.style.width = pct + '%';
      if (pct < 100) progressFrame = requestAnimationFrame(tick);
    }
    progressFrame = requestAnimationFrame(tick);
  }

  // --- Timer ---
  function startTimer() {
    clearInterval(timer);
    if (progressFrame) cancelAnimationFrame(progressFrame);
    animateProgress();
    timer = setInterval(function() {
      advance(1);
    }, CYCLE_MS);
  }

  // --- Navigate ---
  function advance(dir) {
    current = (current + dir + filtered.length) % filtered.length;
    showFact(current);
    startTimer();
  }

  // --- Button events ---
  if (nextBtn) nextBtn.addEventListener('click', function() { advance(1); });
  if (prevBtn) prevBtn.addEventListener('click', function() { advance(-1); });

  // --- Keyboard on card ---
  if (card) {
    card.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight') { advance(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { advance(-1); e.preventDefault(); }
    });
  }

  // --- Swipe support ---
  if (card) {
    var touchStartX = 0;
    var touchStartY = 0;
    card.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        advance(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  // --- Pause on hover / focus ---
  var ticker = document.querySelector('.fact-ticker');
  if (ticker) {
    ticker.addEventListener('mouseenter', function() {
      clearInterval(timer);
      if (progressFrame) cancelAnimationFrame(progressFrame);
    });
    ticker.addEventListener('mouseleave', function() { startTimer(); });
    ticker.addEventListener('focusin', function() {
      clearInterval(timer);
      if (progressFrame) cancelAnimationFrame(progressFrame);
    });
    ticker.addEventListener('focusout', function(e) {
      if (!ticker.contains(e.relatedTarget)) startTimer();
    });
  }

  // --- Init ---
  showFact(current);
  startTimer();
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
    setupKeyboardNav(carousel);
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

function setupKeyboardNav(carousel) {
  // Make carousel focusable so it can receive keyboard events
  if (!carousel.getAttribute('tabindex')) carousel.setAttribute('tabindex', '0');

  carousel.addEventListener('keydown', e => {
    const slides = carousel.querySelectorAll('.brand-slide, .gallery-slide');
    if (slides.length === 0) return;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
    const step = slides[0].offsetWidth + gap;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      carousel.scrollBy({ left: step, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      carousel.scrollBy({ left: -step, behavior: 'smooth' });
    }
  });
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