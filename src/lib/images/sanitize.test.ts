import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { detectImageType, sanitizeImage } = await import("./sanitize");

describe("detectImageType", () => {
  it("recognises jpeg, png and webp by magic bytes", async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: "#e2a00e" } });
    expect(detectImageType(await base.clone().jpeg().toBuffer())).toBe("jpeg");
    expect(detectImageType(await base.clone().png().toBuffer())).toBe("png");
    expect(detectImageType(await base.clone().webp().toBuffer())).toBe("webp");
  });
  it("rejects anything else, whatever it claims to be", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("sanitizeImage", () => {
  it("strips EXIF and GPS metadata and outputs webp", async () => {
    const withExif = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#2e6b3f" } })
      .jpeg()
      .withExif({ IFD0: { Make: "SpyCam", Copyright: "secret" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "10/1 0/1 0/1" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const clean = await sanitizeImage(withExif);
    const meta = await sharp(clean).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(clean.includes(Buffer.from("SpyCam"))).toBe(false);
  });
  it("shrinks very large images", async () => {
    const big = await sharp({ create: { width: 4000, height: 1000, channels: 3, background: "#fff" } }).png().toBuffer();
    const meta = await sharp(await sanitizeImage(big)).metadata();
    expect(meta.width).toBe(2048);
  });
  it("throws on a corrupt image", async () => {
    await expect(sanitizeImage(new Uint8Array([0xff, 0xd8, 0xff, 0, 1, 2, 3]))).rejects.toThrow();
  });
});
