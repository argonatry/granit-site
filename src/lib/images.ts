import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

const files = import.meta.glob<{ default: ImageMetadata }>(
  ['/assets/images/**/*.{jpg,jpeg,png}', '!/assets/images/**/_old/**'],
  { eager: true },
);

export function img(path: string): ImageMetadata {
  const file = files[path];
  if (!file) throw new Error(`Зображення не знайдено: ${path}`);
  return file.default;
}

export async function large(path: string, width = 1800) {
  const source = img(path);
  const target = Math.min(width, source.width);
  const result = await getImage({ src: source, width: target, format: 'webp', quality: 82 });
  return {
    src: result.src,
    width: target,
    height: Math.round((source.height / source.width) * target),
    original: source.src,
  };
}
