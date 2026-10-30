import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let locks = 0;

const headerOffset = () => -((parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 76) + 8);

export function initScroll() {
  if (!env.reduced && !env.lite) {
    lenis = new Lenis({ lerp: 0.1, touchMultiplier: 1.3 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    const target = document.querySelector(decodeURIComponent(url.hash));
    if (!target) return;
    event.preventDefault();
    scrollToTarget(target);
    history.replaceState(null, '', url.hash);
  });

  if (location.hash) {
    const target = document.querySelector(decodeURIComponent(location.hash));
    if (target) window.addEventListener('load', () => scrollToTarget(target, true), { once: true });
  }
}

export function scrollToTarget(target: Element | number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(target as HTMLElement | number, { offset: typeof target === 'number' ? 0 : headerOffset(), immediate, duration: 1.4 });
    return;
  }
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY + headerOffset();
  window.scrollTo({ top, behavior: immediate || env.reduced ? 'auto' : 'smooth' });
}

export function lockScroll() {
  locks += 1;
  if (locks > 1) return;
  lenis?.stop();
  document.documentElement.style.overflow = 'hidden';
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  lenis?.start();
  document.documentElement.style.overflow = '';
}
