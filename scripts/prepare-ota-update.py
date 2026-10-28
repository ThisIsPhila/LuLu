#!/usr/bin/env python3
"""Build a signed OTA bundle into public/updates. Deploy hosting after preparation."""
import json, pathlib, re, shutil, subprocess, sys, tempfile
root=pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv)!=3 or not re.fullmatch(r'\d+\.\d+\.\d+',sys.argv[1]) or not re.fullmatch(r'\d+(?:\.\d+){1,2}',sys.argv[2]):
    raise SystemExit('Usage: python3 scripts/prepare-ota-update.py <update-version, e.g. 1.0.1> <native-version, e.g. 1.0>')
version,native=sys.argv[1:]
key=pathlib.Path.home()/'.config/lulu-updates/private.pem'
if not key.is_file(): raise SystemExit('The LuLu update signing key is missing.')
key_info=subprocess.run(['openssl','rsa','-in',str(key),'-noout','-text'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True).stdout
if not key_info.startswith('Private-Key: (2048 bit'):
    raise SystemExit('The installed updater requires a 2048-bit RSA signing key.')
pub=subprocess.run(['openssl','rsa','-in',str(key),'-RSAPublicKey_out'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
if pub != (root/'ota-public.pem').read_bytes(): raise SystemExit('The signing key does not match the app public key.')
subprocess.run(['npm','run','build:app'],cwd=root,check=True)
with tempfile.TemporaryDirectory(prefix='lulu-ota-') as tmp:
    archive=str(pathlib.Path(tmp)/'bundle.zip')
    staged=pathlib.Path(tmp)/'app'
    shutil.copytree(root/'dist/app', staged, ignore=shutil.ignore_patterns('updates'))
    def cli(*args):
        result=subprocess.run(['npx','--yes','@capgo/cli@8.98.3',*args],cwd=root,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        return json.loads(result.stdout)
    zipped=cli('bundle','zip','org.khora.lulu','--path',str(staged),'--name',archive,'--no-code-check','--json')
    encrypted=cli('bundle','encrypt',archive,zipped['checksum'],'--key',str(key),'--json')
    dest=root/'public/updates';dest.mkdir(parents=True,exist_ok=True)
    target=dest/f'lulu-{version}.zip'
    if target.exists(): raise SystemExit('That update version already exists. Choose a new version.')
    target.write_bytes(pathlib.Path(encrypted['filename']).read_bytes())
    manifest={'version':version,'nativeVersion':native,'url':f'https://lulu.thisisphila.co.za/updates/{target.name}','checksum':encrypted['checksum'],'sessionKey':encrypted['ivSessionKey']}
    (dest/'latest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Prepared signed update {version} for native app {native}. Rebuild and deploy Hosting to publish it.')
