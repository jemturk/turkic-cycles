import { supabase } from "@/api/client";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ProfilePhoto = {
  id: string;
  storagePath: string;
  position: number;
  url: string;
};

function publicUrl(storagePath: string): string {
  return supabase.storage.from("avatars").getPublicUrl(storagePath).data.publicUrl;
}

export async function listProfilePhotos(userId: string): Promise<ProfilePhoto[]> {
  const { data, error } = await supabase
    .from("profile_photos")
    .select("id, storage_path, position")
    .eq("user_id", userId)
    .order("position");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    position: row.position,
    url: publicUrl(row.storage_path),
  }));
}

// Each photo gets its own permanent, never-reused filename (unlike the single
// avatar's fixed upsert-in-place path), so -- unlike uploadAvatar -- there's no
// cache-busting query param to add: a given storage_path's contents never change.
export async function addProfilePhoto(
  userId: string,
  uri: string,
  mimeType: string,
  position: number
): Promise<ProfilePhoto> {
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const path = `${userId}/gallery/${filename}`;

  // ArrayBuffer, not Blob -- see uploadAvatar for why.
  const response = await fetch(uri);
  const body = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, body, { contentType: mimeType });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("profile_photos")
    .insert({ user_id: userId, storage_path: path, position })
    .select("id, storage_path, position")
    .single();
  if (error) throw error;

  return { id: data.id, storagePath: data.storage_path, position: data.position, url: publicUrl(path) };
}

export async function removeProfilePhoto(photo: Pick<ProfilePhoto, "id" | "storagePath">) {
  const { error: removeError } = await supabase.storage.from("avatars").remove([photo.storagePath]);
  if (removeError) throw removeError;

  const { error } = await supabase.from("profile_photos").delete().eq("id", photo.id);
  if (error) throw error;
}

// Rewrites every row's position to its index in the given order -- simplest way to
// keep positions a dense 0..n-1 sequence without tracking gaps left by past
// deletes/reorders, and cheap enough at the 6-photo cap this is used under.
export async function reorderProfilePhotos(orderedPhotoIds: string[]) {
  for (const [index, id] of orderedPhotoIds.entries()) {
    const { error } = await supabase.from("profile_photos").update({ position: index }).eq("id", id);
    if (error) throw error;
  }
}
