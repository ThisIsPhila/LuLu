import {createHash,randomUUID} from 'node:crypto';
import {Timestamp,type Firestore} from 'firebase-admin/firestore';
import {sendAccountNotification} from './resend-notifications.js';

/** Records first app-session account events. Failures never block sign-in.
 * Pending events retry on subsequent sign-ins; a separate reliable event
 * source and worker are needed to cover accounts that never open a session. */
export async function processAccountAlerts(db:Firestore, uid:string, creationTime:string, cutoff:number, apiKey:string, send:typeof sendAccountNotification = sendAccountNotification):Promise<void> {
  const created=Date.parse(creationTime);
  if(!apiKey || !Number.isFinite(created) || !Number.isFinite(cutoff)) return;
  if(created>=cutoff) {
    const id=createHash('sha256').update(uid).digest('hex');
    const ref=db.collection('_accountAlerts').doc(id);
    await db.runTransaction(async tx=>{
      const existing=await tx.get(ref);
      if(!existing.exists) tx.create(ref,{createdAt:Timestamp.fromMillis(created),status:'pending',attempts:0});
    });
  }
  const pending=await db.collection('_accountAlerts').where('status','==','pending').limit(1).get();
  for(const entry of pending.docs) {
    const lease=randomUUID();
    const claim=await db.runTransaction(async tx=>{
      const current=await tx.get(entry.ref);const data=current.data();
      if(!data || data.status!=='pending' || (typeof data.leaseUntil==='number' && data.leaseUntil>Date.now())) return null;
      tx.update(entry.ref,{lease,leaseUntil:Date.now()+30_000,attempts:(data.attempts ?? 0)+1});
      return data.createdAt?.toDate?.()?.toISOString?.() as string | undefined;
    });
    if(!claim)continue;
    try {
      await send({apiKey,accountId:entry.id,createdAt:claim});
      await db.runTransaction(async tx=>{const current=await tx.get(entry.ref);if(current.data()?.lease===lease)tx.update(entry.ref,{status:'sent',sentAt:Timestamp.now(),leaseUntil:0});});
    } catch {
      await db.runTransaction(async tx=>{const current=await tx.get(entry.ref);if(current.data()?.lease===lease)tx.update(entry.ref,{leaseUntil:0,lastFailureAt:Timestamp.now()});});
    }
  }
}
