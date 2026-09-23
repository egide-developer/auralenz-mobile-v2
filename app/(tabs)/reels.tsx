// Reels tab — the standalone, always-on vertical video feed (no seed post),
// using the same engine as the post-triggered reels viewer in app/reels/[postId].tsx.
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReelsFeed } from "../../src/components/reels/ReelsFeed";

export default function ReelsTabScreen() {
  const insets = useSafeAreaInsets();
  return <ReelsFeed insets={insets} />;
}
