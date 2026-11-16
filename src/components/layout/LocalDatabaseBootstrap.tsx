import { useEffect } from "react";
import {
  closeUserDatabase,
  deleteUserDatabase,
  initializeUserDatabase,
} from "../../db/client";
import { useAuthStore } from "../../stores/authStore";
import { showToast } from "../../stores/toastStore";
import { clearUserSyncStore } from "../../sync/cursorStore";
import { startUserSync, stopUserSync } from "../../sync/chatSync";

export function LocalDatabaseBootstrap() {
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    void initializeUserDatabase(userId)
      .then(async () => {
        if (!active) return;
        await startUserSync(userId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("[LocalDatabase] Initialization failed", error);
        showToast(
          "Local data could not be initialized. Restart the app to retry.",
          "error",
        );
      });

    return () => {
      active = false;
      void (async () => {
        await stopUserSync(userId);
        const signedOut = useAuthStore.getState().user === null;
        if (signedOut) {
          await deleteUserDatabase(userId);
          clearUserSyncStore(userId);
          return;
        }
        await closeUserDatabase(userId);
      })().catch((error: unknown) => {
        console.error("[LocalDatabase] Failed to close user data", error);
      });
    };
  }, [userId]);

  return null;
}
