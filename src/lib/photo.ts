/**
 * photo.ts — Photo compression helper using browser-image-compression.
 *
 * HEIC → JPEG conversion on client-side.
 * Max: 1080px dimension, 500KB file size.
 * Security: random UUID filename, original filename never exposed.
 */
import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1080,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

/** Max upload size in bytes (5MB — beyond this, reject immediately). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Compress and convert a photo to JPEG.
 * Returns a File with a random UUID name.
 */
export async function compressPhoto(file: File): Promise<File> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  const compressed = await imageCompression(file, COMPRESSION_OPTIONS);

  // Generate random filename — never expose original filename
  const uuid = crypto.randomUUID();
  const compressedFile = new File([compressed], `${uuid}.jpg`, {
    type: 'image/jpeg',
  });

  return compressedFile;
}
