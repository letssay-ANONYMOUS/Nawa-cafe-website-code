import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

const ScrollRestoration = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPathRef = useRef<string | null>(null);

  // Save scroll on every scroll event (debounced)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        scrollPositions.set(pathname, window.scrollY);
      }, 80);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
      // Save final position on unmount
      scrollPositions.set(pathname, window.scrollY);
    };
  }, [pathname]);

  // Restore or reset scroll on route change
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const saved = scrollPositions.get(pathname);
    if (saved && saved > 0) {
      // Restore with retries to handle async content
      const restore = (attempts: number) => {
        window.scrollTo(0, saved);
        if (attempts > 0 && Math.abs(window.scrollY - saved) > 50) {
          requestAnimationFrame(() => setTimeout(() => restore(attempts - 1), 100));
        }
      };
      // Wait for DOM to paint
      requestAnimationFrame(() => setTimeout(() => restore(5), 50));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollRestoration;
