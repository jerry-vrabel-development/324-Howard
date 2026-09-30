/**
 * Prepare a photo from the phone for upload, entirely in the browser:
 *   - applies the camera's rotation
 *   - scales it down to at most `maxSize` px on the long side
 *   - re-encodes it (WebP, or JPEG where the browser can't write WebP)
 *
 * Re-encoding through a canvas keeps only the pixels, so GPS location and all
 * other metadata are dropped before anything leaves the device.
 */

export interface PreparedImage {
  blob: Blob;
  extension: 'webp' | 'jpg';
  width: number;
  height: number;
}

export function fitWithin(width: number, height: number, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File, maxSize = 1600): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(
      `${file.name} couldn't be read. If it's a HEIC photo, choose it from the Photos picker (which converts it) or export it as JPEG.`,
    );
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSize);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Safari can't encode WebP and silently returns PNG instead, so check the result.
  const webp = await toBlob(canvas, 'image/webp', 0.82);
  if (webp?.type === 'image/webp') return { blob: webp, extension: 'webp', width, height };
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!jpeg) throw new Error(`${file.name} couldn't be converted.`);
  return { blob: jpeg, extension: 'jpg', width, height };
}
