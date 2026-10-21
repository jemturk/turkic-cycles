import AsyncStorage from "@react-native-async-storage/async-storage";

// People skipped in Discover (swiped up), remembered on this device for a day so a
// fresh visit doesn't bring them straight back: DiscoverDeck puts them at the back of
// the line instead of hiding them, so Discover never runs dry because of skips.
// Nothing is sent anywhere -- a skip records nothing on the server.
const KEY = "discover.skippedAt";
export const SKIP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type SkippedAt = Record<string, number>;

async function read(): Promise<SkippedAt> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as SkippedAt) : {};
  } catch {
    return {};
  }
}

// Who is still cooling down, dropping (and forgetting) anyone whose day is up.
export async function loadRecentlySkipped(now = Date.now()): Promise<Set<string>> {
  const all = await read();
  const recent = recentOnly(all, now);
  if (Object.keys(recent).length !== Object.keys(all).length) {
    await AsyncStorage.setItem(KEY, JSON.stringify(recent)).catch(() => {});
  }
  return new Set(Object.keys(recent));
}

export async function rememberSkip(userId: string, now = Date.now()) {
  const recent = recentOnly(await read(), now);
  recent[userId] = now;
  await AsyncStorage.setItem(KEY, JSON.stringify(recent)).catch(() => {});
}

export function recentOnly(all: SkippedAt, now: number): SkippedAt {
  return Object.fromEntries(
    Object.entries(all).filter(([, at]) => typeof at === "number" && now - at < SKIP_COOLDOWN_MS)
  );
}

// The deck's order: people not recently skipped first, then the recently skipped.
export function skippedLast<T extends { userId: string }>(people: T[], recentlySkipped: ReadonlySet<string>): T[] {
  return [...people.filter((p) => !recentlySkipped.has(p.userId)), ...people.filter((p) => recentlySkipped.has(p.userId))];
}
