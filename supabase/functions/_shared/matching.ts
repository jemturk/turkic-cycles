// The matching model v1 (Turkic Circles Matching Model v1 spec): hard filters per
// connection type, nine criterion scores, the viewer's weights, and the mutual match
// (geometric mean of both directions). Plain TypeScript with no Deno or app imports, so
// both the rank-discover Edge Function and the app's Jest tests can use it; the spec's
// worked example is a test (src/lib/matchingScore.test.ts).
//
// Decisions taken on top of the spec (Oct 2026):
//   * empty heritage is skipped (no score), like any empty field;
//   * spiritual_mentor is scored with Mentor's weights minus professional fit;
//   * a member who self-describes their gender chooses who they're shown to (shownTo);
//   * reasons never name a country ("Shared heritage" only).

export type AppType = "friend" | "romantic" | "business" | "business_mentor" | "academic_mentor" | "spiritual_mentor";
export type MentorType = "business_mentor" | "academic_mentor" | "spiritual_mentor";
type Kind = "friend" | "romantic" | "mentor" | "business";

export const CRITERIA = [
  "interests",
  "circles",
  "values",
  "heritage",
  "life_stage",
  "proximity",
  "format_availability",
  "goals",
  "professional",
] as const;
export type Criterion = (typeof CRITERIA)[number];

export type LocationPref = "anywhere" | "same_country" | "same_state" | "nearby";
type GenderGroup = "women" | "men";

export type MatchingConfig = {
  model_version: string;
  weights: Record<Kind, Record<Criterion, number>>;
  boosts: { very: number; less: number; max_very: number; max_less: number; max_share: number };
  thresholds: { min_match: number; strong_match: number; min_coverage: number; worth_a_look: number };
  params: {
    interests_full: number;
    circles_full: number;
    goals_full: number;
    age_span_friend: number;
    age_span_romantic: number;
    default_distance_mi: { friend: number; romantic: number; nearby: number };
    heritage: { shared: number; both_unshared: number; otherwise: number };
    mentor_min_gap_years: number;
    experience_gap: { full: [number, number]; half: [number, number][] };
    professional: { mentor: { coverage: number; experience: number }; business: { coverage: number; industry: number } };
    format_availability: { format: number; availability: number };
  };
  values_questions: Record<Kind, number[]>;
  goal_pairs: [string, string][];
};

// Mirrors matching_config version 1.0.0 (migration 0054); the live config comes from the
// database, this is the fallback and what the tests use.
export const DEFAULT_CONFIG: MatchingConfig = {
  model_version: "1.0.0",
  weights: {
    friend: { interests: 25, circles: 10, values: 15, heritage: 10, life_stage: 10, proximity: 15, format_availability: 10, goals: 5, professional: 0 },
    romantic: { interests: 15, circles: 5, values: 25, heritage: 15, life_stage: 15, proximity: 15, format_availability: 5, goals: 5, professional: 0 },
    mentor: { interests: 5, circles: 5, values: 5, heritage: 5, life_stage: 0, proximity: 0, format_availability: 20, goals: 20, professional: 40 },
    business: { interests: 5, circles: 5, values: 10, heritage: 5, life_stage: 0, proximity: 0, format_availability: 20, goals: 25, professional: 30 },
  },
  boosts: { very: 1.5, less: 0.5, max_very: 3, max_less: 2, max_share: 0.4 },
  thresholds: { min_match: 0.55, strong_match: 0.75, min_coverage: 0.7, worth_a_look: 0.45 },
  params: {
    interests_full: 3,
    circles_full: 2,
    goals_full: 2,
    age_span_friend: 15,
    age_span_romantic: 10,
    default_distance_mi: { friend: 30, romantic: 100, nearby: 30 },
    heritage: { shared: 1, both_unshared: 0.6, otherwise: 0.3 },
    mentor_min_gap_years: 3,
    experience_gap: { full: [5, 15], half: [[3, 4], [16, 25]] },
    professional: { mentor: { coverage: 0.6, experience: 0.4 }, business: { coverage: 0.7, industry: 0.3 } },
    format_availability: { format: 0.5, availability: 0.5 },
  },
  values_questions: { friend: [1, 2, 3, 4, 5], romantic: [1, 2, 3, 4, 5], mentor: [3, 4], business: [3, 4] },
  goal_pairs: [
    ["find_investors", "invest_in_ventures"],
    ["find_clients", "offer_services"],
  ],
};

export type MentorSide = {
  role: "seeking" | "offering";
  yearsExperience: number | null;
  // What they offer when offering, what they're after when seeking.
  expertise: string[];
  goals: string[];
  locationPref: LocationPref | null;
};

export type Member = {
  id: string;
  age: number | null;
  interests: string[];
  circles: string[];
  heritage: string[];
  values: Partial<Record<number, number>>; // question 1-5 -> answer 1-5; absent = skipped
  location: { latitude: number; longitude: number } | null;
  country: string | null;
  state: string | null;
  maxDistanceMi: number | null;
  meetingFormat: "in_person" | "virtual" | "either" | null;
  availability: string[];
  goals: Partial<Record<"friend" | "romantic" | "business", string[]>>;
  romantic: { gender: "woman" | "man" | "self_describe" | null; interestedIn: GenderGroup[]; shownTo: GenderGroup[] } | null;
  business: { industry: string | null; expertiseOffered: string[]; expertiseSought: string[]; locationPref: LocationPref | null } | null;
  mentors: Partial<Record<MentorType, MentorSide>>;
  boosts: Partial<Record<AppType, Partial<Record<Criterion, "very" | "less">>>>;
};

export type Reason = { criterion: Criterion; count?: number; miles?: number };
export type PairMatch = {
  appType: AppType;
  // null: passes the hard filters, but too little is known to score (min_coverage).
  score: number | null;
  strong: boolean;
  reasons: Reason[];
  // What went into the score, for the suggestion log (stage 6).
  detail?: {
    viewerScore: number;
    otherScore: number;
    criteria: Partial<Record<Criterion, number>>;
    weights: Partial<Record<Criterion, number>>;
  };
};

const APP_TYPES: AppType[] = ["friend", "romantic", "business", "business_mentor", "academic_mentor", "spiritual_mentor"];

// A member's saved boosts (matching_preferences.boosts), kept to what the model allows:
// known types and criteria that type actually weighs, at most max_very "very" and
// max_less "less" each, and no "very" on Mentor's professional fit (it already starts at
// the 40% cap, so it would do nothing).
export function sanitizeBoosts(raw: unknown, cfg: MatchingConfig): Member["boosts"] {
  const out: Member["boosts"] = {};
  if (!raw || typeof raw !== "object") return out;
  for (const type of APP_TYPES) {
    const entries = (raw as Record<string, unknown>)[type];
    if (!entries || typeof entries !== "object") continue;
    const weights = baseWeights(type, cfg);
    let very = 0;
    let less = 0;
    const kept: Partial<Record<Criterion, "very" | "less">> = {};
    for (const [criterion, level] of Object.entries(entries as Record<string, unknown>)) {
      if (!(CRITERIA as readonly string[]).includes(criterion) || !(weights[criterion as Criterion] > 0)) continue;
      if (level === "very" && very < cfg.boosts.max_very && !(kindOf(type) === "mentor" && criterion === "professional")) {
        kept[criterion as Criterion] = "very";
        very += 1;
      } else if (level === "less" && less < cfg.boosts.max_less) {
        kept[criterion as Criterion] = "less";
        less += 1;
      }
    }
    if (Object.keys(kept).length) out[type] = kept;
  }
  return out;
}

// The criteria a member can boost for one type, in display order.
export function boostableCriteria(type: AppType, cfg: MatchingConfig): Criterion[] {
  const weights = baseWeights(type, cfg);
  return CRITERIA.filter((c) => weights[c] > 0);
}

const kindOf = (type: AppType): Kind =>
  type === "friend" || type === "romantic" || type === "business" ? type : "mentor";

export function milesBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const shared = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;

function baseWeights(type: AppType, cfg: MatchingConfig): Record<Criterion, number> {
  const weights = { ...cfg.weights[kindOf(type)] };
  if (type === "spiritual_mentor") weights.professional = 0;
  return weights;
}

// Caps every share at `max`, spreading what's taken off over the uncapped ones in
// proportion, until none is over.
export function applyCap(weights: Partial<Record<Criterion, number>>, max: number) {
  const w = { ...weights };
  const capped = new Set<string>();
  for (let round = 0; round < CRITERIA.length; round++) {
    const over = Object.entries(w).filter(([c, v]) => !capped.has(c) && (v ?? 0) > max + 1e-12);
    if (over.length === 0) break;
    let excess = 0;
    for (const [c, v] of over) {
      excess += (v ?? 0) - max;
      w[c as Criterion] = max;
      capped.add(c);
    }
    const free = Object.entries(w).filter(([c]) => !capped.has(c));
    const freeTotal = free.reduce((sum, [, v]) => sum + (v ?? 0), 0);
    if (freeTotal <= 0) break;
    for (const [c, v] of free) w[c as Criterion] = (v ?? 0) + (excess * (v ?? 0)) / freeTotal;
  }
  return w;
}

// The viewer's weights for one type: base weights above 0, their boosts (x1.5 / x0.5),
// renormalized to sum to 1, then capped.
export function effectiveWeights(viewer: Member, type: AppType, cfg: MatchingConfig) {
  const w: Partial<Record<Criterion, number>> = {};
  for (const [c, v] of Object.entries(baseWeights(type, cfg))) if (v > 0) w[c as Criterion] = v;
  for (const [c, level] of Object.entries(viewer.boosts[type] ?? {})) {
    if (w[c as Criterion] !== undefined && level) w[c as Criterion]! *= cfg.boosts[level];
  }
  const total = Object.values(w).reduce((sum, v) => sum + (v ?? 0), 0);
  for (const c of Object.keys(w)) w[c as Criterion]! /= total;
  return applyCap(w, cfg.boosts.max_share);
}

function goalsFor(member: Member, type: AppType): string[] {
  if (type === "friend" || type === "romantic" || type === "business") return member.goals[type] ?? [];
  return member.mentors[type]?.goals ?? [];
}

function sharedGoals(a: string[], b: string[], pairs: [string, string][]) {
  let count = shared(a, b);
  for (const [x, y] of pairs) {
    if ((a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))) count += 1;
  }
  return count;
}

const coverage = (sought: string[], offered: string[]) =>
  sought.length === 0 || offered.length === 0 ? null : shared(sought, offered) / sought.length;

function experienceGapScore(gap: number, cfg: MatchingConfig) {
  const { full, half } = cfg.params.experience_gap;
  if (gap >= full[0] && gap <= full[1]) return 1;
  return half.some(([lo, hi]) => gap >= lo && gap <= hi) ? 0.5 : 0;
}

// Weighted mean of the parts that could be computed (null when none could).
function blend(parts: [number | null, number][]) {
  const known = parts.filter(([value]) => value !== null) as [number, number][];
  const weight = known.reduce((sum, [, w]) => sum + w, 0);
  return weight === 0 ? null : known.reduce((sum, [value, w]) => sum + value * w, 0) / weight;
}

// One criterion's 0-1 score for how well `other` fits `viewer`, or null when either
// side is missing the data (skipped, and the rest renormalized).
export function similarity(criterion: Criterion, viewer: Member, other: Member, type: AppType, cfg: MatchingConfig): number | null {
  const p = cfg.params;
  const kind = kindOf(type);
  switch (criterion) {
    case "interests":
      if (!viewer.interests.length || !other.interests.length) return null;
      return Math.min(1, shared(viewer.interests, other.interests) / p.interests_full);
    case "circles":
      if (!viewer.circles.length || !other.circles.length) return null;
      return Math.min(1, shared(viewer.circles, other.circles) / p.circles_full);
    case "values": {
      const diffs = cfg.values_questions[kind]
        .filter((q) => viewer.values[q] && other.values[q])
        .map((q) => Math.abs(viewer.values[q]! - other.values[q]!));
      return diffs.length ? 1 - diffs.reduce((s, d) => s + d, 0) / diffs.length / 4 : null;
    }
    case "heritage":
      if (!viewer.heritage.length || !other.heritage.length) return null;
      return shared(viewer.heritage, other.heritage) > 0 ? p.heritage.shared : p.heritage.both_unshared;
    case "life_stage": {
      if (viewer.age === null || other.age === null) return null;
      const span = kind === "romantic" ? p.age_span_romantic : p.age_span_friend;
      return Math.max(0, 1 - Math.abs(viewer.age - other.age) / span);
    }
    case "proximity": {
      if (!viewer.location || !other.location) return null;
      const radius = viewer.maxDistanceMi ?? (kind === "romantic" ? p.default_distance_mi.romantic : p.default_distance_mi.friend);
      return Math.max(0, 1 - milesBetween(viewer.location, other.location) / radius);
    }
    case "format_availability": {
      if (!viewer.meetingFormat || !other.meetingFormat) return null;
      const format =
        viewer.meetingFormat === other.meetingFormat || viewer.meetingFormat === "either" || other.meetingFormat === "either" ? 1 : 0;
      const availability =
        viewer.availability.length && other.availability.length ? (shared(viewer.availability, other.availability) > 0 ? 1 : 0) : null;
      return blend([
        [format, p.format_availability.format],
        [availability, p.format_availability.availability],
      ]);
    }
    case "goals": {
      const a = goalsFor(viewer, type);
      const b = goalsFor(other, type);
      if (!a.length || !b.length) return null;
      return Math.min(1, sharedGoals(a, b, cfg.goal_pairs) / p.goals_full);
    }
    case "professional": {
      if (type === "business") {
        if (!viewer.business || !other.business) return null;
        const mutual = blend([
          [coverage(other.business.expertiseSought, viewer.business.expertiseOffered), 1],
          [coverage(viewer.business.expertiseSought, other.business.expertiseOffered), 1],
        ]);
        const industry =
          viewer.business.industry && other.business.industry ? (viewer.business.industry === other.business.industry ? 1 : 0) : null;
        return blend([
          [mutual, p.professional.business.coverage],
          [industry, p.professional.business.industry],
        ]);
      }
      if (kind !== "mentor" || type === "spiritual_mentor") return null;
      const sides = [viewer.mentors[type as MentorType], other.mentors[type as MentorType]];
      const mentee = sides.find((s) => s?.role === "seeking");
      const mentor = sides.find((s) => s?.role === "offering");
      if (!mentee || !mentor) return null;
      const gap =
        mentor.yearsExperience !== null && mentee.yearsExperience !== null
          ? experienceGapScore(mentor.yearsExperience - mentee.yearsExperience, cfg)
          : null;
      return blend([
        [coverage(mentee.expertise, mentor.expertise), p.professional.mentor.coverage],
        [gap, p.professional.mentor.experience],
      ]);
    }
  }
}

function genderGroup(gender: "woman" | "man" | "self_describe" | null): GenderGroup | null {
  return gender === "woman" ? "women" : gender === "man" ? "men" : null;
}

// Whether `x` wants to see `y` in Romantic: by y's gender group, or -- when y
// self-describes -- by whom y chose to be shown to.
function wantsToSee(x: Member, y: Member) {
  const xr = x.romantic;
  const yr = y.romantic;
  if (!xr || !yr || !xr.gender || !yr.gender) return false;
  const yGroup = genderGroup(yr.gender);
  if (yGroup) return xr.interestedIn.includes(yGroup);
  const xGroup = genderGroup(xr.gender);
  return xGroup !== null && yr.shownTo.includes(xGroup);
}

function locationPrefOk(pref: LocationPref | null, self: Member, other: Member, cfg: MatchingConfig) {
  switch (pref ?? "anywhere") {
    case "anywhere":
      return true;
    case "same_country":
      return !!self.country && self.country === other.country;
    case "same_state":
      return !!self.country && self.country === other.country && !!self.state && self.state === other.state;
    case "nearby":
      if (!self.location || !other.location) return true; // can't tell yet: don't hide them
      return milesBetween(self.location, other.location) <= (self.maxDistanceMi ?? cfg.params.default_distance_mi.nearby);
  }
}

// The type-specific hard filters, in both directions. The ones every type shares
// (blocks, reports, shared language, age and distance) run in the database first.
export function passesTypeFilters(a: Member, b: Member, type: AppType, cfg: MatchingConfig) {
  switch (type) {
    case "friend":
      return true;
    case "romantic":
      return wantsToSee(a, b) && wantsToSee(b, a);
    case "business":
      return locationPrefOk(a.business?.locationPref ?? null, a, b, cfg) && locationPrefOk(b.business?.locationPref ?? null, b, a, cfg);
    default: {
      const sa = a.mentors[type];
      const sb = b.mentors[type];
      // Never two mentees or two mentors.
      if (!sa || !sb || sa.role === sb.role) return false;
      const mentor = sa.role === "offering" ? sa : sb;
      const mentee = sa.role === "offering" ? sb : sa;
      if (
        type !== "spiritual_mentor" &&
        mentor.yearsExperience !== null &&
        mentee.yearsExperience !== null &&
        mentor.yearsExperience < mentee.yearsExperience + cfg.params.mentor_min_gap_years
      ) {
        return false;
      }
      return locationPrefOk(sa.locationPref, a, b, cfg) && locationPrefOk(sb.locationPref, b, a, cfg);
    }
  }
}

// How well `other` fits `viewer` for one type: the weighted mean over the criteria
// that could be computed, or null if they cover less than min_coverage of the weight.
export function directionalScore(viewer: Member, other: Member, type: AppType, cfg: MatchingConfig) {
  const weights = effectiveWeights(viewer, type, cfg);
  let sum = 0;
  let used = 0;
  const contributions: { criterion: Criterion; value: number; score: number }[] = [];
  for (const [criterion, weight] of Object.entries(weights) as [Criterion, number][]) {
    const s = similarity(criterion, viewer, other, type, cfg);
    if (s === null) continue;
    sum += weight * s;
    used += weight;
    contributions.push({ criterion, value: weight * s, score: s });
  }
  return { score: used < cfg.thresholds.min_coverage - 1e-9 ? null : sum / used, contributions, sum, used, weights };
}

function reasonFor(criterion: Criterion, viewer: Member, other: Member, type: AppType): Reason {
  switch (criterion) {
    case "interests":
      return { criterion, count: shared(viewer.interests, other.interests) };
    case "circles":
      return { criterion, count: shared(viewer.circles, other.circles) };
    case "goals":
      return { criterion, count: shared(goalsFor(viewer, type), goalsFor(other, type)) };
    case "proximity":
      return { criterion, miles: viewer.location && other.location ? Math.round(milesBetween(viewer.location, other.location)) : undefined };
    default:
      return { criterion };
  }
}

// The mutual match for one type, or null when a hard filter fails.
export function matchForType(a: Member, b: Member, type: AppType, cfg: MatchingConfig): PairMatch | null {
  if (!passesTypeFilters(a, b, type, cfg)) return null;
  const ab = directionalScore(a, b, type, cfg);
  const ba = directionalScore(b, a, type, cfg);
  if (ab.score === null || ba.score === null) return { appType: type, score: null, strong: false, reasons: [] };
  const score = Math.sqrt(ab.score * ba.score);
  // The top reasons for the viewer (a): highest weight x score, among criteria that fit.
  const reasons = ab.contributions
    .filter((c) => c.score >= 0.5)
    .sort((x, y) => y.value - x.value)
    .slice(0, 3)
    .map((c) => reasonFor(c.criterion, a, b, type));
  return {
    appType: type,
    score,
    strong: score >= cfg.thresholds.strong_match,
    reasons,
    detail: {
      viewerScore: ab.score,
      otherScore: ba.score,
      criteria: Object.fromEntries(ab.contributions.map((c) => [c.criterion, c.score])),
      weights: ab.weights,
    },
  };
}

// The best match over the types both chose; null when every one fails a hard filter.
export function bestMatch(a: Member, b: Member, types: AppType[], cfg: MatchingConfig): PairMatch | null {
  let best: PairMatch | null = null;
  for (const type of types) {
    const m = matchForType(a, b, type, cfg);
    if (!m) continue;
    if (!best || (m.score ?? -1) > (best.score ?? -1)) best = m;
  }
  return best;
}
