import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
const homeSpread = 'https://lomqlmqsoyayuegheetv.supabase.co/storage/v1/object/public/menu-images/home/breakfast-spread.jpg';
import { cardHover } from '@/lib/motionVariants';

const featured = [
  {
    title: 'Nawa Signature Latte',
    description: 'Our signature latte with golden caramel art, served in handcrafted ceramic.',
    image: '/menu-images/nawa-signature-latte.png',
    targetCard: 38,
  },
  {
    title: 'Artisan Breakfast',
    description: 'Start your morning with our signature avocado toast, eggs, and fresh pastries.',
    image: '/menu-images/card-5-avocado-toast.jpg',
    targetCard: 11,
  },
  {
    title: 'Sweet Indulgence',
    description: 'Handcrafted desserts and fluffy pancakes made with the finest ingredients.',
    image: '/menu-images/molten-nawa-cookie.png',
    targetCard: 112,
  },
];

const HomeFeatured = () => {
  return (
    <section className="relative py-14 sm:py-24 bg-background overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-coffee-400 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-8 sm:mb-16"
        >
          <span className="font-cinzel text-xs sm:text-sm tracking-[0.3em] uppercase text-coffee-400">
            Our Selections
          </span>
          <h2 className="font-cinzel text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mt-2 sm:mt-3">
            Crafted With Passion
          </h2>
          <p className="mt-3 sm:mt-4 text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-2">
            Every dish and drink at NAWA CAFÉ is a celebration of quality, from ethically sourced beans to locally inspired cuisine.
          </p>
        </motion.div>

        {/* Featured cards - mobile horizontal scroll, desktop grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
          className="sm:grid sm:grid-cols-3 sm:gap-8 mb-20"
        >
          <div className="flex sm:contents gap-3 overflow-x-auto snap-x snap-mandatory pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {featured.map((item) => (
              <motion.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="rounded-2xl flex-shrink-0 w-[70vw] sm:w-auto snap-center transition-all duration-300 hover:shadow-[0_15px_30px_rgba(201,169,98,0.3)]"
              >
                <Link
                  to={`/menu?card=${item.targetCard}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-2xl"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="font-cinzel text-lg sm:text-2xl font-semibold text-white mb-1 sm:mb-2">
                      {item.title}
                    </h3>
                    <p className="text-cream-200 text-xs sm:text-sm leading-relaxed sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 sm:mt-3 text-cream-400 text-xs sm:text-sm font-medium sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500">
                      Explore <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Full-width food spread banner */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden h-[280px] sm:h-[400px] shadow-xl">
          <img
            src={homeSpread}
            alt="Artisan coffee and pastry spread"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent sm:from-black/60 sm:via-black/30 flex items-center">
            <div className="px-5 sm:px-8 md:px-16 max-w-xl">
              <h3 className="font-cinzel text-xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
                Every Morning Deserves This
              </h3>
              <p className="text-cream-200 text-xs sm:text-lg mb-4 sm:mb-6 leading-relaxed">
                Fresh pastries, artisan coffee, and dishes made from scratch — your perfect morning ritual.
              </p>
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 bg-cream-400 hover:bg-cream-500 text-coffee-800 px-5 py-2.5 sm:px-8 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 hover:scale-105 min-h-[44px]"
              >
                View Full Menu <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFeatured;
