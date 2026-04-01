import { useState } from 'react';
import { Coffee, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  const isHome = location.pathname === '/';

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/menu', label: 'Menu' },
    { path: '/about', label: 'About' },
    { path: '/catering', label: 'Catering' },
    { path: '/locations', label: 'Locations' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 transform-gpu bg-white/95 backdrop-blur-sm border-b border-coffee-200 shadow-sm`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img
              src="/nawa-logo.png"
              alt="Nawa Cafe Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`font-medium transition-colors duration-200 ${isHome
                  ? isActive(item.path)
                    ? 'text-cream-400 border-b-2 border-cream-400 pb-1'
                    : 'text-cream-200 hover:text-cream-400'
                  : isActive(item.path)
                    ? 'text-coffee-900 border-b-2 border-coffee-600 pb-1'
                    : 'text-coffee-700 hover:text-coffee-900'
                  }`}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/cart">
              <Button variant="outline" size="icon" className={`rounded-full relative ${isHome ? 'border-cream-400 text-cream-400 hover:bg-cream-400/20' : ''
                }`}>
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-coffee-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button className={`px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 ${isHome
              ? 'bg-cream-400 hover:bg-cream-500 text-coffee-800'
              : 'bg-coffee-600 hover:bg-coffee-700 text-white'
              }`}>
              Order Now
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex flex-col space-y-1 w-6 h-6"
          >
            <span className={`w-full h-0.5 transition-all duration-300 ${isHome ? 'bg-cream-400' : 'bg-coffee-700'} ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`w-full h-0.5 transition-all duration-300 ${isHome ? 'bg-cream-400' : 'bg-coffee-700'} ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-full h-0.5 transition-all duration-300 ${isHome ? 'bg-cream-400' : 'bg-coffee-700'} ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden fixed top-16 left-0 right-0 ${isHome ? 'bg-black/90 backdrop-blur-md' : 'bg-white/95 backdrop-blur-sm border-b border-coffee-200'
            } shadow-lg z-50 overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-b-0 shadow-none'
            }`}
        >
          <nav className="flex flex-col space-y-4 p-4">
            {navItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`font-medium py-2 text-left transition-all duration-300 ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                  } ${isHome
                    ? isActive(item.path) ? 'text-cream-400 font-semibold' : 'text-cream-200 hover:text-cream-400'
                    : isActive(item.path) ? 'text-coffee-900 font-semibold' : 'text-coffee-700 hover:text-coffee-900'
                  }`}
                style={{ transitionDelay: isMenuOpen ? `${index * 40}ms` : '0ms' }}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/cart" onClick={() => setIsMenuOpen(false)}
              className={`transition-all duration-300 ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
              style={{ transitionDelay: isMenuOpen ? `${navItems.length * 40}ms` : '0ms' }}
            >
              <Button variant="outline" size="sm" className={`rounded-full w-fit gap-2 relative ${isHome ? 'border-cream-400 text-cream-400' : ''
                }`}>
                <ShoppingCart className="h-4 w-4" />
                Cart
                {cartCount > 0 && (
                  <span className="bg-coffee-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-1">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <div
              className={`transition-all duration-300 ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
              style={{ transitionDelay: isMenuOpen ? `${(navItems.length + 1) * 40}ms` : '0ms' }}
            >
              <Button className={`px-6 py-2 rounded-full w-fit ${isHome ? 'bg-cream-400 hover:bg-cream-500 text-coffee-800' : 'bg-coffee-600 hover:bg-coffee-700 text-white'
                }`}>
                Order Now
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
