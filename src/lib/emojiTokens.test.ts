import { isEmojiOnly, tokenize } from "./emojiTokens";

const known = { "😂": 1, "❤": 1, "👍": 1, "🤦": 1, "🎉": 1 };

describe("tokenize", () => {
  it("splits text and known emoji, keeping the rest as text", () => {
    expect(tokenize("Hi 😂 there 🐱!", known)).toEqual([
      { kind: "text", text: "Hi " },
      { kind: "emoji", emoji: "😂", text: "😂" },
      { kind: "text", text: " there 🐱!" },
    ]);
  });

  it("takes the variation selector along", () => {
    expect(tokenize("❤️", known)).toEqual([{ kind: "emoji", emoji: "❤", text: "❤️" }]);
  });

  it("leaves skin tones and joined sequences to the system", () => {
    expect(tokenize("👍🏽 ok", known)).toEqual([{ kind: "text", text: "👍🏽 ok" }]);
    expect(tokenize("🤦‍♀️🎉", known)).toEqual([
      { kind: "text", text: "🤦‍♀️" },
      { kind: "emoji", emoji: "🎉", text: "🎉" },
    ]);
  });
});

describe("isEmojiOnly", () => {
  it("is true for one to three emoji and whitespace only", () => {
    expect(isEmojiOnly(tokenize("😂", known))).toBe(true);
    expect(isEmojiOnly(tokenize("😂 ❤️ 👍", known))).toBe(true);
    expect(isEmojiOnly(tokenize("😂😂😂😂", known))).toBe(false);
    expect(isEmojiOnly(tokenize("ha 😂", known))).toBe(false);
    expect(isEmojiOnly(tokenize("🐱", known))).toBe(false);
  });
});
