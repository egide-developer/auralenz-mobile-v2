import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getRepositoryRevision,
  subscribeToRepository,
} from "../repositories/changes";

export interface RepositoryQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useRepositoryQuery<T>(
  topic: string,
  load: () => Promise<T>,
  cacheKey = topic,
): RepositoryQueryResult<T> {
  const subscribe = useCallback(
    (listener: () => void) => subscribeToRepository(topic, listener),
    [topic],
  );
  const getSnapshot = useCallback(
    () => getRepositoryRevision(topic),
    [topic],
  );
  const revision = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [state, setState] = useState<{
    topic: string;
    cacheKey: string;
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
  }>({ topic, cacheKey, data: undefined, isLoading: true, error: null });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const previousState = stateRef.current;
    const previousData =
      previousState.topic === topic && previousState.cacheKey === cacheKey
        ? previousState.data
        : undefined;
    const pendingState = {
      topic,
      cacheKey,
      data: previousData,
      isLoading: previousData === undefined,
      error: null,
    };
    let active = true;
    stateRef.current = pendingState;
    setState(pendingState);

    load()
      .then((data) => {
        if (!active) return;
        const nextState = { topic, cacheKey, data, isLoading: false, error: null };
        stateRef.current = nextState;
        setState(nextState);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const error =
          cause instanceof Error ? cause : new Error(String(cause));
        const current = stateRef.current;
        const nextState = {
          topic,
          cacheKey,
          data:
            current.topic === topic && current.cacheKey === cacheKey
              ? current.data
              : undefined,
          isLoading: false,
          error,
        };
        stateRef.current = nextState;
        setState(nextState);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, load, refreshVersion, revision, topic]);

  const refresh = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return {
    data:
      state.topic === topic && state.cacheKey === cacheKey
        ? state.data
        : undefined,
    isLoading:
      state.topic === topic && state.cacheKey === cacheKey
        ? state.isLoading
        : true,
    error:
      state.topic === topic && state.cacheKey === cacheKey
        ? state.error
        : null,
    refresh,
  };
}
