export const OWNER_EMAIL = 'pmteshani@gmail.com';
/** A verified Firebase identity is required; unverified email claims are insufficient. */
export function mayReadAccountActivity(user: {email?:string; emailVerified?:boolean}): boolean {
  return user.emailVerified === true && user.email?.toLowerCase() === OWNER_EMAIL;
}
