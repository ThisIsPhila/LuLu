import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { LocalVault, LocalVaultRevision } from '../services/vault/localVault';
import type { Entity } from '../domain/transform';
import { transform } from '../domain/transform';
import { useWritingViewport } from '../hooks/useWritingViewport';
import { LuLuLogo } from './Logo';
import { PrivateDraftFields } from './PrivateDraftFields';
import './PrivateWriting.css';
import type { LocalMediaVault } from '../services/vault/localMediaVault';
import { PrivateMediaCapture } from './PrivateMediaCapture';

type Props={vault:LocalVault;mediaVault?:LocalMediaVault;initialTitle:string;initialBody:string;entities:Entity[];onBack:()=>void;onSaved:(revision:LocalVaultRevision)=>void;onOpenEntityInspector:()=>void};

export function PrivateDraftComposer({vault,mediaVault,initialTitle,initialBody,entities,onBack,onSaved,onOpenEntityInspector}:Props) {
  const viewport=useWritingViewport();
  const [body,setBody]=useState(initialBody);
  const [showPreview,setShowPreview]=useState(false);
  return <div className="transform-protect-screen keyboard-writing-screen private-draft-composer" style={viewport}>
    <header className="transform-header">
      <button className="icon-btn-round" onClick={onBack} aria-label="Back to journal"><ArrowLeft size={18}/></button>
      <div className="header-brand-title"><LuLuLogo size="sm"/></div>
    </header>
    <main className="transform-flow-body">
      <div className="composer-processing-panel private-draft-processing">
        <p className="private-draft-security-note">Private writing stays encrypted in this browser. Saved-record backups are manual.</p>
        <button className="private-draft-preview-toggle" type="button" aria-expanded={showPreview} onClick={()=>setShowPreview(value=>!value)}>{showPreview?'Conceal preview':'Inspect representation preview'}</button>
        {showPreview && <div className="protected-vault-card private-draft-preview"><p>Configured representations are a preview, not a complete privacy review.</p>
          <div className="protected-body-rendered">{transform(body,entities,{perspectiveDistancing:true})}</div>
          <button type="button" onClick={onOpenEntityInspector}>Edit representations</button>
        </div>}
      </div>
      <div className="composer-input-dock"><div className="original-entry-card">
        <PrivateDraftFields vault={vault} initialTitle={initialTitle} initialBody={initialBody} onSaved={onSaved}
          onContentChange={content=>{setBody(content.body);setShowPreview(false);}} />
        {mediaVault && <PrivateMediaCapture vault={mediaVault} />}
      </div></div>
    </main>
  </div>;
}
