import { gsap } from 'gsap';
import { $, $$, env } from './env';
import { lockScroll, unlockScroll, scrollToTarget } from './scroll';

export function initHeader() {
  const header = $('[data-header]');
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const bg = $('[data-menu-bg]');
  const items = $$('[data-menu-item]');
  const totop = $('[data-totop]');
  const ring = $<SVGCircleElement>('[data-totop-ring]');
  const root = document.documentElement;
  if (!header || !toggle || !menu || !bg) return;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 40);
    if (!root.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > 320 && y > lastY + 2);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    if (totop) totop.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    if (ring && max > 0) ring.style.strokeDashoffset = String(100 - (y / max) * 100);
    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();

  totop?.addEventListener('click', () => {
    scrollToTarget(0);
  });

  menu.setAttribute('data-lenis-prevent', '');
  const timeline = gsap.timeline({ paused: true });
  if (env.reduced) {
    timeline.set(bg, { clipPath: 'inset(0% 0% 0% 0%)' });
  } else {
    timeline
      .fromTo(bg, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
      .fromTo(items, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05 }, '-=0.35');
  }

  const setOpen = (open: boolean) => {
    if (open === root.classList.contains('menu-open')) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    if (open) {
      root.classList.add('menu-open');
      lockScroll();
      timeline.timeScale(1).play();
    } else {
      timeline.timeScale(1.6).reverse();
      timeline.eventCallback('onReverseComplete', () => {
        root.classList.remove('menu-open');
        timeline.eventCallback('onReverseComplete', null);
      });
      if (env.reduced) root.classList.remove('menu-open');
      unlockScroll();
    }
  };

  toggle.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')));
  menu.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a, button')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}
