/** Branded transactional template. Delivery must be configured separately. */
export const ACCOUNT_NOTIFICATION_RECIPIENT = 'lulu@thisisphila.co.za';
function escapeHtml(value:string):string {
  return value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
}
export function accountNotificationEmail(createdAt:string):{subject:string;text:string;html:string} {
  const date=new Date(createdAt);
  if(Number.isNaN(date.valueOf())) throw new Error('Invalid account creation time.');
  const display=new Intl.DateTimeFormat('en-ZA',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(date);
  const subject='A new account joined LuLu';
  const text=`A new account was created on LuLu.\n\nCreated: ${display} (South Africa)\n\nOpen LuLu to review account activity: https://lulu.thisisphila.co.za/\n\nLuLu · Your story. Your safety. Your choice.`;
  const html=`<!doctype html><html lang="en"><body style="margin:0;background:#f4f1ea;color:#272a24;font-family:Arial,sans-serif"><main style="max-width:560px;margin:24px auto;padding:32px;background:#fffdf8;border:1px solid #ded8cb;border-radius:22px"><img src="https://lulu.thisisphila.co.za/media/brand/lulu-wordmark-black.png" width="108" alt="LuLu" style="display:block;max-width:100%;height:auto"><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:30px">A new account joined LuLu</h1><p>A new account was created on LuLu.</p><p><strong>Created:</strong> ${escapeHtml(display)} (South Africa)</p><p><a href="https://lulu.thisisphila.co.za/" style="display:inline-block;background:#282c25;color:white;padding:12px 18px;border-radius:24px;text-decoration:none">Open LuLu</a></p><p style="font-size:12px;color:#676b61">Your story. Your safety. Your choice.</p></main></body></html>`;
  return {subject,text,html};
}
