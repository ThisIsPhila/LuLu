export type LuLuUpdate = {version:string; nativeVersion:string; url:string; checksum:string; sessionKey:string};
/** Only signed bundles from the LuLu update directory are eligible for download. */
export function parseUpdateManifest(value:unknown):LuLuUpdate | null {
  if (!value || typeof value !== 'object') return null;
  const x=value as Record<string,unknown>;
  if (typeof x.version!=='string' || !/^\d+\.\d+\.\d+$/.test(x.version) || typeof x.nativeVersion!=='string' || !/^\d+(?:\.\d+){1,2}$/.test(x.nativeVersion) ||
      typeof x.url!=='string' || !/^https:\/\/lulu\.thisisphila\.co\.za\/updates\/[a-zA-Z0-9._-]+\.zip$/.test(x.url) ||
      typeof x.checksum!=='string' || !x.checksum || typeof x.sessionKey!=='string' || !x.sessionKey) return null;
  return x as LuLuUpdate;
}
export function compareUpdateVersions(a:string,b:string):number {
  const x=a.split('.').map(Number),y=b.split('.').map(Number);
  for(let i=0;i<3;i++){const difference=(x[i]||0)-(y[i]||0);if(difference)return difference;}
  return 0;
}
