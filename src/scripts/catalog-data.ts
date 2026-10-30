export interface CatalogItem {
  id: string;
  title: string;
  price: number | null;
  priceNote: string;
  minOrder: number;
}

let cache: CatalogItem[] | null = null;

export function catalogItems(): CatalogItem[] {
  if (cache) return cache;
  const node = document.getElementById('catalog-data');
  cache = node?.textContent ? (JSON.parse(node.textContent) as CatalogItem[]) : [];
  return cache;
}

export const findItem = (id: string) => catalogItems().find((p) => p.id === id);

const money = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });

export const formatMoney = (value: number) => `${money.format(Math.round(value)).replace(/\s/g, ' ')} грн`;

export function estimate(id: string, tonnes: number) {
  const item = findItem(id);
  if (!item) return { item, total: null, note: '' };
  if (!item.price) {
    return { item, total: null, note: 'Ціна за запитом — менеджер розрахує вартість під ваш обсяг.' };
  }
  const valid = Number.isFinite(tonnes) && tonnes > 0;
  const note = valid && item.minOrder && tonnes < item.minOrder ? `Ця позиція відвантажується на замовлення від ${money.format(item.minOrder)} т.` : '';
  return { item, total: valid ? item.price * tonnes : null, note };
}
