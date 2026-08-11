import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

export async function uploadFileToStorage(
  file: File, 
  storagePath: string, 
  onProgress?: UploadProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Firebase Storage upload error:', error);
          reject(new Error(error.message || 'Storage upload failed'));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve(downloadUrl);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function deleteStorageFile(storagePathOrUrl: string): Promise<void> {
  if (!storagePathOrUrl || !storagePathOrUrl.startsWith('http')) return;
  try {
    const fileRef = ref(storage, storagePathOrUrl);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Could not delete file from storage:', err);
  }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];

  if (!allowedTypes.includes(file.type) && (!ext || !allowedExts.includes(ext))) {
    return { valid: false, error: 'Invalid image format. Allowed: PNG, JPG, JPEG, WEBP.' };
  }

  // Max 10MB image limit
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image size exceeds 10MB limit.' };
  }

  return { valid: true };
}

export function validateApkFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'apk') {
    return { valid: false, error: 'Invalid file type. Only .apk files are supported.' };
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
