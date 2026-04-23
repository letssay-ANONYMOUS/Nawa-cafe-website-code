import honeyPlaceholder from '@/assets/store/honey-placeholder.jpg';
import coffeeBeansPlaceholder from '@/assets/store/coffee-beans-placeholder.jpg';

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

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 1,
    name: 'Premium Extra Virgin Olive Oil',
    description: 'Cold-pressed from hand-picked olives in the Mediterranean. Rich, fruity flavor with peppery finish.',
    price: 312,
    image: '/olive-oils/premium-evoo.jpg',
    rating: 5,
    badge: 'Bestseller',
    volume: '500ml',
    origin: 'Italy',
    category: 'oil',
  },
  {
    id: 2,
    name: 'Organic Single Estate Olive Oil',
    description: 'Certified organic, single-origin olive oil with delicate notes of grass and artichoke.',
    price: 349,
    image: '/olive-oils/organic-estate.jpg',
    rating: 5,
    badge: 'Organic',
    volume: '750ml',
    origin: 'Spain',
    category: 'oil',
  },
  {
    id: 3,
    name: 'Infused Garlic & Herb Olive Oil',
    description: 'Premium olive oil infused with fresh garlic, rosemary, and Mediterranean herbs.',
    price: 275,
    image: '/olive-oils/garlic-herb.jpg',
    rating: 4,
    badge: 'Limited',
    volume: '250ml',
    origin: 'Greece',
    category: 'oil',
  },
  {
    id: 4,
    name: 'Early Harvest Olive Oil',
    description: 'Made from green, early-harvest olives for intense flavor and maximum health benefits.',
    price: 386,
    image: '/olive-oils/early-harvest.jpg',
    rating: 5,
    badge: 'Premium',
    volume: '500ml',
    origin: 'Italy',
    category: 'oil',
  },
  {
    id: 5,
    name: 'Lemon Infused Olive Oil',
    description: 'Bright and zesty olive oil infused with fresh Mediterranean lemons. Perfect for salads.',
    price: 257,
    image: '/olive-oils/lemon-infused.jpg',
    rating: 5,
    badge: 'New',
    volume: '250ml',
    origin: 'Greece',
    category: 'oil',
  },
  {
    id: 6,
    name: 'Gift Set Collection',
    description: 'Curated selection of three premium olive oils in an elegant gift box.',
    price: 661,
    image: '/olive-oils/gift-set.jpg',
    rating: 5,
    badge: 'Gift Set',
    volume: '3x250ml',
    origin: 'Mixed',
    category: 'oil',
  },
  {
    id: 101,
    name: 'Wildflower Honey Reserve',
    description: 'Placeholder product for the upcoming honey collection with a smooth floral profile.',
    price: 95,
    image: honeyPlaceholder,
    rating: 5,
    badge: 'Coming Soon',
    volume: '350g',
    origin: 'UAE',
    category: 'honey',
  },
  {
    id: 102,
    name: 'Mountain Blossom Honey',
    description: 'Placeholder product for a richer amber honey offering with layered sweetness.',
    price: 110,
    image: honeyPlaceholder,
    rating: 5,
    badge: 'Preview',
    volume: '500g',
    origin: 'Oman',
    category: 'honey',
  },
  {
    id: 103,
    name: 'Signature Honey Gift Jar',
    description: 'Placeholder product for a premium gifting honey format to be detailed later.',
    price: 135,
    image: honeyPlaceholder,
    rating: 5,
    badge: 'Gift',
    volume: '2x250g',
    origin: 'Mixed',
    category: 'honey',
  },
  {
    id: 201,
    name: 'House Espresso Beans',
    description: 'Placeholder product for our signature espresso roast with balanced chocolate notes.',
    price: 78,
    image: coffeeBeansPlaceholder,
    rating: 5,
    badge: 'Coming Soon',
    volume: '250g',
    origin: 'Brazil',
    category: 'coffee-beans',
  },
  {
    id: 202,
    name: 'Single Origin Filter Beans',
    description: 'Placeholder product for a bright, fruit-forward filter roast to be finalized later.',
    price: 92,
    image: coffeeBeansPlaceholder,
    rating: 5,
    badge: 'Preview',
    volume: '250g',
    origin: 'Ethiopia',
    category: 'coffee-beans',
  },
  {
    id: 203,
    name: 'Nawa Blend Coffee Beans',
    description: 'Placeholder product for our future house blend crafted for everyday brewing.',
    price: 88,
    image: coffeeBeansPlaceholder,
    rating: 5,
    badge: 'House Blend',
    volume: '500g',
    origin: 'Mixed',
    category: 'coffee-beans',
  },
];

export const getStoreProductById = (id: number) =>
  STORE_PRODUCTS.find((product) => product.id === id);