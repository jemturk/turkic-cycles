import { SvgXml } from "react-native-svg";

import { Text } from "@/components/Text";
import { REACTION_ART } from "@/constants/reactionArt";

// A reaction drawn from the app's own emoji set (Fluent Flat), the same on every
// platform. Anything outside the set falls back to the system's emoji font.
export function ReactionEmoji({ emoji, size }: { emoji: string; size: number }) {
  const art = REACTION_ART[emoji];
  if (art) return <SvgXml xml={art} width={size} height={size} accessibilityLabel={emoji} />;
  return <Text style={{ fontSize: size * 0.8, lineHeight: size, width: size, textAlign: "center" }}>{emoji}</Text>;
}
