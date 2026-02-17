
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Coffee, UserCircle, Home } from 'lucide-react';
import { fadeUp, staggerContainer, buttonHover } from '@/lib/motionVariants';
import heroImage from '@/assets/hero-nawa.png';

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Premium coffee shop interior"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="animate-fade-in">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-cream-400/20 text-cream-200 rounded-full text-sm font-medium backdrop-blur-sm">
              Premium Coffee Experience Since 2014
            </span>
          </div>
          <h1 className="font-playfair text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            Craft Coffee
            <span className="block text-gradient bg-gradient-to-r from-cream-300 to-cream-500 bg-clip-text text-transparent">
              Artisan Experience
            </span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-cream-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Where passion meets perfection. Every cup is meticulously crafted from ethically sourced beans, 
            creating moments of pure bliss in our warm, welcoming atmosphere.
          </p>
          <div className="flex flex-row gap-4 sm:gap-6 justify-center items-center">
            <Link to="/menu">
              <motion.div {...buttonHover}>
                <Button
                  size="lg"
                  className="bg-cream-400 hover:bg-cream-500 text-coffee-800 px-10 py-4 text-lg font-semibold rounded-full transition-colors duration-300 shadow-2xl hover:shadow-cream-400/25"
                >
                  Explore Our Menu
                </Button>
              </motion.div>
            </Link>
            <Link to="/locations">
              <motion.div {...buttonHover}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white bg-white/10 hover:bg-white hover:text-coffee-800 px-10 py-4 text-lg font-semibold rounded-full transition-colors duration-300 backdrop-blur-sm"
                >
                  Find Locations
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-16 h-16 bg-cream-400/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Coffee className="w-8 h-8 text-cream-200" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Premium Beans</h3>
            <p className="text-cream-200">Ethically sourced from the world's finest coffee regions</p>
          </div>
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="w-16 h-16 bg-cream-400/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <UserCircle className="w-8 h-8 text-cream-200" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Expert Baristas</h3>
            <p className="text-cream-200">Trained artisans dedicated to the perfect brew</p>
          </div>
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="w-16 h-16 bg-cream-400/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Home className="w-8 h-8 text-cream-200" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Cozy Atmosphere</h3>
            <p className="text-cream-200">Your home away from home for work and relaxation</p>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
