import { useEffect } from "react";
import { onSocketError, onUserStatusChange, getSocket } from "../../services/socket";
import { usePresenceStore } from "../../stores/presenceStore";
import { useAuthStore } from "../../stores/authStore";
import { showToast } from "../../stores/toastStore";

/**
 * Mounted once at the app root, alongside CallListener.
 *
 * These two events are global by nature: a presence change concerns every
 * screen showing that user, and a server rejection can be triggered from
 * anywhere. Both were previously emitted by the backend with nothing
 * listening, so authorization failures vanished silently and presence dots
 * never moved after the initial fetch.
 */
export function SocketListener() {
  const token = useAuthStore((s) => s.token);
  const setPresence = usePresenceStore((s) => s.setPresence);

  useEffect(() => {
    // Re-subscribe whenever the session changes: connectSocket() builds a new
    // socket instance on login, and listeners bound to the old one are lost.
    if (!token || !getSocket()) return;

    const unsubscribeError = onSocketError(({ message }) => {
      showToast(message || "Something went wrong", "error");
    });

    const unsubscribePresence = onUserStatusChange(({ userId, isOnline, lastSeen }) => {
      setPresence(userId, { isOnline, lastSeen });
    });

    return () => {
      unsubscribeError?.();
      unsubscribePresence?.();
    };
  }, [token, setPresence]);

  return null;
}
