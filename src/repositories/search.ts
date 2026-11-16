import { desc, eq, inArray, lte } from "drizzle-orm";
import { getUserDatabase } from "../db/client";
import { searchCache, type JsonValue } from "../db/schema";
import { getMessagesByIds } from "./messages";
import { publishRepositoryChange, repositoryTopic } from "./changes";

export const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

export type SearchFamily = "users" | "suggested" | "recommended" | "trending" | "messages";

export interface SearchCacheEntry {
  queryKey: string;
  results: JsonValue;
  fetchedAt: string;
}

export function buildSearchQueryKey(
  family: SearchFamily,
  query: string,
  page = 1,
  limit = 24,
): string {
  const normalizedQuery = query.trim().toLowerCase();
  return `${family}:${normalizedQuery}:${page}:${limit}`;
}

export function isSearchCacheFresh(fetchedAt: string): boolean {
  const fetched = Date.parse(fetchedAt);
  return Number.isFinite(fetched) && Date.now() - fetched < SEARCH_CACHE_TTL_MS;
}

export async function getCachedSearchResults(
  userId: string,
  queryKey: string,
): Promise<SearchCacheEntry | null> {
  const database = await getUserDatabase(userId);
  const [entry] = await database
    .select()
    .from(searchCache)
    .where(eq(searchCache.queryKey, queryKey))
    .limit(1);
  return entry ?? null;
}

export async function getCachedSearchResultsIfFresh(
  userId: string,
  queryKey: string,
): Promise<SearchCacheEntry | null> {
  const entry = await getCachedSearchResults(userId, queryKey);
  if (!entry) return null;
  if (!isSearchCacheFresh(entry.fetchedAt)) return null;
  return entry;
}

export async function upsertSearchResults(
  userId: string,
  queryKey: string,
  results: JsonValue,
  fetchedAt = new Date().toISOString(),
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database
    .insert(searchCache)
    .values({ queryKey, results, fetchedAt })
    .onConflictDoUpdate({
      target: searchCache.queryKey,
      set: { results, fetchedAt },
    });
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function searchCachedMessages(
  userId: string,
  query: string,
  limit = 30,
) {
  const tokens = query.match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (tokens.length === 0) return [];

  const matchExpression = tokens.map((token) => `${token}*`).join(" AND ");
  const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
  const database = await getUserDatabase(userId);
  const matches = await database.$client.getAllAsync<{ id: string }>(
    `SELECT messages.id
     FROM messages_fts
     INNER JOIN messages ON messages.rowid = messages_fts.rowid
     WHERE messages_fts MATCH ? AND messages.deleted_at IS NULL
     ORDER BY bm25(messages_fts), messages.created_at DESC
     LIMIT ?`,
    [matchExpression, safeLimit],
  );
  return getMessagesByIds(
    userId,
    matches.map((match) => match.id),
  );
}

export async function removeExpiredSearchResults(
  userId: string,
  cutoffIso: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database
    .delete(searchCache)
    .where(lte(searchCache.fetchedAt, cutoffIso));
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function listSearchCacheNewestFirst(userId: string) {
  const database = await getUserDatabase(userId);
  return database
    .select()
    .from(searchCache)
    .orderBy(desc(searchCache.fetchedAt));
}

export async function removeSearchCacheEntry(userId: string, queryKey: string): Promise<void> {
  const database = await getUserDatabase(userId);
  await database.delete(searchCache).where(eq(searchCache.queryKey, queryKey)).run();
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export const MAX_SEARCH_CACHE_ENTRIES = 200;

export async function cleanupExpiredSearchCache(userId: string): Promise<number> {
  const database = await getUserDatabase(userId);
  const cutoff = new Date(Date.now() - SEARCH_CACHE_TTL_MS).toISOString();
  const expired = await database
    .select({ queryKey: searchCache.queryKey })
    .from(searchCache)
    .where(lte(searchCache.fetchedAt, cutoff));

  if (expired.length === 0) return 0;

  const deleteKeys = expired.map((e) => e.queryKey);
  await database.delete(searchCache).where(inArray(searchCache.queryKey, deleteKeys)).run();
  publishRepositoryChange(repositoryTopic(userId, "search"));
  return deleteKeys.length;
}

export async function enforceSearchCacheCapacity(userId: string): Promise<number> {
  const database = await getUserDatabase(userId);
  const allEntries = await database
    .select({ queryKey: searchCache.queryKey, fetchedAt: searchCache.fetchedAt })
    .from(searchCache)
    .orderBy(desc(searchCache.fetchedAt));

  if (allEntries.length <= MAX_SEARCH_CACHE_ENTRIES) return 0;

  const toDelete = allEntries.slice(MAX_SEARCH_CACHE_ENTRIES);
  const deleteKeys = toDelete.map((e) => e.queryKey);
  await database.delete(searchCache).where(inArray(searchCache.queryKey, deleteKeys)).run();
  publishRepositoryChange(repositoryTopic(userId, "search"));
  return deleteKeys.length;
}

export async function cleanupSearchCache(userId: string): Promise<{ expired: number; capacity: number }> {
  const expired = await cleanupExpiredSearchCache(userId);
  const capacity = await enforceSearchCacheCapacity(userId);
  return { expired, capacity };
}
