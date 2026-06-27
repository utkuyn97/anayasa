/**
 * storage.ts — Supabase Storage helpers.
 *
 * Upload photos + generate signed URLs.
 * Security: signed URL only (no public URL), 1 hour TTL.
 */
import { supabase } from '@/lib/supabase';
import { compressPhoto } from '@/lib/photo';

/** Valid storage buckets for this app. */
export type StorageBucket = 'incident-photos' | 'goal-images';

/**
 * Upload a photo to Supabase Storage.
 * Compresses HEIC→JPEG first, then uploads with random UUID name.
 * Returns the storage path (e.g., "abc-123.jpg").
 */
export async function uploadPhoto(
  file: File,
  bucket: StorageBucket,
): Promise<string> {
  // Compress and convert to JPEG
  const compressed = await compressPhoto(file);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(compressed.name, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;
  return data.path;
}

/**
 * Get a signed URL for a storage object.
 * TTL: 1 hour (3600 seconds).
 * Returns null if path is null/undefined.
 */
export async function getSignedUrl(
  path: string | null | undefined,
  bucket: StorageBucket,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (error) throw error;
  return data.signedUrl;
}
