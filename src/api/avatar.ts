import { supabase } from "@/api/client";
import { toUploadableImage } from "@/lib/uploadableImage";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadAvatar(userId: string, pickedUri: string, pickedMimeType: string) {
  const { uri, mimeType } = await toUploadableImage(pickedUri, pickedMimeType);
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "jpg";
  const path = `${userId}/avatar.${extension}`;

  // ArrayBuffer, not Blob: supabase-js wraps a Blob in FormData, and React Native's
  // FormData drops the blob's type -- the bucket then sees "text/plain" and rejects
  // it (allowed_mime_types). An ArrayBuffer goes up as the raw body with contentType.
  const response = await fetch(uri);
  const body = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, body, { contentType: mimeType, upsert: true });
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

export async function deleteAvatar(userId: string) {
  // The stored file's extension isn't tracked anywhere separately from avatar_url
  // itself (which we're about to clear) -- remove every extension this app ever
  // uploads under, so a photo re-uploaded under a different format in the past
  // doesn't linger as an orphaned file. Removing a path that doesn't exist is a
  // no-op, not an error.
  const paths = Object.values(EXTENSION_BY_MIME_TYPE).map((ext) => `${userId}/avatar.${ext}`);
  const { error: removeError } = await supabase.storage.from("avatars").remove(paths);
  if (removeError) throw removeError;

  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (updateError) throw updateError;
}
