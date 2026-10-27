import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {sendAccountNotification} from './resend-notifications.js';
test('sends branded account alert to the team inbox with an idempotency key',async()=>{
 let request:RequestInit|undefined;
 await sendAccountNotification({apiKey:'test-secret',accountId:'account-1',createdAt:'2026-10-27T12:00:00Z',fetcher:async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');request=init;return new Response('{}',{status:200});}});
 const body=JSON.parse(String(request?.body));
 assert.deepEqual(body.to,['lulu@thisisphila.co.za']); assert.equal(body.from,'LuLu <lulu@thisisphila.co.za>');
 assert.match((request?.headers as Record<string,string>)['Idempotency-Key'],/^lulu\/account\/[0-9a-f]{64}$/);
 assert.equal(JSON.stringify(body).includes('account-1'),false);assert.equal(JSON.stringify(body).includes('test-secret'),false);
});
test('fails when sending fails or sender is not configured',async()=>{
 await assert.rejects(sendAccountNotification({apiKey:'',accountId:'account-1',createdAt:'2026-10-27T12:00:00Z'}));
 await assert.rejects(sendAccountNotification({apiKey:'test',accountId:'account-1',createdAt:'2026-10-27T12:00:00Z',fetcher:async()=>new Response('',{status:500})}));
});
