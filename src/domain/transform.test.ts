import {test} from 'node:test';import assert from 'node:assert/strict';import {transform,initialEntities} from './transform.ts';
test('context and perspective remain coherent',()=>assert.equal(transform('David came to my home at 9pm and threatened me.',initialEntities),'John came to the Nest at Blue Moon and threatened her.'));
test('alias updates retain references',()=>assert.equal(transform('David met David.',initialEntities.map(e=>e.type==='Person'?{...e,alias:'Robin'}:e)),'Robin met Robin.'));
test('replacement is literal and original stays unchanged',()=>{const source='David came home';transform(source,initialEntities);assert.equal(source,'David came home');assert.equal(transform('Ann arrived',[{id:'a',original:'Ann',alias:'$&',type:'Person'}]),'$& arrived');});
