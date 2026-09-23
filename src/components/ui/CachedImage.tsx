// Drop-in replacement for RN's <Image> backed by expo-image's memory+disk
// cache, so scrolling back to a post/avatar/story thumbnail already seen
// this session (or a previous one) never re-downloads it. Centralized here
// so cache policy/transition tuning happens in one place, not per call site.
import { Image, ImageProps, ImageStyle } from "expo-image";
import { StyleProp } from "react-native";

export interface CachedImageProps extends Omit<ImageProps, "style"> {
  style?: StyleProp<ImageStyle>;
}

export function CachedImage({ style, ...props }: CachedImageProps) {
  return (
    <Image
      style={style}
      cachePolicy="memory-disk"
      transition={150}
      {...props}
    />
  );
}

export default CachedImage;
