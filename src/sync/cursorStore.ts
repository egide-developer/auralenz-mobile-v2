import { Storage } from "expo-sqlite/kv-store";

function getStoreKey(userId: string): string {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("A user ID is required to access sync cursors");
  }
  return `auralenz-cursors-${encodeURIComponent(normalizedUserId)}`;
}

export function getSyncCursor(userId: string, resourceKey: string): string | null {
  return Storage.getItemSync(`${getStoreKey(userId)}:cursor:${resourceKey}`) ?? null;
}

export function setSyncCursor(
  userId: string,
  resourceKey: string,
  cursor: string,
): void {
  Storage.setItemSync(`${getStoreKey(userId)}:cursor:${resourceKey}`, cursor);
}

export function removeSyncCursor(userId: string, resourceKey: string): void {
  Storage.removeItemSync(`${getStoreKey(userId)}:cursor:${resourceKey}`);
}

export function clearUserSyncStore(userId: string): void {
  const keys = Storage.getAllKeysSync();
  const prefix = `${getStoreKey(userId)}:`;
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      Storage.removeItemSync(key);
    }
  }
}