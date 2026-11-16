export type RepositoryEntity =
  | "conversations"
  | "messages"
  | "profiles"
  | "posts"
  | "search";

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const revisions = new Map<string, number>();

export function repositoryTopic(
  userId: string,
  entity: RepositoryEntity,
): string {
  return `${encodeURIComponent(userId)}:${entity}`;
}

export function subscribeToRepository(
  topic: string,
  listener: Listener,
): () => void {
  const topicListeners = listeners.get(topic) ?? new Set<Listener>();
  topicListeners.add(listener);
  listeners.set(topic, topicListeners);

  return () => {
    topicListeners.delete(listener);
    if (topicListeners.size === 0) listeners.delete(topic);
  };
}

export function getRepositoryRevision(topic: string): number {
  return revisions.get(topic) ?? 0;
}

export function publishRepositoryChange(topic: string): void {
  revisions.set(topic, getRepositoryRevision(topic) + 1);
  listeners.get(topic)?.forEach((listener) => listener());
}
