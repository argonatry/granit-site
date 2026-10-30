import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { $, $$, env } from './env';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const EASE = 'expo.out';

const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((resolve) => setTimeout(resolve, 1500))]);

export async function initMotion() {
  if (env.reduced) {
    root.classList.add('anim-ready');
    initCounters(true);
    return;
  }

  await fontsReady();

  const heroSplits = splitHero();
  splitHeadings();
  root.classList.add('anim-ready');

  initReveals();
  initCounters(false);
  initSlogans();
  initMarquee();

  if (!env.lite) {
    initHeroScroll();
    initParallax();
    initGallery();
    initFooter();
  }

  await runPreloader();
  playHeroIntro(heroSplits);

  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

function splitHero() {
  return $$('[data-split="hero"]').map(
    (el) =>
      SplitText.create(el, {
        type: 'chars,lines',
        mask: 'lines',
        linesClass: 'split-line',
      }).chars,
  );
}

function splitHeadings() {
  $$('[data-split]:not([data-split="hero"])').forEach((el) => {
    SplitText.create(el, {
      type: 'lines,words',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.words, {
          yPercent: 115,
          rotate: 4,
          duration: 1.2,
          ease: EASE,
          stagger: 0.045,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
    });
  });
}

function initReveals() {
  const masks = $$('[data-reveal="mask"]');
  masks.forEach((el) => {
    const media = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    tl.fromTo(
      el,
      { opacity: 1, clipPath: 'inset(18% 12% 18% 12% round 24px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.5, ease: 'expo.inOut' },
    );
    if (media) tl.fromTo(media, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: EASE }, 0);
  });

  const items = $$('[data-reveal]:not([data-reveal="mask"])');
  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { opacity: 0, y: env.lite ? 0 : 48 },
        { opacity: 1, y: 0, duration: env.lite ? 0.6 : 1.1, ease: EASE, stagger: 0.08, overwrite: true, clearProps: 'transform' },
      ),
  });
}

function initCounters(instant: boolean) {
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    if (instant || !Number.isFinite(target)) {
      el.textContent = String(target);
      return;
    }
    const from = target > 1900 ? target - 40 : 0;
    const state = { value: from };
    el.textContent = String(from);
    gsap.to(state, {
      value: target,
      duration: 2.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(state.value));
      },
    });
  });
}

function initSlogans() {
  const slogans = $$('[data-slogan]');
  if (slogans.length < 2) return;
  let index = 0;
  gsap.set(slogans.slice(1), { opacity: 0, yPercent: 30 });
  setInterval(() => {
    const current = slogans[index];
    index = (index + 1) % slogans.length;
    const next = slogans[index];
    current.setAttribute('aria-hidden', 'true');
    next.removeAttribute('aria-hidden');
    gsap.to(current, { opacity: 0, yPercent: -30, duration: 0.7, ease: 'power3.in' });
    gsap.fromTo(next, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.9, ease: EASE, delay: 0.55 });
  }, 4800);
}

function initMarquee() {
  $$('[data-marquee]').forEach((el) => {
    const track = $('[data-marquee-track]', el);
    if (!track) return;
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    if (env.lite) return;
    let direction = 1;
    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const velocity = self.getVelocity();
        if (Math.abs(velocity) > 20) direction = velocity > 0 ? 1 : -1;
        const boost = 1 + Math.min(Math.abs(velocity) / 500, 5);
        gsap.to(loop, { timeScale: direction * boost, duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: direction, duration: 1.2, delay: 0.25, ease: 'power2.out' });
      },
    });
  });
}

function initHeroScroll() {
  const hero = $('[data-hero]');
  const media = $('[data-hero-media]');
  if (!hero || !media) return;
  const title = $('.hero__title', hero);
  gsap
    .timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    .fromTo(media, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(8% 4% 14% 4% round 32px)', ease: 'none' }, 0)
    .to($$('img, video', media), { scale: 1.12, ease: 'none' }, 0)
    .to(title, { yPercent: -35, opacity: 0.2, ease: 'none' }, 0);
}

function initParallax() {
  $$('[data-parallax-wrap] img').forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -8 },
      { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('[data-parallax-wrap]'), start: 'top bottom', end: 'bottom top', scrub: true } },
    );
  });
  $$('[data-vblock-media] img').forEach((img) => {
    gsap.fromTo(
      img,
      { scale: 1.25 },
      { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'center center', scrub: true } },
    );
  });
}

function initGallery() {
  const section = $('[data-gallery]');
  const track = $('[data-gallery-track]');
  const viewport = $('[data-gallery-viewport]');
  const pin = $('[data-gallery-pin]');
  const progress = $('[data-gallery-progress]');
  if (!section || !track || !viewport || !pin) return;
  const items = $$('.gallery__item', track);

  const mm = gsap.matchMedia();
  mm.add('(min-width: 960px)', () => {
    section.classList.add('gallery--pinned');
    const distance = () => track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(viewport).paddingLeft) * 2;
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'center center',
        end: () => `+=${distance() * 0.6}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (progress) progress.textContent = String(Math.min(items.length, Math.floor(self.progress * (items.length - 1)) + 1)).padStart(2, '0');
        },
      },
    });
    return () => {
      tween.kill();
      section.classList.remove('gallery--pinned');
    };
  });

  mm.add('(max-width: 959px)', () => {
    const onScroll = () => {
      if (!progress) return;
      const ratio = viewport.scrollLeft / Math.max(1, viewport.scrollWidth - viewport.clientWidth);
      progress.textContent = String(Math.round(ratio * (items.length - 1)) + 1).padStart(2, '0');
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  });
}

function initFooter() {
  const mega = $('[data-footer-mega]');
  if (!mega) return;
  gsap.from(mega.children, {
    yPercent: 60,
    opacity: 0,
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: mega, start: 'top bottom', end: 'bottom 85%', scrub: true },
  });
}

function runPreloader() {
  const preloader = $('[data-preloader]');
  const count = $('[data-preloader-count]');
  if (!env.firstVisit || !preloader || !count) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const state = { value: 0 };
    gsap
      .timeline({ onComplete: () => (preloader.style.display = 'none') })
      .to(state, {
        value: 100,
        duration: 1.3,
        ease: 'power2.inOut',
        onUpdate: () => {
          count.textContent = String(Math.round(state.value));
        },
      })
      .to(preloader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut', onStart: resolve }, '+=0.1');
  });
}

function playHeroIntro(splits: Element[][]) {
  const fades = $$('[data-hero-fade]');
  const media = $('[data-hero-media]');
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  if (media && !env.lite) tl.from(media, { scale: 1.12, duration: 2.2, ease: 'expo.out' }, 0);
  splits.forEach((chars, i) => {
    tl.from(chars, { yPercent: 115, rotate: 6, duration: 1.3, stagger: 0.035 }, 0.15 + i * 0.18);
  });
  tl.fromTo(fades, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.6);
}
