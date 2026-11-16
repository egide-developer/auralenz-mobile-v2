// Reels tab — the standalone, always-on vertical video feed (no seed post),
// using the same engine as the post-triggered reels viewer in app/reels/[postId].tsx.
// The feed leaves room for the floating dock and keeps an exit arrow above it.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ReelsFeed } from "../../src/components/reels/ReelsFeed";

export default function ReelsTabScreen() {
  const insets = useSafeAreaInsets();
  return <ReelsFeed insets={insets} onBack={() => router.replace("/")} />;
}
