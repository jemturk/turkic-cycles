import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// What the avatars bucket accepts (allowed_mime_types, migration 0012).
const BUCKET_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// iPhones can hand the picker HEIC originals (seen from the gallery's multi-select,
// which skips the crop step), and the bucket rejects those -- so anything it wouldn't accept is
// re-encoded as JPEG on the device first. Android only ever gives JPEG/PNG/WebP.
export async function toUploadableImage(uri: string, mimeType: string): Promise<{ uri: string; mimeType: string }> {
  if (BUCKET_MIME_TYPES.has(mimeType)) return { uri, mimeType };

  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: result.uri, mimeType: "image/jpeg" };
}
