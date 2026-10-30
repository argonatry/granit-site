import { site, products, productTitle } from './data';

const orgId = `${site.url}/#organization`;

export function organizationSchema(logo: string, image: string) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': orgId,
    name: site.name,
    legalName: site.legalName,
    url: `${site.url}/`,
    logo: `${site.url}${logo}`,
    image: `${site.url}${image}`,
    email: site.email,
    telephone: site.phones.map((p) => p.tel),
    taxID: site.edrpou,
    foundingDate: String(site.foundedYear),
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.postal.street,
      addressLocality: site.postal.locality,
      addressRegion: site.postal.region,
      postalCode: site.postal.code,
      addressCountry: site.postal.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    hasMap: site.geo.mapsUrl,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: site.hours.opens,
      closes: site.hours.closes,
    },
    contactPoint: [
      ...site.phones.map((p) => ({
        '@type': 'ContactPoint',
        telephone: p.tel,
        contactType: 'sales',
        areaServed: 'UA',
        availableLanguage: ['uk'],
      })),
      {
        '@type': 'ContactPoint',
        telephone: site.representative.phone.tel,
        contactType: 'billing support',
        areaServed: 'UA',
      },
    ],
  };
}

export function productsSchema(images: Record<string, string>, pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Продукція ТОВ «Любимівський кар’єр»',
    url: pageUrl,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: productTitle(p),
        description: p.use,
        image: `${site.url}${images[p.id]}`,
        brand: { '@type': 'Brand', name: site.shortName },
        manufacturer: { '@id': orgId },
        ...(p.price
          ? {
              offers: {
                '@type': 'Offer',
                price: p.price,
                priceCurrency: 'UAH',
                availability: 'https://schema.org/InStock',
                url: pageUrl,
                seller: { '@id': orgId },
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: p.price,
                  priceCurrency: 'UAH',
                  valueAddedTaxIncluded: true,
                  unitCode: 'TNE',
                  ...(p.minOrder ? { eligibleQuantity: { '@type': 'QuantitativeValue', minValue: p.minOrder, unitCode: 'TNE' } } : {}),
                },
              },
            }
          : {}),
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}
