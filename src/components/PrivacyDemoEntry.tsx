import React, { Suspense, useState } from 'react';
import { PrivacyModelSettings } from './PrivacyModelSettings';
const PrivacyModelDemo = React.lazy(() => import('./PrivacyModelDemo').then(module => ({ default: module.PrivacyModelDemo })));

export function PrivacyDemoEntry() {
  const [settings, setSettings] = useState(false);
  return <div className="lulu-app-root privacy-wide"><div className="lulu-viewport-shell">
    {settings ? <PrivacyModelSettings onBack={() => setSettings(false)} onOpenDemo={() => setSettings(false)} /> :
      <Suspense fallback={<main className="privacy-demo-page"><p role="status">Opening the local model demo…</p></main>}>
        <PrivacyModelDemo onBack={() => setSettings(true)} />
      </Suspense>}
  </div></div>;
}
