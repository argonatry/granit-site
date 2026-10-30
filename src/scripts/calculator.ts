import { gsap } from 'gsap';
import { $, $$, env } from './env';
import { estimate, formatMoney } from './catalog-data';
import { openOrder } from './forms';

export function initCalculator() {
  $$('[data-calc]').forEach((form) => {
    const select = $<HTMLSelectElement>('[data-calc-product]', form);
    const input = $<HTMLInputElement>('[data-calc-tonnes]', form);
    const range = $<HTMLInputElement>('[data-calc-range]', form);
    const unit = $('[data-calc-unit]', form);
    const total = $('[data-calc-total]', form);
    const note = $('[data-calc-note]', form);
    const order = $('[data-calc-order]', form);
    if (!select || !input || !range || !unit || !total || !note) return;

    const shown = { value: 0 };
    const max = Number(range.max);

    const render = () => {
      const tonnes = Number(input.value);
      const { item, total: sum, note: message } = estimate(select.value, tonnes);
      unit.textContent = item?.price ? formatMoney(item.price) : item?.priceNote || '—';
      note.textContent = message;
      range.style.setProperty('--p', `${(Math.min(Math.max(tonnes, 1), max) / max) * 100}%`);
      if (sum === null) {
        gsap.killTweensOf(shown);
        total.textContent = item?.price ? '—' : 'за запитом';
        shown.value = 0;
        return;
      }
      if (env.reduced) {
        total.textContent = formatMoney(sum);
        return;
      }
      gsap.to(shown, {
        value: sum,
        duration: 0.8,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: () => {
          total.textContent = formatMoney(shown.value);
        },
      });
    };

    select.addEventListener('change', render);
    input.addEventListener('input', () => {
      range.value = String(Math.min(Number(input.value) || 1, max));
      render();
    });
    range.addEventListener('input', () => {
      input.value = range.value;
      render();
    });
    $$<HTMLButtonElement>('[data-calc-preset]', form).forEach((btn) =>
      btn.addEventListener('click', () => {
        input.value = btn.dataset.calcPreset ?? '1';
        range.value = String(Math.min(Number(input.value), max));
        render();
      }),
    );
    order?.addEventListener('click', () => openOrder({ product: select.value, tonnes: Number(input.value) || undefined }));
    render();
  });
}
