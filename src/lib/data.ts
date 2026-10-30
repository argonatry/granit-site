import productsData from '../data/products.json';
import siteData from '../data/site.json';
import documentsData from '../data/documents.json';
import galleryData from '../data/gallery.json';
import { url } from './url';

export type Product = (typeof productsData.products)[number];

export const site = siteData;
export const catalog = { ...productsData, priceList: { ...productsData.priceList, file: url(productsData.priceList.file) } };
export const products: Product[] = productsData.products;
export const documents = { ...documentsData, files: documentsData.files.map((f) => ({ ...f, file: url(f.file) })) };
export const gallery = galleryData.items;

export const categoryLabel = (id: string) =>
  productsData.categories.find((c) => c.id === id)?.label ?? id;

export const productTitle = (p: Product) => `${p.name} ${p.fraction}`;

export const nav = [
  { href: url('/about/'), label: 'Про підприємство' },
  { href: url('/production/'), label: 'Продукція' },
  { href: url('/sertifikati-i-pasporti/'), label: 'Документи' },
  { href: url('/contact/'), label: 'Контакти' },
];
