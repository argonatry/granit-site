import { $$ } from './env';

async function createMap(el: HTMLElement) {
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  const lat = Number(el.dataset.lat);
  const lng = Number(el.dataset.lng);
  const label = el.dataset.label ?? '';
  el.innerHTML = '';

  const touch = window.matchMedia('(pointer: coarse)').matches;
  const map = L.map(el, {
    center: [lat, lng],
    zoom: 13,
    scrollWheelZoom: false,
    dragging: !touch,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const icon = L.divIcon({
    className: 'map-pin',
    html: `<span class="map-pin__wave"></span><span class="map-pin__dot"></span><span class="map-pin__label"></span>`,
    iconSize: [0, 0],
  });
  const marker = L.marker([lat, lng], { icon, title: label, keyboard: false }).addTo(map);
  const labelEl = marker.getElement()?.querySelector('.map-pin__label');
  if (labelEl) labelEl.textContent = label;

  const hint = document.createElement('div');
  hint.className = 'map-hint';
  hint.textContent = touch ? 'Торкніться карти, щоб нею керувати' : 'Клікніть по карті, щоб масштабувати прокруткою';
  el.append(hint);

  let active = false;
  const activate = () => {
    if (active) return;
    active = true;
    map.scrollWheelZoom.enable();
    map.dragging.enable();
    el.setAttribute('data-lenis-prevent', '');
    hint.classList.remove('is-visible');
  };
  const deactivate = () => {
    if (!active) return;
    active = false;
    map.scrollWheelZoom.disable();
    if (touch) map.dragging.disable();
    el.removeAttribute('data-lenis-prevent');
  };

  let hintTimer = 0;
  const flashHint = () => {
    if (active) return;
    hint.classList.add('is-visible');
    clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.remove('is-visible'), 1400);
  };

  map.on('click', activate);
  el.addEventListener('wheel', flashHint, { passive: true });
  el.addEventListener('touchstart', (event) => event.touches.length === 1 && flashHint(), { passive: true });
  el.addEventListener('mouseleave', deactivate);
  document.addEventListener('touchstart', (event) => !el.contains(event.target as Node) && deactivate(), { passive: true });
}

export function initMap() {
  const maps = $$('[data-map]');
  if (!maps.length) return;
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        createMap(entry.target as HTMLElement).catch(() => {
          const el = entry.target as HTMLElement;
          el.innerHTML = `<p class="mapblock__fallback muted"><a href="${el.dataset.route}" target="_blank" rel="noopener">Відкрити карту в Google Maps</a></p>`;
        });
      }),
    { rootMargin: '400px 0px' },
  );
  maps.forEach((m) => observer.observe(m));
}
