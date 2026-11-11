import { useEffect, useRef } from 'react';

// Attach the returned ref to an element at the bottom of a list.
// When it comes within 300px of the screen, `onReachEnd` runs.
export function useInfiniteScroll(onReachEnd, enabled) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onReachEnd();
      },
      { rootMargin: '300px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onReachEnd, enabled]);

  return ref;
}
