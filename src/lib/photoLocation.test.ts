import { removePhotoLocation } from "../../supabase/functions/_shared/photoLocation";

// A little-endian EXIF block like a phone camera's: IFD0 holds the orientation and a
// pointer to the GPS block, which holds a latitude (three rationals, stored at an offset).
function exifBlock(): number[] {
  const tiff = new Uint8Array(80);
  const view = new DataView(tiff.buffer);
  tiff.set([0x49, 0x49, 0x2a, 0x00]);
  view.setUint32(4, 8, true);
  // IFD0 at 8: two entries.
  view.setUint16(8, 2, true);
  view.setUint16(10, 0x0112, true); // Orientation
  view.setUint16(12, 3, true); // SHORT
  view.setUint32(14, 1, true);
  view.setUint16(18, 6, true); // rotated 90°
  view.setUint16(22, 0x8825, true); // GPS IFD pointer
  view.setUint16(24, 4, true); // LONG
  view.setUint32(26, 1, true);
  view.setUint32(30, 38, true);
  // GPS IFD at 38: one entry, GPSLatitude, 3 RATIONALs at 56.
  view.setUint16(38, 1, true);
  view.setUint16(40, 0x0002, true);
  view.setUint16(42, 5, true);
  view.setUint32(44, 3, true);
  view.setUint32(48, 56, true);
  [51, 1, 30, 1, 15, 1].forEach((n, i) => view.setUint32(56 + 4 * i, n, true));
  return [...tiff];
}

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

function jpeg(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    ...segment(0xe1, [...ascii("Exif\0\0"), ...exifBlock()]),
    ...segment(0xe1, [...ascii("http://ns.adobe.com/xap/1.0/\0"), ...ascii("<x:xmpmeta exif:GPSLatitude='51,30.25N'/>")]),
    ...segment(0xed, [...ascii("Photoshop 3.0\0"), ...ascii("8BIM City=Bishkek")]),
    ...segment(0xda, [1, 2, 3]),
    0x11, 0x22, 0xff, 0xd9,
  ]);
}

describe("removePhotoLocation", () => {
  it("zeroes a JPEG's GPS block and drops its XMP and IPTC, keeping the orientation and image data", () => {
    const out = removePhotoLocation(jpeg());
    // After the start marker (2), the segment header (4) and "Exif\0\0" (6).
    const tiffStart = 12;
    const tiff = new DataView(out.buffer, out.byteOffset + tiffStart);

    expect(tiff.getUint16(10, true)).toBe(0x0112);
    expect(tiff.getUint16(18, true)).toBe(6);
    expect(tiff.getUint16(38, true)).toBe(0); // no GPS entries
    expect([...out.subarray(tiffStart + 38, tiffStart + 80)].every((b) => b === 0)).toBe(true);
    expect(String.fromCharCode(...out)).not.toContain("GPSLatitude");
    expect(String.fromCharCode(...out)).not.toContain("Bishkek");
    expect([...out.subarray(-11)]).toEqual([0xff, 0xda, 0x00, 0x05, 1, 2, 3, 0x11, 0x22, 0xff, 0xd9]);
  });

  it("leaves the input untouched", () => {
    const input = jpeg();
    const copy = input.slice();
    removePhotoLocation(input);
    expect(input).toEqual(copy);
  });

  it("drops a PNG's eXIf chunk and keeps the rest", () => {
    const chunk = (type: string, data: number[]) => [0, 0, 0, data.length, ...ascii(type), ...data, 9, 9, 9, 9];
    const head = [0x89, ...ascii("PNG"), 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = chunk("IHDR", [1, 2, 3]);
    const iend = chunk("IEND", []);
    const png = new Uint8Array([...head, ...ihdr, ...chunk("eXIf", exifBlock().slice(0, 20)), ...iend]);

    expect([...removePhotoLocation(png)]).toEqual([...head, ...ihdr, ...iend]);
  });

  it("passes other formats through", () => {
    const webp = new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]);
    expect(removePhotoLocation(webp)).toBe(webp);
  });
});
