import { supabase } from "@/api/client";
import { uploadCheckedPhoto } from "@/api/photoModeration";
import { toUploadableImage } from "@/lib/uploadableImage";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadAvatar(userId: string, pickedUri: string) {
  const { uri, mimeType } = await toUploadableImage(pickedUri);
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "jpg";
  const path = `${userId}/avatar.${extension}`;

  // ArrayBuffer, not Blob: supabase-js wraps a Blob in FormData, and React Native's
  // FormData drops the blob's type -- the bucket then sees "text/plain" and rejects
  // it (allowed_mime_types). An ArrayBuffer goes up as the raw body with contentType.
  const response = await fetch(uri);
  const body = await response.arrayBuffer();

  // Checked before it's published; moderate-photo then sets profiles.avatar_url (with
  // a cache-busting ?v=, since the path is the same on every re-upload).
  const { avatarUrl } = await uploadCheckedPhoto(path, body, mimeType, { replace: true });
  if (!avatarUrl) throw new Error("The photo check didn't return the new picture");
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
