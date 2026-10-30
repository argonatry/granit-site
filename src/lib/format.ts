const money = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });

export const formatPrice = (value: number) => money.format(value).replace(/\s/g, '\u00a0');

export const telHref = (tel: string) => `tel:${tel}`;
