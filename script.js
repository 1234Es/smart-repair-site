// helper clamp
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

document.addEventListener('DOMContentLoaded', () => {
  // year in footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // mobile nav toggle with burger animation
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  // Before/After split: LEFT = BEFORE, RIGHT = AFTER (always)
  document.querySelectorAll('.ba').forEach(container => {
    const before = container.querySelector('.ba-before');
    const after  = container.querySelector('.ba-after');
    const slider = container.querySelector('input[type="range"]');

    const update = () => {
      const v = clamp(Number(slider.value), 0, 100); // split position from left
      // Left pane: BEFORE up to v%
      before.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
      // Right pane: AFTER from v% to 100%
      after.style.clipPath  = `inset(0 0 0 ${v}%)`;
    };

    slider.addEventListener('input', update, { passive: true });
    update();

    // drag anywhere to move slider
    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      slider.value = clamp(Math.round((x / rect.width) * 100), 0, 100);
      update();
    };
    ['mousemove','touchmove'].forEach(evt =>
      container.addEventListener(evt, onMove, { passive: true })
    );
  });

  // contact buttons: phone + WhatsApp prefill from data attributes
  const phone = document.getElementById('callBtn')?.dataset.phone || '+447000000000';
  const area  = document.getElementById('waBtn')?.dataset.area  || 'Your Service Area';

  const waLinks = [document.getElementById('waBtn'), document.getElementById('waBtn2'), document.getElementById('stickyWA')].filter(Boolean);
  const phoneLinks = [document.getElementById('stickyCall'), document.getElementById('phoneLink')].filter(Boolean);

  phoneLinks.forEach(a => a.setAttribute('href', `tel:${phone}`));

  function makeWAURL({ name='', phoneTxt='', service='', time='', message='' }={}){
    const text = `Hi Güray,%0A%0AI'd like a quote.%0A%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phoneTxt)}%0AService: ${encodeURIComponent(service)}%0APreferred time: ${encodeURIComponent(time)}%0ALocation: ${encodeURIComponent(area)}%0A%0ADetails:%0A${encodeURIComponent(message)}`;
    const waNumber = document.getElementById('waBtn')?.dataset.wa || phone; // same number by default
    return `https://wa.me/${waNumber.replace(/\D/g,'')}?text=${text}`;
  }
  waLinks.forEach(a => a.setAttribute('href', makeWAURL()));

  // form submission -> WhatsApp
  const form = document.getElementById('quoteForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const url = makeWAURL({
        name: fd.get('name'),
        phoneTxt: fd.get('phone'),
        service: fd.get('service'),
        time: fd.get('time'),
        message: fd.get('message')
      });
      window.open(url, '_blank');
    });
  }
});
