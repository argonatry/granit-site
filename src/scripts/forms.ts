import { $, $$ } from './env';
import { lockScroll, unlockScroll } from './scroll';
import { estimate, formatMoney } from './catalog-data';
import { url } from '../lib/url';

type FormKind = 'order' | 'feedback';

interface Fields {
  [key: string]: string;
}

const PHONE_FALLBACK = '+38 (063) 858-50-01';

const MESSAGES = {
  name: 'Вкажіть ім’я (щонайменше 2 літери)',
  phone: 'Введіть повний номер телефону',
  email: 'Перевірте email',
  tonnes: 'Вкажіть кількість тонн числом',
  sending: 'Відправка…',
  ok: 'Дякуємо! Вашу заявку успішно відправлено. Ми зв’яжемося з вами найближчим часом.',
  network: `Помилка з’єднання. Перевірте інтернет або зателефонуйте нам: ${PHONE_FALLBACK}`,
  server: `Не вдалося надіслати заявку. Спробуйте пізніше або зателефонуйте: ${PHONE_FALLBACK}`,
};

export function phoneDigits(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('380')) digits = digits.slice(2);
  else if (digits.startsWith('38') && digits.length > 10) digits = digits.slice(2);
  if (digits && digits[0] !== '0') digits = `0${digits}`;
  return digits.slice(0, 10);
}

export function formatPhone(digits: string) {
  if (!digits) return '';
  let out = `+38 (${digits.slice(0, 3)}`;
  if (digits.length >= 3) out += ')';
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}

function initPhoneMask(input: HTMLInputElement) {
  let previous = '';
  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+38 (0';
  });
  input.addEventListener('blur', () => {
    if (phoneDigits(input.value).length <= 1) input.value = '';
  });
  input.addEventListener('input', (event) => {
    let digits = phoneDigits(input.value);
    if ((event as InputEvent).inputType?.startsWith('delete') && digits === previous) digits = digits.slice(0, -1);
    previous = digits;
    input.value = formatPhone(digits);
  });
}

function setError(form: HTMLFormElement, name: string, message: string) {
  const field = form.elements.namedItem(name) as HTMLInputElement | null;
  const slot = $(`[data-error="${name}"]`, form);
  field?.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (field && slot) {
    slot.id = slot.id || `${form.dataset.form}-${name}-error`;
    if (message) field.setAttribute('aria-describedby', slot.id);
    else field.removeAttribute('aria-describedby');
  }
  if (slot) slot.textContent = message;
}

function validate(form: HTMLFormElement, data: Fields) {
  const errors: Fields = {};
  if (data.name.trim().length < 2) errors.name = MESSAGES.name;
  if (phoneDigits(data.phone).length !== 10) errors.phone = MESSAGES.phone;
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errors.email = MESSAGES.email;
  if (data.tonnes && !(Number(data.tonnes) > 0 && Number(data.tonnes) <= 100000)) errors.tonnes = MESSAGES.tonnes;
  ['name', 'phone', 'email', 'tonnes'].forEach((key) => setError(form, key, errors[key] ?? ''));
  const first = Object.keys(errors)[0];
  if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
  return !first;
}

function setBusy(form: HTMLFormElement, busy: boolean) {
  const button = $<HTMLButtonElement>('[data-submit]', form);
  if (!button) return;
  button.disabled = busy;
  button.style.opacity = busy ? '0.6' : '';
  const labels = $$('.btn__label > span', button);
  if (!button.dataset.label) button.dataset.label = labels[0]?.textContent ?? '';
  labels.forEach((span) => (span.textContent = busy ? MESSAGES.sending : (button.dataset.label ?? '')));
}

function setStatus(form: HTMLFormElement, state: 'ok' | 'error' | '', text: string) {
  const status = $('[data-form-status]', form);
  if (!status) return;
  status.dataset.state = state;
  status.textContent = text;
}

async function submit(form: HTMLFormElement, kind: FormKind, onSuccess: () => void) {
  const raw = Object.fromEntries(new FormData(form).entries()) as Fields;
  const data: Fields = {
    type: kind,
    name: raw.name ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    message: raw.message ?? '',
    product: raw.product ?? '',
    tonnes: raw.tonnes ?? '',
    website: raw.website ?? '',
    startedAt: raw.startedAt ?? '',
    token: raw['cf-turnstile-response'] ?? '',
  };
  setStatus(form, '', '');
  if (!validate(form, data)) return;

  setBusy(form, true);
  try {
    const response = await fetch(url('/api/order'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, phone: `+38${phoneDigits(data.phone)}` }),
    });
    const result = await response.json().catch(() => ({ ok: false }));
    if (response.ok && result.ok) {
      form.reset();
      ($('input[name="startedAt"]', form) as HTMLInputElement | null)?.setAttribute('value', String(Date.now()));
      setStatus(form, 'ok', MESSAGES.ok);
      onSuccess();
    } else if (result.fields) {
      Object.entries(result.fields as Fields).forEach(([key, message]) => setError(form, key, message));
      setStatus(form, 'error', 'Перевірте виділені поля.');
    } else {
      setStatus(form, 'error', MESSAGES.server);
    }
  } catch {
    setStatus(form, 'error', MESSAGES.network);
  } finally {
    setBusy(form, false);
    (window as unknown as { turnstile?: { reset: (el?: Element) => void } }).turnstile?.reset();
  }
}

let orderDialog: HTMLDialogElement | null = null;

export function openOrder(options: { product?: string; tonnes?: number } = {}) {
  orderDialog ??= $<HTMLDialogElement>('[data-order-dialog]');
  if (!orderDialog) return;
  const form = $<HTMLFormElement>('form', orderDialog);
  const body = $('[data-order-body]', orderDialog);
  const success = $('[data-order-success]', orderDialog);
  if (!form || !body || !success) return;
  body.hidden = false;
  success.hidden = true;
  setStatus(form, '', '');
  const select = form.elements.namedItem('product') as HTMLSelectElement;
  const tonnes = form.elements.namedItem('tonnes') as HTMLInputElement;
  if (options.product) select.value = options.product;
  if (options.tonnes) tonnes.value = String(options.tonnes);
  select.dispatchEvent(new Event('change'));
  showDialog(orderDialog);
  setTimeout(() => $(options.product ? '#order-name' : '#order-product', form)?.focus(), 80);
}

export function showDialog(dialog: HTMLDialogElement) {
  if (dialog.open) return;
  dialog.setAttribute('data-lenis-prevent', '');
  dialog.showModal();
  lockScroll();
  dialog.addEventListener('close', () => unlockScroll(), { once: true });
}

function wireDialogs() {
  $$<HTMLDialogElement>('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      const target = event.target as Element;
      if (target === dialog || target.closest('[data-dialog-close]')) dialog.close();
    });
  });
}

function initOrderEstimate(form: HTMLFormElement) {
  const select = form.elements.namedItem('product') as HTMLSelectElement;
  const tonnes = form.elements.namedItem('tonnes') as HTMLInputElement;
  const output = $('[data-order-total]', form);
  if (!select || !tonnes || !output) return;
  const render = () => {
    const { item, total, note } = estimate(select.value, Number(tonnes.value));
    output.textContent = total !== null ? formatMoney(total) : item?.price ? '—' : 'за запитом';
    setError(form, 'tonnes', note);
  };
  select.addEventListener('change', render);
  tonnes.addEventListener('input', render);
  render();
}

export function initForms() {
  wireDialogs();
  $$<HTMLInputElement>('[data-phone]').forEach(initPhoneMask);

  $$<HTMLFormElement>('form[data-form]').forEach((form) => {
    const kind = form.dataset.form as FormKind;
    ($('input[name="startedAt"]', form) as HTMLInputElement | null)?.setAttribute('value', String(Date.now()));
    if (kind === 'order') initOrderEstimate(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submit(form, kind, () => {
        if (kind !== 'order' || !orderDialog) return;
        $('[data-order-body]', orderDialog)!.hidden = true;
        $('[data-order-success]', orderDialog)!.hidden = false;
      });
    });
    form.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.getAttribute('aria-invalid') === 'true' && target.name !== 'tonnes') setError(form, target.name, '');
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element).closest<HTMLElement>('[data-order]');
    if (!trigger || trigger.closest('form')) return;
    event.preventDefault();
    openOrder({ product: trigger.dataset.order || undefined });
  });
}
