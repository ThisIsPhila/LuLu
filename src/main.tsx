import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { NativeAuthBridge } from './platform/NativeAuthBridge';
import { registerOfflineShell } from './offline/registerOfflineShell';
import './fonts.css';
import './styles.css';
import './app-layout.css';

registerOfflineShell();
createRoot(document.getElementById('root')!).render(
  <StrictMode>{window.location.pathname.replace(/\/$/, '') === '/native-auth-bridge' ? <NativeAuthBridge /> : <App />}</StrictMode>,
);
