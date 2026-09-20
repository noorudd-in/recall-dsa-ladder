import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['today', 'problems', 'review', 'activity', 'settings'];

const read = () => {
  const name = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES.includes(name) ? name : 'today';
};

/** Tiny hash router: works on any static host with no rewrite rules. */
export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const go = useCallback((name) => {
    window.location.hash = `#/${name}`;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, go];
}
