// Checks a photo the member just uploaded into the private photo-uploads bucket and,
// if it's acceptable, publishes it: copies it into the public avatars bucket at the
// same path and, for the profile picture, sets profiles.avatar_url. Migration 0044
// takes away every other way to put a photo in front of other members.
//
// The check is Google Cloud Vision SafeSearch, which rates how likely an image is to
// be adult (explicit sexual content), racy (nudity, revealing), violent, etc.:
//   * adult POSSIBLE or more, racy VERY_LIKELY, or violence VERY_LIKELY -> rejected, file deleted
//   * racy LIKELY                                                       -> published, logged for review
//   * otherwise                                                         -> published
// "adult" alone isn't enough: in testing, plain nudity scored adult UNLIKELY but racy
// VERY_LIKELY (a nude painting: racy LIKELY). Swimwear and gym photos mostly land at
// racy LIKELY, so they're published but logged.
// Every verdict goes into public.photo_moderation; review the borderline ones with
//   select * from photo_moderation where verdict <> 'approved' order by created_at desc;
//
// If Vision can't be reached, the photo isn't published (fail closed) and the member
// is asked to try again.
//
// Limits, counted from photo_moderation (429, "too many tries"): MAX_CHECKS_PER_HOUR
// stops a script running up Vision charges; MAX_REJECTIONS_PER_DAY stops someone
// probing the filter. Members who keep getting rejected: photo_moderation_offenders.
//
// Published files get a short cache (PUBLIC_CACHE_SECONDS) instead of Storage's
// default hour, so a photo the member deletes stops loading from caches quickly.
//
// Secrets: GOOGLE_VISION_API_KEY (Google Cloud → APIs & Services → Credentials, an API
// key restricted to the Cloud Vision API).
// Deploy with: supabase functions deploy moderate-photo  (JWT verification on)
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const UPLOAD_BUCKET = "photo-uploads";
const PUBLIC_BUCKET = "avatars";
const PUBLIC_CACHE_SECONDS = "300";
const MAX_CHECKS_PER_HOUR = 30;
const MAX_REJECTIONS_PER_DAY = 5;

const LIKELIHOOD = ["UNKNOWN", "VERY_UNLIKELY", "UNLIKELY", "POSSIBLE", "LIKELY", "VERY_LIKELY"];
type SafeSearch = Record<"adult" | "spoof" | "medical" | "violence" | "racy", string>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function atLeast(value: string | undefined, level: string) {
  return LIKELIHOOD.indexOf(value ?? "UNKNOWN") >= LIKELIHOOD.indexOf(level);
}

function verdictFor(s: SafeSearch): "approved" | "review" | "rejected" {
  if (atLeast(s.adult, "POSSIBLE") || atLeast(s.racy, "VERY_LIKELY") || atLeast(s.violence, "VERY_LIKELY")) {
    return "rejected";
  }
  if (atLeast(s.racy, "LIKELY")) return "review";
  return "approved";
}

async function safeSearch(image: Uint8Array): Promise<SafeSearch> {
  const key = Deno.env.get("GOOGLE_VISION_API_KEY");
  if (!key) throw new Error("GOOGLE_VISION_API_KEY is not set");
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ image: { content: encodeBase64(image) }, features: [{ type: "SAFE_SEARCH_DETECTION" }] }],
    }),
  });
  if (!res.ok) throw new Error(`Vision request failed: ${res.status} ${await res.text()}`);
  const result = (await res.json()).responses?.[0];
  if (result?.error) throw new Error(`Vision error: ${JSON.stringify(result.error)}`);
  if (!result?.safeSearchAnnotation) throw new Error("Vision returned no SafeSearch result");
  return result.safeSearchAnnotation as SafeSearch;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "not signed in" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "not signed in" }, 401);
  const userId = userData.user.id;

  // Only the caller's own profile picture or gallery photo, as named by
  // src/api/avatar.ts ("{id}/avatar.ext") and gallery.ts ("{id}/gallery/name.ext").
  const { path } = await req.json().catch(() => ({ path: undefined }));
  const ownPhoto = new RegExp(`^${userId}/(avatar|gallery/[A-Za-z0-9_-]+)\\.(jpg|png|webp)$`);
  if (typeof path !== "string" || !ownPhoto.test(path)) return json({ error: "invalid path" }, 400);
  const isAvatar = path.startsWith(`${userId}/avatar.`);

  const removeUpload = () => admin.storage.from(UPLOAD_BUCKET).remove([path]);

  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const [checks, rejections] = await Promise.all([
    admin.from("photo_moderation").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", since(60 * 60 * 1000)),
    admin.from("photo_moderation").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("verdict", "rejected").gte("created_at", since(24 * 60 * 60 * 1000)),
  ]);
  if ((checks.count ?? 0) >= MAX_CHECKS_PER_HOUR || (rejections.count ?? 0) >= MAX_REJECTIONS_PER_DAY) {
    console.warn("moderate-photo: limit reached", userId, { checks: checks.count, rejections: rejections.count });
    await removeUpload();
    return json({ error: "too many tries" }, 429);
  }

  const { data: file, error: downloadError } = await admin.storage.from(UPLOAD_BUCKET).download(path);
  if (downloadError || !file) return json({ error: "upload not found" }, 404);
  const image = new Uint8Array(await file.arrayBuffer());

  let scores: SafeSearch;
  try {
    scores = await safeSearch(image);
  } catch (error) {
    console.error("moderate-photo: check failed", userId, path, error);
    await removeUpload();
    return json({ error: "could not check photo" }, 503);
  }

  const verdict = verdictFor(scores);
  const { error: logError } = await admin
    .from("photo_moderation")
    .insert({ user_id: userId, storage_path: path, verdict, safe_search: scores });
  if (logError) console.error("moderate-photo: log failed", userId, path, logError);

  if (verdict === "rejected") {
    await removeUpload();
    return json({ rejected: true });
  }

  try {
    const { error: publishError } = await admin.storage
      .from(PUBLIC_BUCKET)
      .upload(path, image, { contentType: file.type || "image/jpeg", upsert: isAvatar, cacheControl: PUBLIC_CACHE_SECONDS });
    if (publishError) throw publishError;
    await removeUpload();

    if (isAvatar) {
      // Same path on every re-upload, so a version parameter makes caches fetch the
      // new picture (see src/api/avatar.ts).
      const avatarUrl = `${admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await admin.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
      if (profileError) throw profileError;
      return json({ rejected: false, path, avatarUrl });
    }
    return json({ rejected: false, path });
  } catch (error) {
    console.error("moderate-photo: publish failed", userId, path, error);
    return json({ error: "could not save photo" }, 500);
  }
});
