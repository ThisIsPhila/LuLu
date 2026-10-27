import {createHash} from 'node:crypto';
import {ACCOUNT_NOTIFICATION_RECIPIENT, accountNotificationEmail} from './account-notification-email.js';

type Fetcher = (url:string, init:RequestInit)=>Promise<Response>;
/** Sends only the creation timestamp, never account identifiers or journal content.
 * The key is supplied by the server environment and is never returned to a client. */
export async function sendAccountNotification(options:{apiKey:string;accountId:string;createdAt:string;fetcher?:Fetcher}):Promise<void> {
  if (!options.apiKey || !/^[A-Za-z0-9_-]{1,128}$/.test(options.accountId)) throw new Error('Email sender is not configured.');
  const message=accountNotificationEmail(options.createdAt);
  const response=await (options.fetcher ?? fetch)('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:`Bearer ${options.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`lulu/account/${createHash('sha256').update(options.accountId).digest('hex')}`},
    body:JSON.stringify({from:'LuLu <lulu@thisisphila.co.za>',to:[ACCOUNT_NOTIFICATION_RECIPIENT],...message}),
    signal:AbortSignal.timeout(10_000),
  });
  if(!response.ok) throw new Error('The account notification could not be sent.');
}
