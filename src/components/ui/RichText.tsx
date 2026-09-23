import { Text } from "react-native";
import { router } from "expo-router";

const TOKEN_REGEX = /(@[a-zA-Z0-9_.]{3,30}|#[a-zA-Z0-9_]{2,50})/g;

// Splits caption/comment text into plain segments plus tappable @mention
// and #hashtag spans. Returns a node array (not wrapped in its own <Text>)
// so callers can embed it inline alongside other spans, e.g. a bolded
// username prefix on a post caption.
export function renderRichText(
  text: string | undefined | null,
  linkColor: string,
  keyPrefix = "rt",
): React.ReactNode[] {
  if (!text) return [];
  return text
    .split(TOKEN_REGEX)
    .filter((part) => part.length > 0)
    .map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Text
            key={`${keyPrefix}-${i}`}
            style={{ color: linkColor, fontWeight: "600" }}
            onPress={() => router.push(`/profile/${username}`)}
          >
            {part}
          </Text>
        );
      }
      if (part.startsWith("#")) {
        const tag = part.slice(1);
        return (
          <Text
            key={`${keyPrefix}-${i}`}
            style={{ color: linkColor, fontWeight: "600" }}
            onPress={() => router.push(`/tag/${tag}`)}
          >
            {part}
          </Text>
        );
      }
      return part;
    });
}

export function RichText({
  text,
  style,
  linkColor,
}: {
  text: string | undefined | null;
  style?: any;
  linkColor: string;
}) {
  return <Text style={style}>{renderRichText(text, linkColor)}</Text>;
}
