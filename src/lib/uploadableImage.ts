import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Every photo is re-encoded as JPEG on the device before upload, never sent as picked:
// - Re-encoding writes a fresh file from the pixels, dropping the original's metadata --
//   above all the GPS position phone cameras embed, which would otherwise be readable by
//   anyone with the photo's link (the avatars bucket is public). The gallery's
//   multi-select skips the crop step, so its picks arrive as the camera's original file.
// - iPhones can hand over HEIC originals, which the bucket rejects (allowed_mime_types,
//   migration 0012).
// - Shrunk to MAX_EDGE on the long side: a camera original (~4000x3000) is a few MB to
//   download and ~48 MB of memory once decoded, for a photo never shown bigger than a
//   phone screen (Play's Android vitals flags it as bitmap memory).
const MAX_EDGE = 1600;

export async function toUploadableImage(uri: string): Promise<{ uri: string; mimeType: string }> {
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) > MAX_EDGE) {
    const size = image.width >= image.height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE };
    image = await ImageManipulator.manipulate(uri).resize(size).renderAsync();
  }
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: result.uri, mimeType: "image/jpeg" };
}
