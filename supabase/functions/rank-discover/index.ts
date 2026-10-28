// Discover's ranking (matching model v1, stage 4). Called by the app with the member's
// own session: it asks the database for their candidates *as them* -- the same
// list_global_discover_candidates / list_circle_discover_candidates the app used, with
// every filter and RLS rule -- so it can only ever score people they may already see.
// Then, with the service role, it reads both sides' answers, scores each pair for every
// connection type they share (supabase/functions/_shared/matching.ts) and returns the
// candidates best match first, with "Strong match" and the top reasons. Nothing about
// the other person beyond those reasons leaves the server.
//
// Unscorable pairs (too little known yet) come after the scored ones instead of being
// hidden, and the minimum match score isn't enforced while matching_config says
// ranking.enforce_min_match is false (few members yet).
//
// Deploy with: supabase functions deploy rank-discover  (JWT verification on)
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  DEFAULT_CONFIG,
  bestMatch,
  type AppType,
  type MatchingConfig,
  type Member,
  type MentorType,
  type PairMatch,
} from "../_shared/matching.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MENTOR_TYPES: MentorType[] = ["business_mentor", "academic_mentor", "spiritual_mentor"];
const VALUES_ORDER = ["family", "faith", "social", "pace", "heritage"];
const POOL = 200;

type Answers = Record<string, any>;
const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);

function ageFrom(birthdate: string | null) {
  if (!birthdate) return null;
  const born = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function toMember(id: string, rows: Record<string, any>): Member {
  const profile = rows.profiles.get(id) ?? {};
  const place = rows.locations.get(id) ?? {};
  const answers: Answers = rows.answers.get(id) ?? {};
  const values: Record<number, number> = {};
  VALUES_ORDER.forEach((key, i) => {
    const v = answers.values?.[key];
    if (typeof v === "number" && v >= 1 && v <= 5) values[i + 1] = v;
  });
  const mentors: Member["mentors"] = {};
  for (const type of MENTOR_TYPES) {
    const a = answers[type];
    if (!a?.role) continue;
    mentors[type] = {
      role: a.role,
      yearsExperience: typeof a.yearsExperience === "number" ? a.yearsExperience : null,
      expertise: list(a.expertise),
      goals: list(a.goals),
      locationPref: a.locationPref ?? null,
    };
  }
  return {
    id,
    age: ageFrom(profile.birthdate ?? null),
    interests: list(profile.interests),
    circles: rows.circles.get(id) ?? [],
    heritage: rows.heritage.get(id) ?? [],
    values,
    location: place.latitude != null && place.longitude != null ? { latitude: place.latitude, longitude: place.longitude } : null,
    country: profile.country ?? null,
    state: place.state ?? null,
    maxDistanceMi: rows.maxDistance.get(id) ?? null,
    meetingFormat: profile.meeting_format ?? null,
    availability: list(profile.availability),
    goals: { friend: list(answers.friend?.goals), romantic: list(answers.romantic?.goals), business: list(answers.business?.goals) },
    romantic: answers.romantic?.gender
      ? { gender: answers.romantic.gender, interestedIn: list(answers.romantic.interestedIn) as any, shownTo: list(answers.romantic.shownTo) as any }
      : null,
    business: answers.business
      ? {
          industry: answers.business.industry ?? null,
          expertiseOffered: list(answers.business.expertiseOffered),
          expertiseSought: list(answers.business.expertiseSought),
          locationPref: answers.business.locationPref ?? null,
        }
      : null,
    mentors,
    boosts: {},
  };
}

const byUser = <T>(rows: T[] | null, key: (row: T) => string) => {
  const map = new Map<string, T>();
  for (const row of rows ?? []) map.set(key(row), row);
  return map;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "not signed in" }, 401);
    const { circleId = null, maxCount = 20 } = await req.json().catch(() => ({}));
    if (circleId !== null && typeof circleId !== "string") return json({ error: "invalid circle" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (userError || !userData.user) return json({ error: "not signed in" }, 401);
    const viewerId = userData.user.id;

    // The candidates, fetched as the member: every filter and RLS rule applies.
    const asMember = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: candidateRows, error: candidateError } = circleId
      ? await asMember.rpc("list_circle_discover_candidates", { target_circle: circleId })
      : await asMember.rpc("list_global_discover_candidates", { max_count: POOL });
    if (candidateError) throw candidateError;
    const candidateIds: string[] = (candidateRows ?? []).map((row: { user_id: string }) => row.user_id).slice(0, POOL);
    if (candidateIds.length === 0) return json({ modelVersion: null, candidates: [] });

    const ids = [viewerId, ...candidateIds];
    const [config, profiles, locations, answers, types, circles, heritage, prefs] = await Promise.all([
      admin.from("matching_config").select("config").eq("active", true).maybeSingle(),
      admin.from("profiles").select("id, birthdate, interests, meeting_format, availability, country").in("id", ids),
      admin.from("profile_locations").select("user_id, state, latitude, longitude").in("user_id", ids),
      admin.from("questionnaire_responses").select("user_id, answers").in("user_id", ids),
      admin.from("user_connection_types").select("user_id, connection_type").in("user_id", ids),
      admin.from("circle_members").select("user_id, circle_id").in("user_id", ids),
      admin.from("profile_sensitive").select("user_id, origin_countries").in("user_id", ids),
      admin.from("matching_preferences").select("user_id, max_distance_miles").in("user_id", ids),
    ]);
    const cfg: MatchingConfig = (config.data?.config as MatchingConfig) ?? DEFAULT_CONFIG;

    const group = (rows: any[] | null, value: (row: any) => string) => {
      const map = new Map<string, string[]>();
      for (const row of rows ?? []) map.set(row.user_id, [...(map.get(row.user_id) ?? []), value(row)]);
      return map;
    };
    const rows = {
      profiles: byUser(profiles.data, (r: any) => r.id),
      locations: byUser(locations.data, (r: any) => r.user_id),
      answers: new Map((answers.data ?? []).map((r: any) => [r.user_id, r.answers ?? {}])),
      circles: group(circles.data, (r) => r.circle_id),
      heritage: new Map((heritage.data ?? []).map((r: any) => [r.user_id, r.origin_countries ?? []])),
      maxDistance: new Map((prefs.data ?? []).map((r: any) => [r.user_id, r.max_distance_miles])),
    };
    const typesBy = group(types.data, (r) => r.connection_type);
    const viewer = toMember(viewerId, rows);
    const viewerTypes = typesBy.get(viewerId) ?? [];

    const ranked: { userId: string; order: number; match: PairMatch }[] = [];
    candidateIds.forEach((id, order) => {
      const sharedTypes = (typesBy.get(id) ?? []).filter((t) => viewerTypes.includes(t)) as AppType[];
      const match = bestMatch(viewer, toMember(id, rows), sharedTypes, cfg);
      if (match) ranked.push({ userId: id, order, match });
    });
    // Best score first; unscored after, in the database's (random) order.
    ranked.sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1) || a.order - b.order);

    let shown = ranked;
    if ((cfg as any).ranking?.enforce_min_match) {
      const passing = ranked.filter((r) => (r.match.score ?? 0) >= cfg.thresholds.min_match);
      // Small pools: up to 3 "worth a look" when fewer than 3 pass.
      shown = passing.length >= 3 ? passing : [...passing, ...ranked.filter((r) => (r.match.score ?? 0) >= cfg.thresholds.worth_a_look && (r.match.score ?? 0) < cfg.thresholds.min_match).slice(0, 3 - passing.length)];
    }

    return json({
      modelVersion: cfg.model_version,
      candidates: shown.slice(0, Math.min(Math.max(Number(maxCount) || 20, 1), 50)).map((r) => ({
        userId: r.userId,
        connectionType: r.match.appType,
        score: r.match.score === null ? null : Math.round(r.match.score * 1000) / 1000,
        strong: r.match.strong,
        reasons: r.match.reasons,
      })),
    });
  } catch (error) {
    console.error("rank-discover error", error);
    return json({ error: "could not rank" }, 500);
  }
});
