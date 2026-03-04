import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

const getStorageKey = (pathname: string) => `scroll-pos:${pathname}`;

const writeScrollPosition = (pathname: string, position: number) => {
  scrollPositions.set(pathname, position);

  try {
    sessionStorage.setItem(getStorageKey(pathname), String(position));
  } catch {
    // ignore storage write errors
  }
};

const readScrollPosition = (pathname: string): number | null => {
  const inMemory = scrollPositions.get(pathname);
  if (typeof inMemory === 'number') return inMemory;

  try {
    const raw = sessionStorage.getItem(getStorageKey(pathname));
    if (!raw) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const ScrollRestoration = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef<string | null>(null);
  const restoringRef = useRef(false);

  // Persist scroll while user scrolls on current route
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      if (restoringRef.current) return;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        writeScrollPosition(pathname, window.scrollY);
      }, 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);

      if (!restoringRef.current) {
        writeScrollPosition(pathname, window.scrollY);
      }
    };
  }, [pathname]);

  // Restore on browser back/forward (POP), otherwise start at top
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const saved = readScrollPosition(pathname);
    const shouldRestore = navigationType === 'POP' && typeof saved === 'number' && saved > 0;

    if (shouldRestore) {
      const target = saved;
      restoringRef.current = true;

      let attempts = 0;
      const maxAttempts = 12;

      const restoreUntilStable = () => {
        window.scrollTo(0, target);
        attempts += 1;

        if (Math.abs(window.scrollY - target) < 20 || attempts >= maxAttempts) {
          restoringRef.current = false;
          return;
        }

        requestAnimationFrame(restoreUntilStable);
      };

      requestAnimationFrame(restoreUntilStable);
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
};

export default ScrollRestoration;

