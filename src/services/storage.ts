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

export function formatStorageError(error: any): string {
  if (!error) return 'An unknown storage error occurred.';
  const msg = error?.message || error?.error_description || String(error);
  
  if (msg.includes('Bucket not found') || msg.includes('bucket_not_found')) {
    return 'Supabase Storage bucket missing. Please ensure the target bucket exists in your Supabase project.';
  }
  if (msg.includes('Invalid path specified in request URL') || msg.includes('Invalid path') || msg.includes('invalid_path')) {
    return 'Invalid storage path or bucket missing in Supabase. Please ensure the storage bucket ("apk-assets", "payment-proofs", or "store-assets") exists in your Supabase project.';
  }
  if (msg.includes('row-level security') || msg.includes('RLS') || msg.includes('403') || msg.includes('Unauthorized')) {
    return 'Storage permission denied. Please verify your Supabase Storage RLS policies.';
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
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'apk') {
    return { valid: false, error: 'Invalid file type. Only .apk files are allowed.' };
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

export const APK_ASSETS_BUCKET = BUCKETS.APK_ASSETS;

export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string' || fileName === 'undefined' || fileName === 'null') {
    return `file_${Date.now()}`;
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
  return ext ? `${finalName}.${ext.replace(/[^a-z0-9]/g, '')}` : finalName;
}

// Determine appropriate Supabase bucket and object path based on target folder/entity
export function resolveBucketAndPath(
  folderOrPath: string, 
  fileName: string,
  entityId?: string
): { bucket: string; path: string } {
  const safeFileName = sanitizeFileName(fileName);
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const uniqueName = `${uuid}-${safeFileName}`;

  const cleanFolder = (folderOrPath || '').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();

  // Route 1: Payment Proofs
  if (cleanFolder.startsWith('payment-proofs') || cleanFolder.includes('payment')) {
    const subFolder = cleanFolder.replace(/^payment-proofs\/?/, '').replace(/^\/+|\/+$/g, '');
    const objectPath = subFolder ? `${subFolder}/${uniqueName}` : uniqueName;
    return {
      bucket: BUCKETS.PAYMENT_PROOFS,
      path: objectPath.replace(/^\/+/, '')
    };
  }

  // Route 2: Store Assets
  if (
    cleanFolder.startsWith('store-assets') || 
    cleanFolder.startsWith('logo') || 
    cleanFolder.startsWith('banners') || 
    cleanFolder.startsWith('payment-qr') || 
    cleanFolder.startsWith('qr') || 
    cleanFolder.startsWith('support')
  ) {
    let sub = 'logo';
    if (cleanFolder.includes('banner')) sub = 'banners';
    else if (cleanFolder.includes('qr')) sub = 'payment-qr';
    else if (cleanFolder.includes('support')) sub = 'support';

    let subFolder = cleanFolder.replace(/^store-assets\/?/, '').replace(/^\/+|\/+$/g, '');
    if (!subFolder) subFolder = sub;
    const objectPath = `${subFolder}/${uniqueName}`;
    return {
      bucket: BUCKETS.STORE_ASSETS,
      path: objectPath.replace(/^\/+/, '')
    };
  }

  // Route 3: APK Assets (icons, screenshots, files)
  let category = 'files';
  if (cleanFolder.includes('icon')) category = 'icons';
  else if (cleanFolder.includes('screenshot')) category = 'screenshots';

  const id = entityId || 'general';
  const objectPath = `${category}/${id}/${uniqueName}`;

  return {
    bucket: APK_ASSETS_BUCKET,
    path: objectPath.replace(/^\/+/, '')
  };
}

// Upload file directly to Supabase Storage with real progress & cancel capability
export function uploadFileWithTask(
  file: File,
  folderOrPath: string,
  onProgress?: UploadProgressCallback,
  entityId?: string
): UploadTaskHandler {
  let isCanceled = false;
  const { bucket, path } = resolveBucketAndPath(folderOrPath, file.name, entityId);

  const promise = new Promise<UploadTaskResult>(async (resolve, reject) => {
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase Storage is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
      }

      console.log({
        bucket: APK_ASSETS_BUCKET,
        apkId: entityId || 'general',
        storagePath: path,
        fileName: file.name,
      });

      if (onProgress) onProgress(10);

      const contentType = file.type || (file.name.endsWith('.apk') ? 'application/vnd.android.package-archive' : 'image/png');

      const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

      if (isCanceled) {
        reject(new Error('Upload was canceled.'));
        return;
      }

      if (error) {
        throw error;
      }

      if (onProgress) onProgress(100);

      let publicUrl = '';
      let signedUrl = '';

      if (bucket === BUCKETS.PAYMENT_PROOFS) {
        // Payment proofs are stored in a private bucket -> generate 1 hour signed URL
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        signedUrl = signedData?.signedUrl || '';
        publicUrl = signedUrl;
      } else {
        // Public buckets
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = urlData.publicUrl;
      }

      resolve({
        publicUrl,
        downloadUrl: publicUrl,
        storagePath: path,
        signedUrl,
        bucket
      });
    } catch (err: any) {
      const formatted = formatStorageError(err);
      reject(new Error(formatted));
    }
  });

  return {
    cancel: () => {
      isCanceled = true;
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

// Generate secure signed URL for private files (paid APK downloads or payment screenshots)
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

// Helper to convert File to Data URL for instant local UI image preview
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
