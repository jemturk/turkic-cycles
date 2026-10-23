// Splits message text into plain text and the emoji the app draws itself (EMOJI_ART),
// for MessageText. An emoji is only drawn when it stands alone: with a skin tone, or
// joined into a sequence (👨‍👩‍👧, 🤦‍♀️), it stays text, so the system draws the whole thing.
export type Token = { kind: "text"; text: string } | { kind: "emoji"; emoji: string; text: string };

const VARIATION_SELECTOR = 0xfe0f;
const ZWJ = 0x200d;
const isSkinTone = (cp: number) => cp >= 0x1f3fb && cp <= 0x1f3ff;

export function tokenize(text: string, known: Record<string, unknown>): Token[] {
  const chars = Array.from(text);
  const tokens: Token[] = [];
  let plain = "";
  const flush = () => {
    if (plain) tokens.push({ kind: "text", text: plain });
    plain = "";
  };

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!(char in known)) {
      plain += char;
      continue;
    }
    // Take its variation selector along; then see what follows.
    let raw = char;
    let j = i + 1;
    if (chars[j]?.codePointAt(0) === VARIATION_SELECTOR) raw += chars[j++];
    const next = chars[j]?.codePointAt(0);
    if (next !== undefined && (isSkinTone(next) || next === ZWJ)) {
      // Part of something bigger: keep the whole sequence as text.
      raw += chars[j++];
      while (j < chars.length) {
        const cp = chars[j].codePointAt(0) as number;
        const prev = chars[j - 1].codePointAt(0);
        if (prev === ZWJ || cp === ZWJ || cp === VARIATION_SELECTOR || isSkinTone(cp)) raw += chars[j++];
        else break;
      }
      plain += raw;
      i = j - 1;
      continue;
    }
    flush();
    tokens.push({ kind: "emoji", emoji: char, text: raw });
    i = j - 1;
  }
  flush();
  return tokens;
}

// A message of nothing but a few emoji (whitespace aside) is shown big.
export function isEmojiOnly(tokens: Token[], max = 3): boolean {
  const emoji = tokens.filter((t) => t.kind === "emoji").length;
  return emoji > 0 && emoji <= max && tokens.every((t) => t.kind === "emoji" || t.text.trim() === "");
}
