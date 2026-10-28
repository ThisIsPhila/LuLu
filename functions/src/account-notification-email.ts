import {renderLuLuEmail} from './lulu-email-layout.js';
/** Branded transactional template. Delivery must be configured separately. */
export const ACCOUNT_NOTIFICATION_RECIPIENT = 'lulu@thisisphila.co.za';
export function accountNotificationEmail(createdAt:string):{subject:string;text:string;html:string} {
  const date=new Date(createdAt);
  if(Number.isNaN(date.valueOf())) throw new Error('Invalid account creation time.');
  const display=new Intl.DateTimeFormat('en-ZA',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(date);
  const subject='A new account joined LuLu';
  const text=`A new account was created on LuLu.\n\nCreated: ${display} (South Africa)\n\nOpen LuLu to review account activity: https://lulu.thisisphila.co.za/\n\nLuLu · Your story. Your safety. Your choice.`;
  const html=renderLuLuEmail({eyebrow:'Account activity',title:'A new account joined LuLu.',body:`A new account was created on ${display} (South Africa).`,buttonLabel:'View account activity',buttonUrl:'https://lulu.thisisphila.co.za/',note:'This is an internal account notification for the LuLu team.'});
  return {subject,text,html};
}
