import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SCROLL_KEY_PREFIX = 'scrollY_';

const ScrollRestoration = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Restore scroll position for this route
    const saved = sessionStorage.getItem(SCROLL_KEY_PREFIX + pathname);
    if (saved) {
      const targetY = parseInt(saved);
      // Wait for content to render, then scroll
      const tryScroll = () => {
        requestAnimationFrame(() => {
          window.scrollTo(0, targetY);
          if (Math.abs(window.scrollY - targetY) > 50 && targetY > 0) {
            setTimeout(() => window.scrollTo(0, targetY), 200);
          }
        });
      };
      setTimeout(tryScroll, 50);
    } else {
      window.scrollTo(0, 0);
    }

    // Save scroll position on scroll (debounced)
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sessionStorage.setItem(SCROLL_KEY_PREFIX + pathname, window.scrollY.toString());
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      // Save final position on unmount (route change)
      sessionStorage.setItem(SCROLL_KEY_PREFIX + pathname, window.scrollY.toString());
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
};

export default ScrollRestoration;
