import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {ACCOUNT_NOTIFICATION_RECIPIENT,accountNotificationEmail} from './account-notification-email.js';
test('account alert uses the requested team inbox and branded template',()=>{
 const mail=accountNotificationEmail('2026-10-27T12:00:00Z');
 assert.equal(ACCOUNT_NOTIFICATION_RECIPIENT,'lulu@thisisphila.co.za');
 assert.match(mail.html,/lulu-wordmark-black/);assert.match(mail.html,/lulu\.thisisphila\.co\.za/);assert.match(mail.text,/14:00/);
 assert.throws(()=>accountNotificationEmail('not-a-date'));
});
