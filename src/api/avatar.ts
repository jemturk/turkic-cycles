import { supabase } from "@/api/client";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadAvatar(userId: string, uri: string, mimeType: string) {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "jpg";
  const path = `${userId}/avatar.${extension}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // The path is stable across re-uploads (upsert overwrites the same file), so a
  // CDN/browser cache would otherwise keep serving the old image -- a cache-busting
  // query param forces every re-upload to be treated as a new URL.
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);
  if (updateError) throw updateError;

  return avatarUrl;
}
