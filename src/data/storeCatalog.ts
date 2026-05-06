export type StoreCategory = 'oil' | 'honey' | 'coffee-beans';

export interface StoreProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  rating: number;
  badge: string;
  volume: string;
  origin: string;
  category: StoreCategory;
  comingSoon?: boolean;
}

export interface StoreCategoryConfig {
  id: StoreCategory;
  label: string;
  heroTitle: string;
  heroDescription: string;
}

export const STORE_CATEGORIES: StoreCategoryConfig[] = [
  {
    id: 'oil',
    label: 'Oil',
    heroTitle: 'Artisan Olive Oil Collection',
    heroDescription:
      'Discover our carefully curated selection of premium olive oils, sourced directly from the finest estates in the Mediterranean. Each bottle tells a story of tradition, quality, and exceptional taste.',
  },
  {
    id: 'honey',
    label: 'Honey',
    heroTitle: 'Raw Honey Selection',
    heroDescription:
      'Explore our upcoming honey collection with rich floral notes, small-batch sourcing, and premium gifting potential. Product details will be refined next.',
  },
  {
    id: 'coffee-beans',
    label: 'Coffee Beans',
    heroTitle: 'Specialty Coffee Beans',
    heroDescription:
      'Browse our upcoming coffee bean range featuring curated roast profiles and origin-led selections. We will replace these placeholders with the final details later.',
  },
];

// Fallback data (used while DB is loading). DB is source of truth.
export const STORE_PRODUCTS: StoreProduct[] = [];

export const getStoreProductById = (id: number) =>
  STORE_PRODUCTS.find((product) => product.id === id);
