import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

const ScrollRestoration = () => {
  const { pathname } = useLocation();
  const prevPathRef = useRef<string | null>(null);
  const restoringRef = useRef(false);

  // Save scroll on every scroll event (debounced) — but not while restoring
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (restoringRef.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        scrollPositions.set(pathname, window.scrollY);
      }, 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
      if (!restoringRef.current) {
        scrollPositions.set(pathname, window.scrollY);
      }
    };
  }, [pathname]);

  // Restore or reset scroll on route change
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const saved = scrollPositions.get(pathname);
    if (saved && saved > 0) {
      restoringRef.current = true;

      // Keep trying until we reach the target or run out of attempts
      let attempts = 0;
      const maxAttempts = 30; // ~3 seconds total
      const tryRestore = () => {
        window.scrollTo(0, saved);
        attempts++;
        if (Math.abs(window.scrollY - saved) < 30) {
          // Success
          setTimeout(() => { restoringRef.current = false; }, 200);
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(tryRestore, 100);
        } else {
          // Give up, accept current position
          restoringRef.current = false;
        }
      };

      // Also watch for DOM changes (async content loading)
      const observer = new MutationObserver(() => {
        if (restoringRef.current) {
          window.scrollTo(0, saved);
          if (Math.abs(window.scrollY - saved) < 30) {
            restoringRef.current = false;
            observer.disconnect();
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Start retry loop after first paint
      requestAnimationFrame(() => setTimeout(tryRestore, 30));

      // Cleanup observer after timeout
      const cleanupTimer = setTimeout(() => {
        observer.disconnect();
        restoringRef.current = false;
      }, 3500);

      return () => {
        observer.disconnect();
        clearTimeout(cleanupTimer);
        restoringRef.current = false;
      };
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollRestoration;
