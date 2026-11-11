import { useEffect, useState } from 'react';

// Returns `value` only after it stopped changing for `delay` ms
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // typing again cancels the previous timer
  }, [value, delay]);

  return debounced;
}
