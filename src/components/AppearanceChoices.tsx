import {useEffect,useState} from 'react';
import {backgrounds,icons,loadingBackground,readAppIcon,setAppIcon,setLoadingBackground} from '../services/appearance';
import './AppearanceChoices.css';

export function AppearanceChoices() {
 const [background,setBackground]=useState(()=>loadingBackground().id as string);
 const [icon,setIcon]=useState('default');
 const [iconAvailable,setIconAvailable]=useState(false);
 const [status,setStatus]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{void readAppIcon().then(value=>{if(value){setIcon(value.name);setIconAvailable(value.supported);}}).catch(()=>setIconAvailable(false));},[]);
 function chooseBackground(id:string){try{setLoadingBackground(id);setBackground(id);setStatus('Loading screen background saved on this device.');}catch{setStatus('Could not save the loading screen background.');}}
 async function chooseIcon(id:string){setBusy(true);setStatus('');try{const result=await setAppIcon(id);setIcon(result.name);setStatus('App icon updated.');}catch(error){setStatus(error instanceof Error?error.message:'Could not change the app icon.');}finally{setBusy(false);}}
 return <section className="profile-settings-section" aria-labelledby="appearance-choices-title"><h2 id="appearance-choices-title">Personalise LuLu</h2><div className="profile-settings-card appearance-choices">
  <h3>Loading screen background</h3><p>Choose the artwork shown while LuLu opens on this device.</p><div className="appearance-grid">{backgrounds.map(item=><button type="button" key={item.id} aria-pressed={background===item.id} onClick={()=>chooseBackground(item.id)}><img src={item.url} alt=""/><span>{item.label}</span></button>)}</div>
  {iconAvailable && <><h3>App icon</h3><p>Choose how LuLu appears on your iPhone Home Screen.</p><div className="appearance-grid is-icons">{icons.map(item=><button type="button" key={item.id} disabled={busy} aria-pressed={icon===item.id} onClick={()=>void chooseIcon(item.id)}><img src={item.url} alt=""/><span>{item.label}</span></button>)}</div></>}
  {status && <p role="status">{status}</p>}
 </div></section>;
}
