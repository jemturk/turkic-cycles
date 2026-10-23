import { useMemo } from "react";
import { Platform, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { Text } from "@/components/Text";
import { EMOJI_ART } from "@/constants/emojiArt";
import { useTextScale } from "@/hooks/useTextScale";
import { isEmojiOnly, tokenize } from "@/lib/emojiTokens";

// Text.tsx's rem base (text-base), so an emoji sits at the size of the words beside it.
const BASE_FONT = Platform.OS === "web" ? 16 : 14;

// A chat message's text with the common emoji drawn from the app's own set (Fluent
// Flat, EMOJI_ART), the same on every platform; anything else stays the system's.
// A message of one to three emoji only is shown big, as in most chat apps.
export function MessageText({ body, color }: { body: string; color: string }) {
  const scale = useTextScale();
  const tokens = useMemo(() => tokenize(body, EMOJI_ART), [body]);
  const big = isEmojiOnly(tokens);
  const size = Math.round(BASE_FONT * scale * (big ? 2.4 : 1.25));

  if (big) {
    return (
      <View style={{ flexDirection: "row", gap: 4 }} accessible accessibilityLabel={body}>
        {tokens
          .filter((t) => t.kind === "emoji")
          .map((t, i) => (
            <SvgXml key={i} xml={EMOJI_ART[t.emoji]} width={size} height={size} />
          ))}
      </View>
    );
  }

  return (
    <Text className="text-base" style={{ color }}>
      {tokens.map((t, i) =>
        t.kind === "text" ? (
          t.text
        ) : (
          // Inline in the line of text; nudged down so it sits on the baseline like a glyph.
          <View
            key={i}
            accessible
            accessibilityLabel={t.text}
            style={{ width: size, height: size, transform: [{ translateY: Math.round(size * 0.2) }] }}
          >
            <SvgXml xml={EMOJI_ART[t.emoji]} width={size} height={size} />
          </View>
        )
      )}
    </Text>
  );
}
