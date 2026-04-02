import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="fmla-portal-theme"
      >
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
