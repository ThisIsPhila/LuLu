import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerOfflineShell } from './offline/registerOfflineShell';
import { captureJudgeInvitation } from './services/judgeInvite';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { readAppPreferences } from './services/appPreferences';
import './fonts.css';
import './styles.css';
import './app-layout.css';
import './privacy-demo.css';
import { LoadingScreen } from './components/LoadingScreen';

document.documentElement.dataset.luluPlatform = Capacitor.getPlatform();
document.documentElement.dataset.luluTheme = readAppPreferences().theme;
if (Capacitor.isNativePlatform()) void CapacitorUpdater.notifyAppReady();
registerOfflineShell();
captureJudgeInvitation();
const route = window.location.pathname.replace(/\/$/, '');
const localPrivacyDemo = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const App = React.lazy(() => import('./App'));
const PrivacyDemoEntry = React.lazy(() => import('./components/PrivacyDemoEntry').then(module => ({ default: module.PrivacyDemoEntry })));
const NativeAuthBridge = React.lazy(() => import('./platform/NativeAuthBridge').then(module => ({ default: module.NativeAuthBridge })));
createRoot(document.getElementById('root')!).render(
  <StrictMode><Suspense fallback={<LoadingScreen />}>
    {route === '/native-auth-bridge' ? <NativeAuthBridge /> : route === '/privacy-demo' && localPrivacyDemo ? <PrivacyDemoEntry /> : <App />}
  </Suspense></StrictMode>,
);
