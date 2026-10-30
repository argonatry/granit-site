import { $$ } from './env';

const CHEVRON = '<svg class="cselect__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const CHECK = '<svg class="cselect__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
let uid = 0;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function optionContent(option: HTMLOptionElement) {
  const name = el('span', 'cselect__name', option.dataset.name ?? option.textContent ?? '');
  if (option.dataset.fraction) name.append(' ', el('b', '', option.dataset.fraction));
  const price = el('span', `cselect__price${option.dataset.ask !== undefined ? ' cselect__price--ask' : ''}`, option.dataset.price ?? '');
  return [name, price];
}

function enhance(select: HTMLSelectElement) {
  uid += 1;
  const listId = `cselect-${uid}`;
  const wrap = el('div', 'cselect');
  select.before(wrap);
  wrap.append(select);

  const nativeId = select.id;
  select.id = `${nativeId}-native`;
  select.classList.add('cselect__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const trigger = el('button', 'input cselect__trigger');
  trigger.type = 'button';
  trigger.id = nativeId;
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', listId);
  const value = el('span', 'cselect__value');
  trigger.append(value);
  trigger.insertAdjacentHTML('beforeend', CHEVRON);

  const list = el('div', 'cselect__list');
  list.id = listId;
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  list.setAttribute('data-lenis-prevent', '');
  const labelEl = document.querySelector(`label[for="${nativeId}"]`);
  if (labelEl) {
    labelEl.id ||= `${nativeId}-label`;
    list.setAttribute('aria-labelledby', labelEl.id);
  }
  if (supportsPopover) list.setAttribute('popover', 'manual');
  else list.hidden = true;

  const options: { node: HTMLElement; option: HTMLOptionElement }[] = [];
  const addOption = (option: HTMLOptionElement, parent: HTMLElement) => {
    const node = el('div', 'cselect__option');
    node.id = `${listId}-${options.length}`;
    node.setAttribute('role', 'option');
    node.dataset.index = String(options.length);
    node.append(...optionContent(option));
    node.insertAdjacentHTML('beforeend', CHECK);
    parent.append(node);
    options.push({ node, option });
  };

  Array.from(select.children).forEach((child) => {
    if (child instanceof HTMLOptGroupElement) {
      const group = el('div', 'cselect__group');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', child.label);
      group.append(el('span', 'cselect__group-label', child.label));
      child.querySelectorAll('option').forEach((o) => addOption(o, group));
      list.append(group);
    } else if (child instanceof HTMLOptionElement) {
      addOption(child, list);
    }
  });

  wrap.append(trigger, list);

  let isOpen = false;
  let active = -1;
  let typed = '';
  let typedTimer = 0;

  const sync = () => {
    const index = select.selectedIndex;
    options.forEach(({ node }, i) => node.setAttribute('aria-selected', String(i === index)));
    value.replaceChildren(...(index >= 0 ? optionContent(select.options[index]) : []));
  };

  const setActive = (index: number, scroll = true) => {
    active = Math.max(0, Math.min(options.length - 1, index));
    options.forEach(({ node }, i) => node.classList.toggle('is-active', i === active));
    list.setAttribute('aria-activedescendant', options[active].node.id);
    if (scroll) options[active].node.scrollIntoView({ block: 'nearest' });
  };

  const position = () => {
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const below = window.innerHeight - rect.bottom - gap * 2;
    const above = rect.top - gap * 2;
    const natural = Math.min(list.scrollHeight, 360);
    const up = below < Math.min(natural, 240) && above > below;
    const max = Math.max(160, Math.min(360, up ? above : below));
    list.style.left = `${rect.left}px`;
    list.style.width = `${rect.width}px`;
    list.style.maxHeight = `${max}px`;
    list.style.top = up ? `${Math.max(gap, rect.top - gap - Math.min(natural, max))}px` : `${rect.bottom + gap}px`;
    list.classList.toggle('is-up', up);
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    if (supportsPopover) list.showPopover();
    else list.hidden = false;
    position();
    list.classList.add('is-open');
    wrap.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    setActive(select.selectedIndex >= 0 ? select.selectedIndex : 0);
    list.focus({ preventScroll: true });
  };

  const close = (focusTrigger = true) => {
    if (!isOpen) return;
    isOpen = false;
    list.classList.remove('is-open');
    wrap.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (supportsPopover) list.hidePopover();
    else list.hidden = true;
    if (focusTrigger) trigger.focus({ preventScroll: true });
  };

  const choose = (index: number) => {
    const { option } = options[index];
    if (select.value !== option.value) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync();
    close();
  };

  trigger.addEventListener('click', () => (isOpen ? close() : open()));
  trigger.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open();
    }
  });

  list.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive(active + 1),
      ArrowUp: () => setActive(active - 1),
      Home: () => setActive(0),
      End: () => setActive(options.length - 1),
      PageDown: () => setActive(active + 5),
      PageUp: () => setActive(active - 5),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => close(),
    };
    if (keys[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      keys[event.key]();
      return;
    }
    if (event.key === 'Tab') {
      close(false);
      return;
    }
    if (event.key.length === 1) {
      typed += event.key.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = window.setTimeout(() => (typed = ''), 600);
      const found = options.findIndex(({ option }) => (option.textContent ?? '').toLowerCase().startsWith(typed));
      if (found >= 0) setActive(found);
    }
  });

  list.addEventListener('pointermove', (event) => {
    const node = (event.target as Element).closest<HTMLElement>('.cselect__option');
    if (node) setActive(Number(node.dataset.index), false);
  });
  list.addEventListener('click', (event) => {
    const node = (event.target as Element).closest<HTMLElement>('.cselect__option');
    if (node) choose(Number(node.dataset.index));
  });

  document.addEventListener('pointerdown', (event) => {
    if (isOpen && !wrap.contains(event.target as Node)) close(false);
  });
  document.addEventListener(
    'scroll',
    (event) => {
      if (isOpen && event.target !== list) close(false);
    },
    { capture: true, passive: true },
  );
  window.addEventListener('resize', () => close(false));
  select.closest('dialog')?.addEventListener('close', () => close(false));
  select.addEventListener('change', sync);

  sync();
}

export function initSelects() {
  $$<HTMLSelectElement>('select[data-enhance]').forEach(enhance);
}
