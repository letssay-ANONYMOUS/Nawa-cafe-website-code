import { useEffect } from 'react';

// Import all hero/key images so Vite resolves their hashed URLs
import cateringHero from '@/assets/catering-hero.jpg';
import cateringCorporate from '@/assets/catering-corporate.jpg';
import cateringCtaBg from '@/assets/catering-cta-bg.jpg';
import cateringWedding from '@/assets/catering-wedding.jpg';
import cateringBrunch from '@/assets/catering-brunch.jpg';
import cateringOnsite from '@/assets/catering-onsite.jpg';
import homeSpread from '@/assets/home-spread.jpg';
import homeInterior from '@/assets/home-interior-new.jpg';
import heroEspresso from '@/assets/hero-espresso.jpg';
import heroNawa from '@/assets/hero-nawa.png';
import homeBarista from '@/assets/home-barista.jpg';
import aboutCoffee from '@/assets/about-coffee-1.jpg';
import cateringMeal from '@/assets/catering-meal.jpg';
import cateringCoffeeBar from '@/assets/catering-coffee-bar.jpg';

const ALL_IMAGES = [
  cateringHero,
  cateringCorporate,
  cateringCtaBg,
  cateringWedding,
  cateringBrunch,
  cateringOnsite,
  homeSpread,
  homeInterior,
  heroEspresso,
  heroNawa,
  homeBarista,
  aboutCoffee,
  cateringMeal,
  cateringCoffeeBar,
];

/**
 * Preloads all key images into browser memory cache on first mount.
 * Uses <link rel="preload"> for high-priority images and Image() for the rest.
 * Once cached, revisiting pages shows images instantly without re-downloading.
 */
const ImagePreloader = () => {
  useEffect(() => {
    ALL_IMAGES.forEach((src) => {
      // Use link preload for browser-level caching
      const existing = document.querySelector(`link[href="${src}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      }

      // Also decode into memory cache via Image object
      const img = new Image();
      img.src = src;
    });
  }, []);

  return null;
};

export default ImagePreloader;
