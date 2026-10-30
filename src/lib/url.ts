const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  if (base && (path === base || path.startsWith(`${base}/`))) return path;
  return `${base}${path}`;
}
