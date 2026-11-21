import { Text, type StyleProp, type TextStyle } from "react-native";

interface HighlightedTextProps {
  text: string;
  query?: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** Renders `text` with the first case-insensitive occurrence of `query` emphasised. */
export function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: HighlightedTextProps) {
  const needle = query?.trim().toLowerCase();
  const index = needle ? text.toLowerCase().indexOf(needle) : -1;

  if (!needle || index < 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {text.slice(0, index)}
      <Text style={highlightStyle}>
        {text.slice(index, index + needle.length)}
      </Text>
      {text.slice(index + needle.length)}
    </Text>
  );
}

export default HighlightedText;
