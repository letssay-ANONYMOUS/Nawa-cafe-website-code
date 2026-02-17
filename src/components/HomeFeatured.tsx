import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
const homeSpread = 'https://lomqlmqsoyayuegheetv.supabase.co/storage/v1/object/public/menu-images/home/breakfast-spread.jpg';
import { cardHover } from '@/lib/motionVariants';

const featured = [
  {
    title: 'Specialty Coffee',
    description: 'Single-origin beans roasted to perfection, crafted by our expert baristas.',
    image: '/menu-images/coffee-1.jpg',
  },
  {
    title: 'Artisan Breakfast',
    description: 'Start your morning with our signature avocado toast, eggs, and fresh pastries.',
    image: '/menu-images/card-5-avocado-toast.jpg',
  },
  {
    title: 'Sweet Indulgence',
    description: 'Handcrafted desserts and fluffy pancakes made with the finest ingredients.',
    image: '/menu-images/dessert-1.jpg',
  },
];

const HomeFeatured = () => {
  return (
    <section className="relative py-24 bg-background overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-coffee-400 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="font-cinzel text-sm tracking-[0.3em] uppercase text-coffee-400">
            Our Selections
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-foreground mt-3">
            Crafted With Passion
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            Every dish and drink at NAWA CAFÉ is a celebration of quality, from ethically sourced beans to locally inspired cuisine.
          </p>
        </div>

        {/* Featured cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-8 mb-20">
          {featured.map((item) => (
            <motion.div
              key={item.title}
              variants={cardHover}
              initial="rest"
              whileHover="hover"
              className="rounded-2xl overflow-hidden"
            >
            <Link
              to="/menu"
              className="group relative block aspect-[3/4] overflow-hidden"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="font-cinzel text-2xl font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-cream-200 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-3 text-cream-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  Explore <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
            </motion.div>
          ))}
        </div>

        {/* Full-width food spread banner */}
        <div className="relative rounded-3xl overflow-hidden h-[400px] shadow-xl">
          <img
            src={homeSpread}
            alt="Artisan coffee and pastry spread"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-coffee-900/70 via-coffee-900/40 to-transparent flex items-center">
            <div className="px-8 md:px-16 max-w-xl">
              <h3 className="font-cinzel text-3xl md:text-4xl font-bold text-white mb-4">
                Every Morning Deserves This
              </h3>
              <p className="text-cream-200 text-lg mb-6">
                Fresh pastries, artisan coffee, and dishes made from scratch — your perfect morning ritual.
              </p>
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 bg-cream-400 hover:bg-cream-500 text-coffee-800 px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              >
                View Full Menu <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFeatured;
