import { useEffect, useState } from 'react';
import { loginModeScenes } from '../services/loginScenes';
import { loadingBackground } from '../services/appearance';
import { getSystemTheme, readAppPreferences, resolveAppTheme, type AppTheme } from '../services/appPreferences';
import './LoadingScreen.css';

export function LoadingScreen({ theme: providedTheme }: { theme?: AppTheme }) {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  const theme = providedTheme ?? resolveAppTheme(readAppPreferences(), null, systemTheme);
  const scene = loginModeScenes[theme];
  const landscape = loadingBackground();
  const toneStrength = (scene.toneOpacity / 100) * (Math.abs(scene.toneLevel - 5) / 5);
  const toneColor = scene.toneLevel < 5 ? '#171914' : '#fff9ed';
  return <main className={`lulu-loading-screen is-${theme}`} role="status" aria-live="polite">
    <div className="lulu-loading-landscape" style={{backgroundImage:`url("${landscape.url}")`,filter:`blur(${scene.blurLevel * 1.5}px)`}} aria-hidden="true" />
    <div className="lulu-loading-tone" style={{backgroundColor:toneColor,opacity:toneStrength}} aria-hidden="true" />
    <div className="lulu-loading-content">
      <div className="lulu-loading-portrait" style={{backgroundImage:`linear-gradient(180deg, #3b302219 0%, transparent 29%, #26241caa 100%), url("${scene.portrait.src}")`}} aria-hidden="true" />
      <img className="lulu-loading-wordmark" src="/media/brand/lulu-wordmark-white.png" alt="LuLu" />
      <span>Opening your journal…</span>
      <i className="lulu-loading-indicator" aria-hidden="true" />
    </div>
  </main>;
}
