import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import { AdminProvider } from './context/AdminContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <CartProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </CartProvider>
    </StoreProvider>
  </StrictMode>,
);

window.setTimeout(() => {
  const loadingScreen = document.getElementById('initial-loading-screen');
  if (!loadingScreen) return;
  loadingScreen.classList.add('is-hidden');
  window.setTimeout(() => loadingScreen.remove(), 450);
}, 800);
