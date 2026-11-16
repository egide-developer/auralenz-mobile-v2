import { createMMKV, type MMKV } from "react-native-mmkv";

const stores = new Map<string, MMKV>();

function getUserStore(userId: string): MMKV {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("A user ID is required to access sync cursors");
  }
  const storeId = `auralenz-cursors-${encodeURIComponent(normalizedUserId)}`;
  const existing = stores.get(storeId);
  if (existing) return existing;

  const store = createMMKV({ id: storeId });
  stores.set(storeId, store);
  return store;
}

export function getSyncCursor(userId: string, resourceKey: string): string | null {
  return getUserStore(userId).getString(`cursor:${resourceKey}`) ?? null;
}

export function setSyncCursor(
  userId: string,
  resourceKey: string,
  cursor: string,
): void {
  getUserStore(userId).set(`cursor:${resourceKey}`, cursor);
}

export function removeSyncCursor(userId: string, resourceKey: string): void {
  getUserStore(userId).remove(`cursor:${resourceKey}`);
}

export function clearUserSyncStore(userId: string): void {
  const store = getUserStore(userId);
  const storeId = `auralenz-cursors-${encodeURIComponent(userId.trim())}`;
  store.clearAll();
  stores.delete(storeId);
}
