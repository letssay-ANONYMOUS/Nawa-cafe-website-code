
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { buttonHover } from '@/lib/motionVariants';
import heroImage from '@/assets/hero-espresso.jpg';

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Espresso pouring from portafilter"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 sm:px-6 lg:px-8 max-w-5xl mx-auto mt-16">
        <div className="animate-fade-in">
          <h1 className="font-cinzel text-[2.5rem] sm:text-5xl md:text-7xl lg:text-8xl font-bold text-cream-400 mb-4 sm:mb-6 leading-[1.1] uppercase tracking-wide">
            Craft Coffee
            <span className="block">
              Artisan Experience
            </span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-cream-100 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed">
            Where passion meets perfection.
          </p>
          <div className="flex flex-row gap-3 sm:gap-6 justify-center items-center">
            <Link to="/menu">
              <motion.div {...buttonHover}>
                <Button
                  size="lg"
                  className="bg-transparent border-2 border-cream-400 text-cream-400 hover:bg-cream-400 hover:text-coffee-800 px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-lg font-semibold rounded-full transition-colors duration-300 uppercase tracking-widest"
                >
                  Explore Our Menu
                </Button>
              </motion.div>
            </Link>
            <Link to="/locations">
              <motion.div {...buttonHover}>
                <Button
                  size="lg"
                  className="bg-transparent border-2 border-cream-400 text-cream-400 hover:bg-cream-400 hover:text-coffee-800 px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-lg font-semibold rounded-full transition-colors duration-300 uppercase tracking-widest"
                >
                  Find Locations
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
