import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'recall.theme';
const ThemeContext = createContext({ theme: 'system', setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

const readPref = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readPref);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
