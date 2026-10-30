import productsData from '../data/products.json';
import siteData from '../data/site.json';
import documentsData from '../data/documents.json';
import galleryData from '../data/gallery.json';

export type Product = (typeof productsData.products)[number];

export const site = siteData;
export const catalog = productsData;
export const products: Product[] = productsData.products;
export const documents = documentsData;
export const gallery = galleryData.items;

export const categoryLabel = (id: string) =>
  productsData.categories.find((c) => c.id === id)?.label ?? id;

export const productTitle = (p: Product) => `${p.name} ${p.fraction}`;

export const nav = [
  { href: '/about/', label: 'Про підприємство' },
  { href: '/production/', label: 'Продукція' },
  { href: '/sertifikati-i-pasporti/', label: 'Документи' },
  { href: '/contact/', label: 'Контакти' },
];
