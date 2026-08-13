import { supabase, BUCKETS, isSupabaseConfigured } from '../lib/supabase';

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface UploadTaskResult {
  publicUrl: string;
  storagePath: string;
  downloadUrl?: string;
  signedUrl?: string;
  bucket: string;
}

export interface UploadTaskHandler {
  cancel: () => void;
  promise: Promise<UploadTaskResult>;
}

export function formatStorageError(error: any, bucketName?: string): string {
  if (!error) return 'An unknown storage error occurred.';
  const msg = error?.message || error?.error_description || String(error);
  
  if (msg.includes('Bucket not found') || msg.includes('bucket_not_found') || msg.includes('not found') || msg.includes('NoSuchBucket') || msg.includes('The resource was not found')) {
    const targetBucket = bucketName || 'apk-files';
    return `Storage bucket ${targetBucket} is missing. Create it in Supabase Storage.`;
  }
  if (msg.includes('Invalid path specified in request URL') || msg.includes('Invalid path') || msg.includes('invalid_path')) {
    return 'Invalid storage path specified in request URL. Please check file path format.';
  }
  if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('permission denied')) {
    return 'Storage permission denied. Please verify your Supabase Storage RLS policies for bucket.';
  }
  if (msg.includes('Payload too large') || msg.includes('413')) {
    return 'File size is too large for Supabase Storage limits.';
  }
  if (msg.includes('AbortError') || msg.includes('canceled') || msg.includes('Canceled')) {
    return 'Upload was canceled.';
  }
  return msg;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];

  if (!allowedTypes.includes(file.type) && (!ext || !allowedExts.includes(ext))) {
    return { valid: false, error: 'Please select PNG, JPG, JPEG, or WEBP image.' };
  }

  // Maximum 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image size must be 10 MB or smaller.' };
  }

  return { valid: true };
}

export function validateApkFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Please select a valid APK file.' };
  }
  if (!file.size || file.size <= 0) {
    return { valid: false, error: 'The selected APK file is empty (0 bytes). Please select a valid APK file.' };
  }
  const isApkExt = file.name.toLowerCase().endsWith('.apk');
  const isApkMime = file.type === 'application/vnd.android.package-archive';
  if (!isApkExt && !isApkMime) {
    return { valid: false, error: 'Please select a valid APK file.' };
  }
  return { valid: true };
}

export function validateExternalUrl(urlStr: string): { valid: boolean; error?: string } {
  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { valid: false, error: 'Download URL is required.' };
  }

  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return { valid: false, error: 'Invalid URL format.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must begin with http:// or https://' };
    }
  } catch (e) {
    return { valid: false, error: 'Please enter a valid URL (e.g. https://example.com/file.apk)' };
  }

  return { valid: true };
}

export const APK_ASSETS_BUCKET = BUCKETS.APK_FILES;

export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string' || fileName === 'undefined' || fileName === 'null') {
    return `file_${Date.now()}.apk`;
  }
  const parts = fileName.split('.');
  let ext = '';
  let nameWithoutExt = fileName;
  if (parts.length > 1) {
    ext = parts.pop()?.toLowerCase() || '';
    nameWithoutExt = parts.join('.');
  }

  const cleanName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const finalName = cleanName || 'file';
  return ext ? `${finalName}.${ext.replace(/[^a-z0-9]/g, '')}` : `${finalName}.apk`;
}

// Determine appropriate Supabase bucket and object path based on target folder/entity
export function resolveBucketAndPath(
  folderOrPath: string, 
  fileName: string,
  entityId?: string
): { bucket: string; path: string } {
  const safeFileName = sanitizeFileName(fileName);
  const safeId = (entityId && entityId !== 'undefined' && entityId !== 'null' && entityId.trim() !== '')
    ? entityId.replace(/[^a-zA-Z0-9_-]/g, '') 
    : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `apk_${Date.now()}`);
  
  const timestamp = Date.now();
  const cleanFolder = (folderOrPath || '').toLowerCase().trim();

  // Route 1: Icons/Logos -> bucket "app-images", path: "{uuid}/{timestamp}-{safeFileName}"
  if (cleanFolder.includes('icon') || cleanFolder.includes('image') || cleanFolder === 'apk-images' || cleanFolder === 'app-images') {
    return {
      bucket: BUCKETS.APP_IMAGES,
      path: `${safeId}/${timestamp}-${safeFileName}`
    };
  }

  // Route 2: Screenshots -> bucket "app-screenshots", path: "{uuid}/{timestamp}-{safeFileName}"
  if (cleanFolder.includes('screenshot') || cleanFolder === 'apk-screenshots' || cleanFolder === 'app-screenshots' || cleanFolder === 'screenshots') {
    return {
      bucket: BUCKETS.APP_SCREENSHOTS,
      path: `${safeId}/${timestamp}-${safeFileName}`
    };
  }

  // Route 3: Payment Proofs -> bucket "payment-proofs"
  if (cleanFolder.includes('payment') || cleanFolder.includes('proof')) {
    return {
      bucket: BUCKETS.PAYMENT_PROOFS,
      path: `${safeId}/${timestamp}-${safeFileName}`
    };
  }

  // Route 4: Store Assets (logo, banners, qr) -> bucket "store-assets"
  if (cleanFolder.includes('store') || cleanFolder.includes('banner') || cleanFolder.includes('logo') || cleanFolder.includes('qr')) {
    return {
      bucket: BUCKETS.STORE_ASSETS,
      path: `assets/${timestamp}-${safeFileName}`
    };
  }

  // Route 5: APK Files (.apk binary) -> bucket "apk-files", path: "{uuid}/{timestamp}-{safeFileName}"
  return {
    bucket: BUCKETS.APK_FILES,
    path: `${safeId}/${timestamp}-${safeFileName}`
  };
}

// Pure Supabase Storage upload handler
export function uploadFileWithTask(
  file: File,
  folderOrPath: string,
  onProgress?: UploadProgressCallback,
  entityId?: string
): UploadTaskHandler {
  let isCanceled = false;
  let progressInterval: any = null;
  const { bucket, path } = resolveBucketAndPath(folderOrPath, file.name, entityId);

  const promise = new Promise<UploadTaskResult>(async (resolve, reject) => {
    const cleanup = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    try {
      if (!file) throw new Error('No file selected.');
      if (file.size <= 0) throw new Error('Selected file is empty (0 bytes).');
      if (!bucket) throw new Error("Supabase Storage bucket 'apk-files' is missing.");
      if (!path || path.trim() === '' || path === '/' || path.includes('undefined')) {
        throw new Error('Invalid file path generated for storage.');
      }

      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const contentType = file.type || (file.name.toLowerCase().endsWith('.apk') ? 'application/vnd.android.package-archive' : 'image/png');

      console.log('[APK] Direct upload starting:', {
        fileName: file.name,
        fileSize: file.size,
        contentType,
        bucket,
        path
      });

      if (isCanceled) {
        cleanup();
        reject(new Error('Upload was canceled.'));
        return;
      }

      let currentProgress = 10;
      if (onProgress) onProgress(currentProgress);

      progressInterval = setInterval(() => {
        if (currentProgress < 85) {
          currentProgress += Math.floor(Math.random() * 8) + 3;
          if (currentProgress > 85) currentProgress = 85;
          if (onProgress) onProgress(currentProgress);
        }
      }, 250);

      // Perform direct upload to target bucket in Supabase Storage
      const uploadResult = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType
      });

      cleanup();

      if (isCanceled) {
        reject(new Error('Upload was canceled.'));
        return;
      }

      if (uploadResult.error) {
        console.error('[APK STORAGE RESULT] Error:', uploadResult.error);
        const formatted = formatStorageError(uploadResult.error, bucket);
        throw new Error(formatted);
      }

      console.log('[APK STORAGE RESULT] Success:', {
        storagePath: path,
        bucket
      });

      let publicUrl = '';
      let signedUrl = '';

      if (bucket === BUCKETS.PAYMENT_PROOFS) {
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        signedUrl = signedData?.signedUrl || '';
        publicUrl = signedUrl;
      } else {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = urlData.publicUrl;
      }

      if (onProgress) onProgress(100);

      resolve({
        publicUrl,
        downloadUrl: publicUrl,
        storagePath: path,
        signedUrl,
        bucket
      });
    } catch (err: any) {
      cleanup();
      const formatted = formatStorageError(err, bucket);
      reject(new Error(formatted));
    }
  });

  return {
    cancel: () => {
      isCanceled = true;
      if (progressInterval) clearInterval(progressInterval);
    },
    promise
  };
}

export async function uploadFileToStorage(
  file: File,
  folderOrPath: string,
  onProgress?: UploadProgressCallback,
  entityId?: string
): Promise<string> {
  const handler = uploadFileWithTask(file, folderOrPath, onProgress, entityId);
  const result = await handler.promise;
  return result.publicUrl;
}

// Upload payment proof screenshot directly to payment-proofs private bucket
export async function uploadPaymentProofToSupabase(
  file: File,
  userId: string,
  orderId: string,
  onProgress?: UploadProgressCallback
): Promise<{ storagePath: string; signedUrl: string }> {
  const targetFolder = `payment-proofs/${userId}/${orderId}`;
  const handler = uploadFileWithTask(file, targetFolder, onProgress, orderId);
  const result = await handler.promise;
  return {
    storagePath: result.storagePath,
    signedUrl: result.signedUrl || result.publicUrl
  };
}

// Helper to convert path to public URL safely
export function getStoragePublicUrl(pathOrUrl: string, bucket: string = APK_ASSETS_BUCKET): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  let cleanPath = trimmed;
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.substring(bucket.length + 1);
  } else {
    for (const b of Object.values(BUCKETS)) {
      if (cleanPath.startsWith(`${b}/`)) {
        cleanPath = cleanPath.substring(b.length + 1);
        bucket = b;
        break;
      }
    }
  }

  cleanPath = cleanPath.replace(/^\/+/, '');
  if (!cleanPath) return '';

  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  return data?.publicUrl || '';
}

// Generate secure signed URL for private files
export async function getSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  try {
    let cleanPath = trimmed;
    if (cleanPath.startsWith(`${bucket}/`)) {
      cleanPath = cleanPath.substring(bucket.length + 1);
    }
    cleanPath = cleanPath.replace(/^\/+/, '');

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Could not generate signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Signed URL generation failed:', err);
    return null;
  }
}

// Delete file from Supabase Storage by full URL or storage path
export async function deleteStorageFile(storagePathOrUrl: string): Promise<void> {
  if (!storagePathOrUrl || typeof storagePathOrUrl !== 'string') return;
  const trimmed = storagePathOrUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return;

  try {
    let bucket: string = APK_ASSETS_BUCKET;
    let path = trimmed;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
      if (match) {
        bucket = match[1];
        path = match[2].split('?')[0];
      } else {
        return;
      }
    } else {
      if (path.includes('/')) {
        const parts = path.split('/');
        if (Object.values(BUCKETS).includes(parts[0] as any)) {
          bucket = parts[0];
          path = parts.slice(1).join('/');
        }
      }
    }

    path = path.replace(/^\/+/, '');
    if (!path || path.includes('..') || path === '/') return;

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.warn('Supabase storage delete warning:', error.message);
    }
  } catch (err) {
    console.warn('Error deleting storage file:', err);
  }
}

// Helper to convert File to Data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
