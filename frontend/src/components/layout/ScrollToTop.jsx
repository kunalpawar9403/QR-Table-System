import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to the top on navigation, or to the `#hash` target when one is present
 * (e.g. footer links such as /features#kds).
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const frame = requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) {
          target.scrollIntoView({ block: 'start' });
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      });
      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return undefined;
  }, [pathname, search, hash]);

  return null;
}
