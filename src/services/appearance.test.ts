import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {backgrounds,loadingBackground,setLoadingBackground} from './appearance.ts';

function useStorage(storage:Storage){
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
}

test('loading background defaults to mountains and restores the selected artwork',()=>{
  const values=new Map<string,string>();
  useStorage({
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>{values.set(key,String(value));},
    removeItem:key=>{values.delete(key);},
    clear:()=>values.clear(),
    key:index=>[...values.keys()][index]??null,
    get length(){return values.size;},
  } as Storage);
  assert.equal(loadingBackground().id,'mountains');
  assert.equal(setLoadingBackground('lake').url,backgrounds[3]!.url);
  assert.equal(loadingBackground().id,'lake');
  assert.throws(()=>setLoadingBackground('missing'));
});
