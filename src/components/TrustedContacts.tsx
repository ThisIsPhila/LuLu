import {useEffect,useState,type FormEvent} from 'react';
import {loadContacts,saveContacts,type TrustedContact} from '../services/backend/journal';
export function TrustedContacts({uid,onClose}:{uid:string;onClose:()=>void}){
  const [contacts,setContacts]=useState<TrustedContact[]>([]),[name,setName]=useState(''),[phone,setPhone]=useState('');
  const [busy,setBusy]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let active=true;loadContacts(uid).then(c=>{if(active)setContacts(c);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[uid]);
  async function save(next:TrustedContact[]){setBusy(true);setError('');try{await saveContacts(uid,next);setContacts(next);setName('');setPhone('');}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const cleanName=name.trim(),cleanPhone=phone.trim();
    if(!cleanName){setError('Add a name for this contact.');return;}
    if(!/^[+\d ()-]{3,30}$/.test(cleanPhone) || (cleanPhone.match(/\d/g)?.length??0)<3){setError('Enter a valid phone number.');return;}
    void save([...contacts,{id:crypto.randomUUID(),name:cleanName,phone:cleanPhone}]);
  }
  return <section className="trusted-contacts-panel" aria-label="Trusted contacts" style={{padding:20,background:'#292823',borderRadius:20}}><button onClick={onClose}>Close contacts</button><h2>People you trust</h2><p>Save a number here for when you choose to reach out. LuLu sends no automatic alerts.</p>{error&&<p role="alert">{error}</p>}{contacts.map(c=><div key={c.id} style={{display:'flex',gap:12,padding:'12px 0',alignItems:'center'}}><strong>{c.name}</strong><a href={'tel:'+c.phone.replace(/[^+\d]/g,'')}>{c.phone}</a><button disabled={busy} onClick={()=>void save(contacts.filter(v=>v.id!==c.id))}>Remove</button></div>)}<form onSubmit={submit} style={{display:'grid',gap:12}}><input aria-label="Contact name" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} required/><input aria-label="Contact phone" placeholder="Phone number" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} required/><button disabled={busy}>{busy?'Please wait…':'Save contact'}</button></form></section>;
}
