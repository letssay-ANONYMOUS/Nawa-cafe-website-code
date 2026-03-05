
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { buttonHover } from '@/lib/motionVariants';
import heroImage from '@/assets/hero-espresso.jpg';

const heroStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const textReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut", // premium subtle ease-out
    }
  },
};

const Hero = () => {
  return (
    <section id="home" className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <img
          src={heroImage}
          alt="Espresso pouring from portafilter"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 text-center px-5 sm:px-6 lg:px-8 max-w-5xl mx-auto mt-10 sm:mt-16">
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={textReveal}
            className="font-cinzel text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-cream-400 mb-3 sm:mb-6 leading-[1.1] uppercase tracking-wide"
          >
            Craft Coffee
            <motion.span variants={textReveal} className="block mt-2 text-white/90">
              Artisan Experience
            </motion.span>
          </motion.h1>
          <motion.p
            variants={textReveal}
            className="text-sm sm:text-xl md:text-2xl text-cream-100 mb-6 sm:mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Where passion meets perfection.
          </motion.p>
          <motion.div
            variants={textReveal}
            className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center"
          >
            <Link to="/menu" className="w-full sm:w-auto">
              <motion.div {...buttonHover}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-transparent border-2 border-cream-400 text-cream-400 hover:bg-cream-400 hover:text-coffee-800 px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-lg font-semibold rounded-full transition-all duration-500 uppercase tracking-widest min-h-[48px] gold-pulse hover:shadow-[0_0_20px_rgba(201,169,98,0.6)]"
                >
                  Explore Our Menu
                </Button>
              </motion.div>
            </Link>
            <Link to="/locations" className="w-full sm:w-auto">
              <motion.div {...buttonHover}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-transparent border-2 border-white/50 text-white/90 hover:border-cream-400 hover:text-cream-400 hover:bg-white/5 px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-lg font-semibold rounded-full transition-all duration-500 uppercase tracking-widest min-h-[48px]"
                >
                  Find Locations
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
