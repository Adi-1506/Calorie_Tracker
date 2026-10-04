import "server-only";
import sharp from "sharp";

export type ImageKind = "jpeg" | "png" | "webp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Identifies an image by its first bytes, never by its name or declared type (security item 16). */
export function detectImageType(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/**
 * Re-encodes the image as WebP. Re-encoding drops every metadata block
 * (EXIF, GPS, XMP, ICC comments) and any bytes smuggled after the image data.
 * The EXIF orientation is applied first so photos stay the right way up.
 */
export async function sanitizeImage(input: Uint8Array): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
    .rotate()
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
