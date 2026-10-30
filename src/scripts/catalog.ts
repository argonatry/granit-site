import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, env } from './env';

gsap.registerPlugin(Flip, ScrollTrigger);

export function initCatalog() {
  $$('[data-catalog]').forEach((catalog) => {
    const grid = $('[data-catalog-grid]', catalog);
    const table = $('[data-catalog-table]', catalog);
    const chips = $$<HTMLButtonElement>('[data-filter]', catalog);
    const views = $$<HTMLButtonElement>('[data-view]', catalog);
    if (!grid) return;
    const cards = $$('[data-product]', grid);
    const rows = table ? $$('[data-product]', table) : [];
    let touched = false;

    const apply = (filter: string) => {
      const match = (el: HTMLElement) => filter === 'all' || el.dataset.category === filter;
      rows.forEach((row) => (row.hidden = !match(row)));

      if (!touched) {
        touched = true;
        ScrollTrigger.getAll()
          .filter((st) => cards.includes(st.trigger as HTMLElement))
          .forEach((st) => st.kill());
        gsap.set(cards, { opacity: 1, y: 0 });
      }

      if (env.reduced || grid.hidden) {
        cards.forEach((card) => (card.hidden = !match(card)));
        return;
      }

      const state = Flip.getState(cards);
      const from = grid.offsetHeight;
      cards.forEach((card) => (card.hidden = !match(card)));
      const to = grid.offsetHeight;
      gsap.fromTo(
        grid,
        { height: from },
        { height: to, duration: 0.7, ease: 'expo.out', overwrite: true, clearProps: 'height', onComplete: () => ScrollTrigger.refresh() },
      );
      Flip.from(state, {
        duration: 0.7,
        ease: 'expo.out',
        absolute: true,
        scale: true,
        nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.35 }),
      });
    };

    chips.forEach((chip) =>
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        apply(chip.dataset.filter ?? 'all');
      }),
    );

    views.forEach((btn) =>
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        views.forEach((v) => v.setAttribute('aria-pressed', String(v === btn)));
        if (!table) return;
        const showTable = view === 'table';
        grid.hidden = showTable;
        table.hidden = !showTable;
        if (!env.reduced) gsap.fromTo(showTable ? table : grid, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', clearProps: 'all' });
        ScrollTrigger.refresh();
      }),
    );
  });
}
