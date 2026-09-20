import { useEffect, useState } from 'react';
import { todayStr } from '../lib/dates.js';

/** The current local date. Rolls over at midnight and when the tab wakes up again. */
export function useToday() {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday((prev) => {
      const now = todayStr();
      return now === prev ? prev : now;
    });
    const id = setInterval(check, 30000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}
