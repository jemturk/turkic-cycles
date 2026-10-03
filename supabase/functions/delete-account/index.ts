// Permanently deletes the calling user's account: their avatar and gallery photos
// in Storage, then the auth user itself -- which cascades to every table row that
// references it (profile, memberships, swipes, matches, messages, ...).
//
// Needs the service-role key (deleting an auth user and other users' storage paths
// is beyond what RLS lets a client do), which is why this lives server-side instead
// of in the app. The caller is identified from their own JWT; there is no user id
// parameter, so nobody can delete anyone but themselves.
//
// Deploy with: supabase functions deploy delete-account
// (JWT verification stays ON -- the default -- unlike send-message-push.)
import { createClient } from "npm:@supabase/supabase-js@2";

const AVATAR_BUCKET = "avatars";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // The web build calls this cross-origin, so the browser sends a preflight first.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "not signed in" }, 401);
  const userId = userData.user.id;

  try {
    // Storage objects don't cascade from auth.users, so remove them first. Paths
    // follow src/api/avatar.ts ("{id}/avatar.ext") and gallery.ts ("{id}/gallery/...").
    for (const folder of [userId, `${userId}/gallery`]) {
      const { data: files, error: listError } = await admin.storage.from(AVATAR_BUCKET).list(folder, { limit: 1000 });
      if (listError) throw listError;
      const paths = (files ?? []).filter((f) => f.id !== null).map((f) => `${folder}/${f.name}`);
      if (paths.length > 0) {
        const { error: removeError } = await admin.storage.from(AVATAR_BUCKET).remove(paths);
        if (removeError) throw removeError;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return json({ deleted: true }, 200);
  } catch (error) {
    console.error("delete-account failed", userId, error);
    return json({ error: "could not delete account" }, 500);
  }
});
