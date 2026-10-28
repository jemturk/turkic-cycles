// Fires from the profiles_request_geocode trigger (migration 0059) whenever a member's
// city, state or country changes, and stores a centre point for that place in
// profile_locations.latitude / longitude -- private to the member, used server-side
// for the Discover distance filter (and proximity scoring later). Only the typed
// place name is sent to Google ("Tampa, FL, USA"), never the device's location, and
// the result is rounded to ~100 m: the place's centre, not where anyone lives.
//
// Deployed without JWT verification (Postgres calls it, not a signed-in user), so the
// payload is only trusted for the member's id; the place is read from the database,
// and a place already looked up (geocoded_query) is skipped, so a forged or repeated
// call costs nothing.
//
// Secret: GOOGLE_GEOCODING_API_KEY (Google Cloud -> APIs & Services: enable the
// Geocoding API, and a key restricted to it). Without it, nothing is looked up and the
// distance filter simply has no coordinates to use.
//
// Deploy with: supabase functions deploy geocode-location --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const round = (value: number) => Math.round(value * 1000) / 1000;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const userId = payload?.record?.id;
    if (payload?.table !== "profiles" || !UUID.test(userId)) return new Response("ignored", { status: 200 });

    const key = Deno.env.get("GOOGLE_GEOCODING_API_KEY");
    if (!key) {
      console.warn("geocode-location: GOOGLE_GEOCODING_API_KEY is not set");
      return new Response("no key", { status: 200 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: place }, { data: profile }] = await Promise.all([
      supabase.from("profile_locations").select("city, state, geocoded_query").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("country").eq("id", userId).maybeSingle(),
    ]);
    if (!place?.city) return new Response("no city", { status: 200 });

    const query = [place.city, place.state, profile?.country].filter(Boolean).join(", ");
    if (query === place.geocoded_query) return new Response("unchanged", { status: 200 });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok || (body.status !== "OK" && body.status !== "ZERO_RESULTS")) {
      // Quota, key or network trouble: leave everything as it was, so the next change retries.
      console.error("geocode-location: lookup failed", userId, res.status, body.status, body.error_message);
      return new Response("lookup failed", { status: 200 });
    }

    const location = body.results?.[0]?.geometry?.location;
    const { error } = await supabase
      .from("profile_locations")
      .update({
        latitude: location ? round(location.lat) : null,
        longitude: location ? round(location.lng) : null,
        // Recorded even for no result, so an unknown place isn't looked up again and again.
        geocoded_query: query,
        geocoded_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) console.error("geocode-location: save failed", userId, error);

    return new Response(location ? "ok" : "no result", { status: 200 });
  } catch (error) {
    console.error("geocode-location error", error);
    // Always 200: the trigger doesn't retry or read the response.
    return new Response("error", { status: 200 });
  }
});
