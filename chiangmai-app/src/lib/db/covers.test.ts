import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { newCoverId, processCoverImage } from "./covers";
import { UPLOAD_ID } from "@/lib/trip-cover";

/** A phone-like photo: landscape pixels, a GPS position, a camera, and "turn me 90° to show". */
async function cameraPhoto(width = 2000, height = 1000): Promise<Buffer> {
  return (
    sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } })
      .jpeg()
      // The orientation goes through withMetadata: sharp writes its own
      // Orientation tag over one given to withExif.
      .withMetadata({ orientation: 6 })
      .withExif({
        IFD0: { Make: "TestCam", Model: "Phone 1" },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: "18/1 47/1 0/1",
          GPSLongitudeRef: "E",
          GPSLongitude: "98/1 59/1 0/1",
        },
      })
      .toBuffer()
  );
}

describe("processCoverImage", () => {
  it("stores pixels only: no GPS position, no camera, no EXIF at all", async () => {
    const input = await cameraPhoto();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const result = await processCoverImage(input);
    expect(result).not.toBeNull();
    const meta = await sharp(result!.data).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(result!.data.includes(Buffer.from("TestCam"))).toBe(false);
  });

  it("turns the photo the way the camera meant before dropping the tag that said so", async () => {
    const result = await processCoverImage(await cameraPhoto(2000, 1000));
    // Orientation 6 is a quarter turn: the stored photo is portrait.
    expect(result!.width).toBeLessThan(result!.height);
  });

  it("shrinks the longer side to 1600px and never enlarges", async () => {
    const big = await processCoverImage(
      await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#888" } })
        .png()
        .toBuffer(),
    );
    expect([big!.width, big!.height]).toEqual([1600, 1200]);
    const small = await processCoverImage(
      await sharp({ create: { width: 800, height: 400, channels: 3, background: "#888" } })
        .webp()
        .toBuffer(),
    );
    expect([small!.width, small!.height]).toEqual([800, 400]);
  });

  it("answers null for anything that is not a photo", async () => {
    expect(await processCoverImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(await processCoverImage(Buffer.from("not an image at all"))).toBeNull();
    expect(await processCoverImage(Buffer.alloc(0))).toBeNull();
  });
});

describe("newCoverId", () => {
  it("makes ids the cover shape accepts, and never the same one twice", () => {
    const ids = Array.from({ length: 200 }, newCoverId);
    expect(ids.every((id) => UPLOAD_ID.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
