import { supabase } from "@/api/client";

// Thrown when the photo check (moderate-photo) turns a photo down; the screens show
// t("photos.rejected") for it instead of the raw message.
export class PhotoRejectedError extends Error {
  constructor() {
    super("This photo can't be used.");
    this.name = "PhotoRejectedError";
  }
}

// Photos don't go straight into the public avatars bucket (migration 0044): they're
// uploaded privately, checked by the moderate-photo Edge Function, and published at
// the same path only if they pass. Resolves once the photo is live; for the profile
// picture, the function has also set profiles.avatar_url and returns it.
export async function uploadCheckedPhoto(
  path: string,
  body: ArrayBuffer,
  contentType: string,
  { replace = false }: { replace?: boolean } = {}
): Promise<{ avatarUrl?: string }> {
  const { error: uploadError } = await supabase.storage
    .from("photo-uploads")
    .upload(path, body, { contentType, upsert: replace });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.functions.invoke<{ rejected: boolean; avatarUrl?: string }>(
    "moderate-photo",
    { body: { path } }
  );
  if (error) throw error;
  if (!data || data.rejected) throw new PhotoRejectedError();
  return { avatarUrl: data.avatarUrl };
}
