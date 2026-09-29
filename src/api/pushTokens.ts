import { supabase } from "@/api/client";

// onConflict: "token", not (user_id, token) -- a token identifies one physical
// device, and if a different account signs in on that same device later, this
// re-registration reassigns the row to them rather than leaving a duplicate stale
// entry pointing at the previous account (same real-world behavior as WhatsApp/
// Messenger rebinding a device's token on login).
export async function registerPushToken(userId: string, token: string, platform: "ios" | "android") {
  const { error } = await supabase.from("push_tokens").upsert({ user_id: userId, token, platform }, { onConflict: "token" });
  if (error) throw error;
}
