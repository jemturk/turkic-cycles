// Removes the location a camera embeds in a photo, before moderate-photo publishes it
// into the public avatars bucket -- anyone with a photo's link could otherwise read
// where it was taken. The app re-encodes photos without metadata
// (src/lib/uploadableImage.ts), but builds from before that sent the camera's file,
// and the picker's crop keeps the original metadata too.
//
// Only the location goes: the rest of the EXIF stays, above all the orientation tag,
// without which an iPhone photo shows sideways. In a JPEG the GPS block's entries and
// values are zeroed in place (the file's layout is unchanged), and the XMP and
// Photoshop/IPTC blocks, which can repeat the location or name the place, are dropped.
// Only the main image's: an embedded one (an HDR gain map) carries no location. In a PNG the eXIf chunk is dropped whole (PNG
// readers don't rotate by it). WebP is passed through.
//
// Plain TypeScript with no Deno or app imports, so the app's Jest tests can use it
// (src/lib/photoLocation.test.ts).

const GPS_IFD_TAG = 0x8825;
const XMP_ID = "http://ns.adobe.com/xap/1.0/\0";
const XMP_EXTENSION_ID = "http://ns.adobe.com/xmp/extension/\0";
const IPTC_ID = "Photoshop 3.0\0";
// Bytes per value of each TIFF field type (1 BYTE ... 12 DOUBLE).
const TYPE_SIZES = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

export function removePhotoLocation(image: Uint8Array): Uint8Array {
  if (image[0] === 0xff && image[1] === 0xd8) return jpegWithoutLocation(image);
  if (image[0] === 0x89 && ascii(image, 1, 3) === "PNG") return pngWithoutLocation(image);
  return image;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function jpegWithoutLocation(input: Uint8Array): Uint8Array {
  const image = input.slice();
  const kept: Uint8Array[] = [image.subarray(0, 2)];
  let pos = 2;
  // Metadata segments sit between the start marker and the image data (SOS, 0xDA).
  while (pos + 4 <= image.length && image[pos] === 0xff) {
    const marker = image[pos + 1];
    if (marker === 0xda) break;
    const end = pos + 2 + ((image[pos + 2] << 8) | image[pos + 3]);
    if (end > image.length) break;
    if (marker === 0xe1 && ascii(image, pos + 4, 6) === "Exif\0\0") {
      zeroGps(image.subarray(pos + 10, end));
    } else if (
      (marker === 0xe1 && [XMP_ID, XMP_EXTENSION_ID].some((id) => ascii(image, pos + 4, id.length) === id)) ||
      (marker === 0xed && ascii(image, pos + 4, IPTC_ID.length) === IPTC_ID)
    ) {
      pos = end;
      continue;
    }
    kept.push(image.subarray(pos, end));
    pos = end;
  }
  kept.push(image.subarray(pos));
  return concat(kept);
}

// tiff: the EXIF block from its byte-order mark ("II" / "MM") on; edited in place.
function zeroGps(tiff: Uint8Array) {
  if (tiff.length < 8) return;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const little = tiff[0] === 0x49;
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const inside = (at: number, length: number) => at >= 0 && at + length <= tiff.length;

  const ifd0 = u32(4);
  if (!inside(ifd0, 2)) return;
  for (let i = 0, count = u16(ifd0); i < count; i++) {
    const entry = ifd0 + 2 + 12 * i;
    if (!inside(entry, 12) || u16(entry) !== GPS_IFD_TAG) continue;
    const gps = u32(entry + 8);
    if (!inside(gps, 2)) return;
    const gpsCount = u16(gps);
    if (!inside(gps + 2, 12 * gpsCount)) return;
    for (let k = 0; k < gpsCount; k++) {
      const field = gps + 2 + 12 * k;
      const size = (TYPE_SIZES[u16(field + 2)] ?? 1) * u32(field + 4);
      // Values over 4 bytes (coordinates, timestamps) live elsewhere, at an offset.
      if (size > 4 && inside(u32(field + 8), size)) tiff.fill(0, u32(field + 8), u32(field + 8) + size);
    }
    // An empty GPS block: no entries, but still a valid one for readers that follow the tag.
    tiff.fill(0, gps, gps + 2 + 12 * gpsCount);
    return;
  }
}

function pngWithoutLocation(image: Uint8Array): Uint8Array {
  const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  const kept: Uint8Array[] = [image.subarray(0, 8)];
  let pos = 8;
  while (pos + 12 <= image.length) {
    // length, type, data, CRC
    const end = pos + 12 + view.getUint32(pos);
    if (end > image.length) break;
    if (ascii(image, pos + 4, 4) !== "eXIf") kept.push(image.subarray(pos, end));
    pos = end;
  }
  kept.push(image.subarray(pos));
  return concat(kept);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
