import {Capacitor, registerPlugin} from '@capacitor/core';
export const backgrounds = [
  {id:'journal',label:'Journal',url:'/media/appearance/01-journal.jpg'},
  {id:'mountains',label:'Mountains',url:'/media/appearance/02-mountains.jpg'},
  {id:'olive-path',label:'Olive path',url:'/media/appearance/03-olive-path.jpg'},
  {id:'lake',label:'Lake',url:'/media/appearance/04-lake.jpg'},
] as const;
export const icons = [
  {id:'default',label:'Landscape journal',url:'/media/appearance/icon-02-landscape-cover.jpg'},
  {id:'LuLinen',label:'Linen journal',url:'/media/appearance/icon-01-linen-journal.jpg'},
  {id:'LuPaper',label:'Paper landscape',url:'/media/appearance/icon-03-paper-landscape.jpg'},
  {id:'LuLeafy',label:'Leafy light',url:'/media/appearance/icon-04-leafy-light.jpg'},
] as const;
const key='lulu.loading-background.v1';
export function loadingBackground() {try {const saved=localStorage.getItem(key);return backgrounds.find(item=>item.id===saved) ?? backgrounds[1];}catch{return backgrounds[1];}}
export function setLoadingBackground(id:string) {if(!backgrounds.some(item=>item.id===id))throw new Error('Unknown background.');localStorage.setItem(key,id);}
const bridge=registerPlugin<{getIcon():Promise<{name:string;supported:boolean}>;setIcon(input:{name:string}):Promise<{name:string}>}>('LuAppearance');
export async function readAppIcon(){if(Capacitor.getPlatform()!=='ios')return null;return bridge.getIcon();}
export async function setAppIcon(name:string){if(Capacitor.getPlatform()!=='ios')throw new Error('App icon selection is available on iPhone.');return bridge.setIcon({name});}
