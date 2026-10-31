import type { UserNotification } from '../services/notifications';

/** Ordinary-user notification list shown inside the shared bell panel. */
export function UserNotifications({ items }: { items: UserNotification[] }) {
  if (!items.length) return null;
  return (
    <ul className="user-notification-list">
      {items.map(item => (
        <li key={item.id} className={item.read ? undefined : 'is-unread'}>
          <strong>{item.title}</strong>
          <small>{item.body}</small>
          <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
        </li>
      ))}
    </ul>
  );
}
