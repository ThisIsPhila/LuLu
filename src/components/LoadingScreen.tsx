import {loadingBackground} from '../services/appearance';
import './LoadingScreen.css';
export function LoadingScreen() {
  return <main className="lulu-loading-screen" role="status" style={{backgroundImage:`linear-gradient(0deg,rgba(35,34,25,.52),rgba(35,34,25,.06)),url(${loadingBackground().url})`}}><img src="/media/brand/lulu-wordmark-white.png" alt="LuLu"/><span>Opening your journal…</span></main>;
}
