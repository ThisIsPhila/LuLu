import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mayReadAccountActivity } from './owner-notifications.js';
test('account activity is limited to the verified owner address',()=>{
  assert.equal(mayReadAccountActivity({email:'PMTESHANI@gmail.com',emailVerified:true}),true);
  assert.equal(mayReadAccountActivity({email:'pmteshani@gmail.com',emailVerified:false}),false);
  assert.equal(mayReadAccountActivity({email:'other@example.com',emailVerified:true}),false);
  assert.equal(mayReadAccountActivity({}),false);
});
