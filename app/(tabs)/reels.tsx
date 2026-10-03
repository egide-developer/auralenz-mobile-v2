// Reels tab — the standalone, always-on vertical video feed (no seed post),
// using the same engine as the post-triggered reels viewer in app/reels/[postId].tsx.
// The immersive feed hides the floating dock (BottomNav returns null on /reels),
// so this tab passes its own onBack to hand the user a working exit arrow.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ReelsFeed } from "../../src/components/reels/ReelsFeed";

export default function ReelsTabScreen() {
  const insets = useSafeAreaInsets();
  return <ReelsFeed insets={insets} onBack={() => router.replace("/")} />;
}
