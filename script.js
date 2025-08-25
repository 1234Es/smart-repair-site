/* =========================================================
   Utilities
   ========================================================= */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* =========================================================
   Config (edit in one place)
   ========================================================= */
const PHONE_NUMBER = '+447000000111'; // used for all tel: links & WhatsApp fallback
const SERVICE_BASE = { lat: 51.4613, lng: -0.0106 }; // Lewisham
const SERVICE_RADIUS_METERS = 32000;                 // ~32km covers Greater London

// Gallery auto-discovery
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const SHOW_LIMIT = 4; // thumbnails per section on the page

// Results folders (must match your assets/images structure)
const CATEGORIES = [
  { key:'lfrepair',      id:'grid-lfrepair',      prefix:'./assets/images/lfrepair/LFRepair' },
  { key:'paintrepair',   id:'grid-paintrepair',   prefix:'./assets/images/paintrepair/PaintRepair' },
  { key:'plasticrepair', id:'grid-plasticrepair', prefix:'./assets/images/plasticrepair/PlasticRepair' },
  { key:'glassrepair',   id:'grid-glassrepair',   prefix:'./assets/images/glassrepair/GlassRepair' }
];

/* =========================================================
   On DOM Ready
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // 1) Footer year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // 2) Mobile nav burger
  const toggle = $('.nav-toggle');
  const menu = $('#menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // 3) Before/After sliders
  initBeforeAfterSliders();

  // 4) Results gallery (auto-load) + Lightbox wiring
  initResultsAndLightbox();

  // 5) Contact buttons (phone + WhatsApp)
  wireContactButtons();

  // 6) Sticky bar: “Back to Top” button
  const topBtn = $('#stickyTop');
  if (topBtn) {
    topBtn.addEventListener('click', () => {
      // Prefer anchor if present, otherwise scroll to 0
      const hero = document.getElementById('top');
      if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});

/* =========================================================
   Before/After slider (Services)
   ========================================================= */
function initBeforeAfterSliders(){
  $$('.ba').forEach(container => {
    const before = container.querySelector('.ba-before');
    const after  = container.querySelector('.ba-after');
    const slider = container.querySelector('input[type="range"]');
    if (!before || !after || !slider) return;

    const update = () => {
      const v = clamp(Number(slider.value), 0, 100);
      // Left image is BEFORE, Right is AFTER
      before.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
      after.style.clipPath  = `inset(0 0 0 ${v}%)`;
    };

    slider.addEventListener('input', update, { passive: true });
    update();

    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      slider.value = clamp(Math.round((x / rect.width) * 100), 0, 100);
      update();
    };
    container.addEventListener('mousemove', onMove, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: true });
  });
}

/* =========================================================
   Results (auto load) + Lightbox (thumbnails + counter)
   ========================================================= */
const galleryStore = {}; // { key: [url1, url2, ...] }

function findExistingForIndex(prefix, index) {
  return new Promise((resolve) => {
    let i = 0;
    function tryNext() {
      if (i >= EXTENSIONS.length) { resolve(null); return; }
      const ext = EXTENSIONS[i++];
      const url = `${prefix}${index}${ext}`;
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = tryNext;
      img.src = url + `?v=${index}`; // cache-bust per index
    }
    tryNext();
  });
}

async function loadCategoryGrid(cfg) {
  const container = document.getElementById(cfg.id);
  if (!container) return;

  const urls = [];
  for (let i = 1; i <= 100; i++) {
    /* eslint no-await-in-loop: 0 */
    const url = await findExistingForIndex(cfg.prefix, i);
    if (!url) {
      if (urls.length > 0) break;
      continue;
    }
    urls.push(url);
  }
  galleryStore[cfg.key] = urls;

  // Build up to SHOW_LIMIT thumbnails in the page grid
  const count = Math.min(SHOW_LIMIT, urls.length);
  for (let i = 0; i < count; i++) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = urls[i];
    img.alt = `${cfg.key} result ${i+1}`;
    img.dataset.section = cfg.key;
    img.dataset.index = String(i);
    fig.appendChild(img);
    container.appendChild(fig);
  }

  // Delegate click to open lightbox in this section
  container.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.tagName.toLowerCase() === 'img' && t.dataset.section) {
      openLightbox(t.dataset.section, Number(t.dataset.index));
    }
  });
}

function initResultsAndLightbox(){
  // Load each category grid
  CATEGORIES.forEach(loadCategoryGrid);

  // Lightbox elements
  const lb      = $('#lightbox');
  const lbImg   = $('.lb-img', lb);
  const lbPrev  = $('.lb-prev', lb);
  const lbNext  = $('.lb-next', lb);
  const lbClose = $('.lb-close', lb);
  const lbCount = $('.lb-counter', lb);
  const lbThumbs= $('#lbThumbs', lb);

  if (!lb || !lbImg || !lbPrev || !lbNext || !lbClose || !lbCount || !lbThumbs) return;

  let currentSection = null;
  let currentIndex = 0;

  function renderCounter(){
    const list = galleryStore[currentSection] || [];
    lbCount.textContent = `${list.length ? currentIndex + 1 : 0} / ${list.length || 0}`;
  }

  function renderImage(){
    const list = galleryStore[currentSection] || [];
    if (!list.length) return closeLightbox();
    lbImg.src = list[currentIndex];
    lbImg.alt = `${currentSection} image ${currentIndex+1}`;
    renderCounter();
    highlightActiveThumb();
  }

  function buildThumbs(){
    // Build thumbnails for the current section only
    const list = galleryStore[currentSection] || [];
    lbThumbs.innerHTML = '';
    list.forEach((src, idx) => {
      const t = new Image();
      t.src = src;
      t.alt = `${currentSection} thumb ${idx+1}`;
      t.addEventListener('click', () => {
        currentIndex = idx;
        renderImage();
      });
      lbThumbs.appendChild(t);
    });
    highlightActiveThumb();
  }

  function highlightActiveThumb(){
    const nodes = $$('#lbThumbs img', lb);
    nodes.forEach((n, i) => n.classList.toggle('active', i === currentIndex));
  }

  function openLightbox(sectionKey, startIndex = 0){
    currentSection = sectionKey;
    currentIndex = startIndex;
    buildThumbs();
    renderImage();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function nextImage(){
    const list = galleryStore[currentSection] || [];
    if (!list.length) return;
    currentIndex = (currentIndex + 1) % list.length;
    renderImage();
  }

  function prevImage(){
    const list = galleryStore[currentSection] || [];
    if (!list.length) return;
    currentIndex = (currentIndex - 1 + list.length) % list.length;
    renderImage();
  }

  // Controls
  lbNext.addEventListener('click', nextImage);
  lbPrev.addEventListener('click', prevImage);
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });

  // Touch swipe
  let touchStartX = 0, touchStartY = 0;
  lb.addEventListener('touchstart', (e) => {
    if (!lb.classList.contains('open')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (!lb.classList.contains('open')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dy) < 40) { dx < 0 ? nextImage() : prevImage(); }
  }, { passive: true });

  // Expose for page-scope handlers if needed later
  window.openLightbox = openLightbox;
}

/* =========================================================
   Contact buttons (phone + WhatsApp prefill)
   ========================================================= */
function wireContactButtons(){
  // Set the same phone number everywhere
  ['phoneLink','callBtn2','stickyCall'].forEach(id => {
    const a = document.getElementById(id);
    if (a) a.setAttribute('href', `tel:${PHONE_NUMBER}`);
  });

  // WhatsApp links (falls back to PHONE_NUMBER if no data-attr)
  const waButtons = ['waBtn','waBtn2','stickyWA'].map(id => document.getElementById(id)).filter(Boolean);

  const makeWAURL = ({ name='', phoneTxt='', service='', time='', message='' } = {}) => {
    const area = $('#areaLabel')?.textContent?.trim() || 'London & Nearby';
    const waNumber = ($('#waBtn')?.dataset.wa || PHONE_NUMBER).replace(/\D/g,'');
    const text = [
      "Hi Güray,",
      "",
      "I'd like a quote.",
      "",
      `Name: ${name}`,
      `Phone: ${phoneTxt}`,
      `Service: ${service}`,
      `Preferred time: ${time}`,
      `Location: ${area}`,
      "",
      "Details:",
      `${message}`
    ].join('\n');
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  };

  // Default WhatsApp targets (empty prefill)
  waButtons.forEach(a => a.setAttribute('href', makeWAURL()));

  // Form → WhatsApp with prefill
  const form = $('#quoteForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const url = makeWAURL({
        name: String(fd.get('name')||''),
        phoneTxt: String(fd.get('phone')||''),
        service: String(fd.get('service')||''),
        time: String(fd.get('time')||''),
        message: String(fd.get('message')||'')
      });
      window.open(url, '_blank');
    });
  }
}

/* =========================================================
   Google Map (Contact section) — global callback
   ========================================================= */
function initServiceMap(){
  const el = document.getElementById('serviceMap');
  if (!el || !window.google || !google.maps) return;

  const map = new google.maps.Map(el, {
    center: SERVICE_BASE,
    zoom: 11,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false
  });

  new google.maps.Marker({
    position: SERVICE_BASE,
    map,
    title: 'Smart Car Repair — Base',
    label: { text: 'Base', color: '#0f172a', fontWeight: '700' }
  });

  const circle = new google.maps.Circle({
    strokeColor: '#2563eb',
    strokeOpacity: 0.6,
    strokeWeight: 2,
    fillColor: '#2563eb',
    fillOpacity: 0.18,
    map,
    center: SERVICE_BASE,
    radius: SERVICE_RADIUS_METERS
  });

  if (circle.getBounds) {
    map.fitBounds(circle.getBounds(), 60);
  } else {
    map.setCenter(SERVICE_BASE);
    map.setZoom(10);
  }
}
// IMPORTANT: expose callback globally for Google loader
window.initServiceMap = initServiceMap;
