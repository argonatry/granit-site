import type PhotoSwipeType from 'photoswipe';
import type { SlideData } from 'photoswipe';
import { $, $$, env } from './env';
import { lockScroll, unlockScroll } from './scroll';
import { showDialog } from './forms';

interface Slide extends SlideData {
  caption?: string;
  original?: string;
}

async function openLightbox(slides: Slide[], index: number) {
  const [{ default: PhotoSwipe }] = await Promise.all([import('photoswipe'), import('photoswipe/style.css')]);
  const pswp: PhotoSwipeType = new PhotoSwipe({
    dataSource: slides,
    index,
    bgOpacity: 0.94,
    showHideAnimationType: env.reduced ? 'none' : 'fade',
    padding: { top: 56, bottom: 72, left: 12, right: 12 },
    wheelToZoom: true,
    closeTitle: 'Закрити',
    zoomTitle: 'Збільшити',
    arrowPrevTitle: 'Попереднє',
    arrowNextTitle: 'Наступне',
    errorMsg: 'Не вдалося завантажити зображення',
    indexIndicatorSep: ' / ',
  });

  pswp.on('uiRegister', () => {
    pswp.ui?.registerElement({
      name: 'caption',
      order: 9,
      isButton: false,
      appendTo: 'root',
      onInit: (el) => {
        el.classList.add('pswp__caption');
        const update = () => {
          el.textContent = (pswp.currSlide?.data as Slide | undefined)?.caption ?? '';
        };
        pswp.on('change', update);
        update();
      },
    });
    pswp.ui?.registerElement({
      name: 'download',
      order: 8,
      isButton: true,
      tagName: 'a',
      title: 'Завантажити оригінал',
      html: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
      onInit: (el) => {
        const link = el as HTMLAnchorElement;
        link.setAttribute('download', '');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
        const update = () => {
          const data = pswp.currSlide?.data as Slide | undefined;
          link.href = data?.original || String(data?.src ?? '');
        };
        pswp.on('change', update);
        update();
      },
    });
  });

  pswp.on('afterInit', () => pswp.element?.setAttribute('data-lenis-prevent', ''));
  pswp.on('destroy', unlockScroll);
  lockScroll();
  pswp.init();
}

function initLightbox() {
  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    const doc = target.closest<HTMLAnchorElement>('[data-doc]');
    if (doc) {
      event.preventDefault();
      openLightbox(
        [
          {
            src: doc.dataset.doc,
            width: Number(doc.dataset.docW),
            height: Number(doc.dataset.docH),
            caption: doc.dataset.docTitle,
            alt: doc.dataset.docTitle,
            original: doc.getAttribute('href') ?? undefined,
          },
        ],
        0,
      );
      return;
    }

    const link = target.closest<HTMLAnchorElement>('[data-pswp-gallery] a[data-pswp-width]');
    if (!link) return;
    event.preventDefault();
    const gallery = link.closest('[data-pswp-gallery]')!;
    const links = $$<HTMLAnchorElement>('a[data-pswp-width]', gallery);
    openLightbox(
      links.map((a) => ({
        src: a.getAttribute('href') ?? '',
        width: Number(a.dataset.pswpWidth),
        height: Number(a.dataset.pswpHeight),
        caption: a.dataset.pswpCaption,
        alt: a.dataset.pswpCaption,
        original: a.getAttribute('href') ?? undefined,
      })),
      links.indexOf(link),
    );
  });
}

function initPdf() {
  const dialog = $<HTMLDialogElement>('[data-pdf-dialog]');
  const pages = $('[data-pdf-pages]');
  const state = $('[data-pdf-state]');
  const title = $('[data-pdf-heading]');
  const openLink = $<HTMLAnchorElement>('[data-pdf-open]');
  const download = $<HTMLAnchorElement>('[data-pdf-download]');
  const viewport = $('[data-pdf-viewport]');
  if (!dialog || !pages || !state || !title || !openLink || !download || !viewport) return;

  let cleanup: (() => void) | null = null;

  dialog.addEventListener('close', () => {
    cleanup?.();
    cleanup = null;
    pages.innerHTML = '';
  });

  const open = async (url: string, name: string) => {
    title.textContent = name;
    openLink.href = url;
    download.href = url;
    pages.innerHTML = '';
    state.textContent = 'Завантаження документа…';
    showDialog(dialog);

    try {
      const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ url, disableAutoFetch: true });
      const doc = await task.promise;
      if (!dialog.open) {
        task.destroy();
        return;
      }
      const first = await doc.getPage(1);
      const base = first.getViewport({ scale: 1 });
      const width = Math.min(viewport.clientWidth - 32, 980);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rendered = new Set<number>();

      const render = async (canvas: HTMLCanvasElement) => {
        const number = Number(canvas.dataset.page);
        if (rendered.has(number)) return;
        rendered.add(number);
        const page = await doc.getPage(number);
        const vp = page.getViewport({ scale: (width * ratio) / page.getViewport({ scale: 1 }).width });
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        canvas.style.aspectRatio = `${vp.width} / ${vp.height}`;
        await page.render({ canvas, viewport: vp }).promise;
      };

      const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && render(entry.target as HTMLCanvasElement)),
        { root: viewport, rootMargin: '600px 0px' },
      );

      for (let i = 1; i <= doc.numPages; i += 1) {
        const canvas = document.createElement('canvas');
        canvas.dataset.page = String(i);
        canvas.setAttribute('aria-label', `Сторінка ${i} з ${doc.numPages}`);
        canvas.style.aspectRatio = `${base.width} / ${base.height}`;
        pages.append(canvas);
        observer.observe(canvas);
      }
      state.textContent = '';
      cleanup = () => {
        observer.disconnect();
        task.destroy();
      };
    } catch {
      state.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'Не вдалося показати документ у браузері. ';
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Відкрити PDF';
      a.style.textDecoration = 'underline';
      p.append(a);
      state.append(p);
    }
  };

  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element).closest<HTMLAnchorElement>('[data-pdf]');
    if (!trigger) return;
    event.preventDefault();
    open(trigger.dataset.pdf!, trigger.dataset.pdfTitle || 'Документ');
  });
}

function initVideoDialog() {
  const dialog = $<HTMLDialogElement>('[data-video-dialog]');
  const video = $<HTMLVideoElement>('[data-video-full]');
  if (!dialog || !video) return;
  dialog.addEventListener('close', () => video.pause());
  document.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('[data-video-open]')) return;
    const source = $<HTMLSourceElement>('source[data-src]', video);
    if (source && !source.src) {
      source.src = source.dataset.src!;
      video.load();
    }
    showDialog(dialog);
    video.play().catch(() => undefined);
  });
}

function initHeroVideo() {
  const video = $<HTMLVideoElement>('[data-hero-video]');
  if (!video || env.reduced || env.lite) return;
  const start = () => {
    $$<HTMLSourceElement>('source[data-src]', video).forEach((s) => (s.src = s.dataset.src!));
    video.load();
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    video.play().catch(() => undefined);
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? video.play().catch(() => undefined) : video.pause())).observe(video);
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

export function initMedia() {
  initLightbox();
  initPdf();
  initVideoDialog();
  initHeroVideo();
}
