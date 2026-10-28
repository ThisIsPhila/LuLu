import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';

export function ProfileAvatar({ photoUrl }: { photoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photoUrl]);
  return photoUrl && !failed ? <img src={photoUrl} alt="" className="profile-avatar-image" onError={() => setFailed(true)} /> : <UserRound size={18} aria-hidden="true" />;
}
