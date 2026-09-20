import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { TrackerProvider } from './store/TrackerContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <TrackerProvider>
        <App />
      </TrackerProvider>
    </ThemeProvider>
  </StrictMode>,
);
