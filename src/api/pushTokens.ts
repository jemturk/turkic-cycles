import { supabase } from "@/api/client";

// Keyed on the token alone, not (user_id, token) -- a token identifies one physical
// device, and if a different account signs in on that same device later, this
// re-registration reassigns the row to them rather than leaving a duplicate stale
// entry pointing at the previous account (same real-world behavior as WhatsApp/
// Messenger rebinding a device's token on login). Done by an RPC rather than a
// plain upsert because RLS won't let the caller see the previous account's row
// (migration 0037); the function always registers the token for auth.uid().
export async function registerPushToken(token: string, platform: "ios" | "android") {
  const { error } = await supabase.rpc("register_push_token", { p_token: token, p_platform: platform });
  if (error) throw error;
}
