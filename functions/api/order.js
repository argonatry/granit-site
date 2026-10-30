import catalog from '../../src/data/products.json';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

const escape = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const clean = (value, max) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);

const money = (value) => `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(value)} грн`;

function validate(body) {
  const data = {
    type: body.type === 'feedback' ? 'feedback' : 'order',
    name: clean(body.name, 80),
    phone: clean(body.phone, 20),
    email: clean(body.email, 120),
    message: clean(body.message, body.type === 'feedback' ? 1000 : 400),
    product: clean(body.product, 60),
    tonnes: Number(body.tonnes) || 0,
  };
  const fields = {};
  if (data.name.length < 2) fields.name = 'Вкажіть ім’я';
  if (!/^\+380\d{9}$/.test(data.phone)) fields.phone = 'Введіть повний номер телефону';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) fields.email = 'Перевірте email';
  if (data.tonnes < 0 || data.tonnes > 100000) fields.tonnes = 'Некоректна кількість';
  return { data, fields };
}

async function verifyTurnstile(secret, token, ip) {
  if (!secret) return true;
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const result = await res.json().catch(() => ({}));
  return result.success === true;
}

function compose(data, meta) {
  const product = catalog.products.find((p) => p.id === data.product);
  const title = product ? `${product.name} ${product.fraction}` : '';
  const total = product?.price && data.tonnes ? product.price * data.tonnes : 0;
  const subject =
    data.type === 'order'
      ? `Заявка: ${title || 'продукція'}${data.tonnes ? `, ${data.tonnes} т` : ''} — ${data.name}`
      : `Зворотний зв'язок з сайту — ${data.name}`;

  const rows = [
    ['Тип', data.type === 'order' ? 'Замовлення продукції' : "Зворотний зв'язок"],
    ['Ім’я', data.name],
    ['Телефон', data.phone],
    ['Email', data.email],
    ['Продукція', title],
    ['Ціна за тонну', product ? (product.price ? `${money(product.price)} з ПДВ` : product.priceNote || 'за запитом') : ''],
    ['Обсяг', data.tonnes ? `${data.tonnes} т` : ''],
    ['Орієнтовна сума', total ? `${money(total)} з ПДВ` : ''],
    ['Повідомлення', data.message],
    ['Сторінка', meta.page],
    ['Час', meta.time],
  ].filter(([, value]) => value);

  const html = `<!doctype html><html lang="uk"><body style="margin:0;padding:24px;background:#f3f1ed;font-family:Arial,sans-serif;color:#121210">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border-collapse:separate;overflow:hidden">
<tr><td style="padding:24px 28px;background:#0d0d0c;color:#ece8e1;font-size:18px;font-weight:bold">ТОВ «Любимівський кар’єр»<div style="font-size:13px;font-weight:normal;color:#fb8007;margin-top:6px">${escape(subject)}</div></td></tr>
<tr><td style="padding:12px 28px 24px"><table role="presentation" width="100%" style="border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #eee;color:#6b665d;font-size:13px;width:150px;vertical-align:top">${escape(label)}</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-size:15px;white-space:pre-wrap">${escape(value)}</td></tr>`,
  )
  .join('')}
</table>
<p style="margin:20px 0 0"><a href="tel:${escape(data.phone)}" style="display:inline-block;padding:12px 20px;background:#fb8007;color:#120a02;border-radius:999px;text-decoration:none;font-weight:bold">Подзвонити ${escape(data.phone)}</a></p>
</td></tr></table></body></html>`;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const telegram = [`<b>${escape(subject)}</b>`, '', ...rows.map(([label, value]) => `<b>${escape(label)}:</b> ${escape(value)}`)].join('\n');
  return { subject, html, text, telegram };
}

async function sendEmail(env, data, message) {
  const to = String(env.ORDER_EMAIL_TO)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.ORDER_EMAIL_FROM || 'Заявки з сайту <onboarding@resend.dev>',
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(data.email ? { reply_to: data.email } : {}),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

async function sendTelegram(env, message) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message.telegram, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
}

export async function onRequestPost({ request, env }) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 20000) return respond({ ok: false, error: 'too_large' }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return respond({ ok: false, error: 'bad_request' }, 400);
  }

  const startedAt = Number(body.startedAt) || 0;
  if (body.website || (startedAt && Date.now() - startedAt < 2500)) return respond({ ok: true });

  const { data, fields } = validate(body);
  if (Object.keys(fields).length) return respond({ ok: false, error: 'validation', fields }, 422);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, body.token, ip))) return respond({ ok: false, error: 'captcha' }, 403);

  const channels = [];
  const message = compose(data, {
    page: request.headers.get('Referer') || '',
    time: new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' }),
  });
  if (env.RESEND_API_KEY && env.ORDER_EMAIL_TO) channels.push(sendEmail(env, data, message));
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) channels.push(sendTelegram(env, message));
  if (!channels.length) return respond({ ok: false, error: 'not_configured' }, 503);

  const results = await Promise.allSettled(channels);
  results.filter((r) => r.status === 'rejected').forEach((r) => console.error(r.reason));
  if (results.some((r) => r.status === 'fulfilled')) return respond({ ok: true });
  return respond({ ok: false, error: 'delivery_failed' }, 502);
}

export function onRequest() {
  return respond({ ok: false, error: 'method_not_allowed' }, 405);
}
