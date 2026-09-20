import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.jsx';

const OPTIONS = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'system', label: 'System', Icon: Monitor },
  { id: 'dark', label: 'Dark', Icon: Moon },
];

export default function ThemeSwitch({ withLabels = false }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`seg ${withLabels ? '' : 'seg-compact'}`} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          className={theme === id ? 'on' : ''}
          onClick={() => setTheme(id)}
          title={`${label} theme`}
        >
          <Icon size={15} aria-hidden="true" />
          <span className={withLabels ? '' : 'sr-only'}>{label}</span>
        </button>
      ))}
    </div>
  );
}
