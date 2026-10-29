// Discover's roll of people (DiscoverDeck): pure, so it can be tested apart from the
// gestures and animation.

// The roll: everyone in viewing order, and which of them is in front. Skipped people
// stay on it, so dragging down walks back through them; when the roll runs out,
// everyone skipped is added again after it (a new lap), so they come round again.
// `resync`: the roll changed without the gesture (a jump, people leaving), so the
// animation's base has to be moved to match; `fade`: the person in front left.
export type Roll = { ids: string[]; pos: number; resync?: boolean; fade?: boolean };

// The people skipped before `pos`, in the order they'd come round again, minus the
// one in front.
export function nextLap(ids: string[], pos: number): string[] {
  const seen = new Set<string>([ids[pos]]);
  const lap: string[] = [];
  for (const id of ids.slice(0, pos)) {
    if (!seen.has(id)) {
      seen.add(id);
      lap.push(id);
    }
  }
  return lap;
}

// Moves along the roll, adding the next lap when the end comes into reach.
export function moveTo(roll: Roll, pos: number): Roll {
  // The lap is counted from whoever will really be in front (pos can point past the end).
  const front = Math.min(pos, roll.ids.length - 1);
  const ids = pos >= roll.ids.length - 1 ? [...roll.ids, ...nextLap(roll.ids, front)] : roll.ids;
  return { ids, pos: Math.max(0, Math.min(pos, ids.length - 1)) };
}

// Best match first (byMatch's order), people without a score after them in the order
// they came. Stable, so equal scores keep their order too.
export function byMatch<T extends { match?: { score: number | null } }>(people: T[]): T[] {
  return [...people].sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1));
}

// The roll after the candidate list changed: who left is taken off (keeping the person
// in front, or the next one if they left). Everyone already seen stays where they are;
// everyone not seen yet -- those ahead and the newcomers -- is put in the candidates'
// order (the deck passes them best match first), so a strong newcomer comes up next
// rather than at the end. Skipped people coming round again (a lap) stay after them.
export function reconcile(current: Roll, candidates: { userId: string }[]): Roll {
  const present = new Set(candidates.map((c) => c.userId));
  const kept: string[] = [];
  let pos = current.pos;
  current.ids.forEach((id, i) => {
    if (present.has(id)) kept.push(id);
    else if (i < current.pos) pos -= 1;
  });
  const fade = current.ids.length > 0 && !present.has(current.ids[current.pos]);
  // Seen: everyone up to the person in front, and them too unless they just left (then
  // whoever comes forward is picked by the new order).
  const seenCount = kept.length === 0 ? 0 : fade ? pos : pos + 1;
  const seenIds = kept.slice(0, seenCount);
  const seen = new Set(seenIds);
  const lap = kept.slice(seenCount).filter((id) => seen.has(id));
  const unseen = candidates.map((c) => c.userId).filter((id) => !seen.has(id));
  const ids = [...seenIds, ...unseen, ...lap];
  return { ...moveTo({ ids, pos }, pos), resync: true, fade };
}
