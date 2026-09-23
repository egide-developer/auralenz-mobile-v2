// Thin route wrapper around the shared ReelsFeed engine (src/components/reels/ReelsFeed.tsx),
// used when opening reels from a specific video post (feed, profile grid, search).
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReelsFeed } from "../../src/components/reels/ReelsFeed";
import type { Post } from "../../src/types";

export default function ReelsScreen() {
  const { postId, initialPost: initialPostParam } = useLocalSearchParams<{
    postId: string;
    initialPost?: string;
  }>();
  const insets = useSafeAreaInsets();

  const parsedInitial: Post | null = (() => {
    if (!initialPostParam) return null;
    try {
      return JSON.parse(initialPostParam);
    } catch {
      return null;
    }
  })();

  return (
    <ReelsFeed
      initialPost={parsedInitial}
      startAtPostId={postId}
      onBack={() => router.back()}
      insets={insets}
    />
  );
}
