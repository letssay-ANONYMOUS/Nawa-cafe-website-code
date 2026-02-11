import { useEffect } from 'react';
import Header from '@/components/Header';
import Menu from '@/components/Menu';
import Footer from '@/components/Footer';

const MenuPage = () => {
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem('menuScrollY');
    if (savedScrollY) {
      const targetY = parseInt(savedScrollY);
      sessionStorage.removeItem('menuScrollY');
      // Use requestAnimationFrame to ensure DOM is painted, then scroll
      const tryScroll = () => {
        requestAnimationFrame(() => {
          window.scrollTo(0, targetY);
          // Verify scroll happened; retry if content wasn't ready
          if (Math.abs(window.scrollY - targetY) > 50 && targetY > 0) {
            setTimeout(() => window.scrollTo(0, targetY), 200);
          }
        });
      };
      // Wait for menu data to likely be rendered
      setTimeout(tryScroll, 50);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <Menu />
      </div>
      <Footer />
    </div>
  );
};

export default MenuPage;
