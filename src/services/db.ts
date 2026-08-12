import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { supabase, isSupabaseConfigured, BUCKETS } from '../lib/supabase';
import { getStoragePublicUrl, deleteStorageFile } from './storage';
import { isAdminEmail } from '../lib/admin';
import { 
  ApkItem, 
  Category, 
  Coupon, 
  Order, 
  OrderStatus,
  PlanItem, 
  Purchase, 
  ReviewItem,
  StoreSettings, 
  UserProfile 
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = removeUndefinedFields(val);
      } else {
        clean[key] = val;
      }
    }
  });
  return clean as T;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Default initial Store Settings
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  websiteName: 'AK STAR MOD',
  logoText: 'AK STAR MOD',
  upiId: 'akstarofficial@upi',
  upiQrUrl: '',
  supportEmail: 'akstarofficial732@gmail.com',
  telegramLink: 'https://t.me/akstarmod',
  whatsappLink: '',
  paymentInstructions: '1. Copy UPI ID or Scan QR Code.\n2. Open any UPI App (GPay/PhonePe/Paytm).\n3. Send exact final amount.\n4. Copy UTR / Transaction ID.\n5. Submit UTR & payment screenshot below.',
  maintenanceMode: false,
  announcementBanner: 'Welcome to AK STAR MOD — Premium Android Apps & Games',
  updatedAt: new Date().toISOString()
};

// Default Categories
export const DEFAULT_CATEGORIES: Array<Omit<Category, 'id'>> = [
  { name: 'Tools', slug: 'tools', active: true, order: 1 },
  { name: 'Games', slug: 'games', active: true, order: 2 },
  { name: 'Entertainment', slug: 'entertainment', active: true, order: 3 },
  { name: 'Music', slug: 'music', active: true, order: 4 },
  { name: 'Video', slug: 'video', active: true, order: 5 },
  { name: 'Photography', slug: 'photography', active: true, order: 6 },
  { name: 'Education', slug: 'education', active: true, order: 7 },
  { name: 'Social', slug: 'social', active: true, order: 8 },
  { name: 'Productivity', slug: 'productivity', active: true, order: 9 },
  { name: 'Other', slug: 'other', active: true, order: 10 }
];

// Seed initial default categories & store settings if not exist
export async function seedInitialDataIfNeeded() {
  try {
    // Check Settings
    const settingsRef = doc(db, 'settings', 'store');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      if (auth.currentUser && isAdminEmail(auth.currentUser.email)) {
        await setDoc(settingsRef, DEFAULT_STORE_SETTINGS);
      }
    }

    // Check Categories
    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      if (auth.currentUser && isAdminEmail(auth.currentUser.email)) {
        for (const cat of DEFAULT_CATEGORIES) {
          await addDoc(collection(db, 'categories'), {
            ...cat,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.warn('Seed initial data notice:', err);
  }
}

// ================= STORE SETTINGS =================
export function subscribeStoreSettings(callback: (settings: StoreSettings) => void): Unsubscribe {
  const settingsRef = doc(db, 'settings', 'store');
  return onSnapshot(settingsRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as StoreSettings);
    } else {
      callback(DEFAULT_STORE_SETTINGS);
    }
  }, (err) => {
    console.error('Subscribe settings error:', err);
    callback(DEFAULT_STORE_SETTINGS);
  });
}

export async function updateStoreSettings(data: Partial<StoreSettings>): Promise<void> {
  const settingsRef = doc(db, 'settings', 'store');
  await setDoc(settingsRef, removeUndefinedFields({
    ...data,
    updatedAt: new Date().toISOString()
  }), { merge: true });
}

// ================= CATEGORIES =================
export function subscribeCategories(callback: (categories: Category[]) => void): Unsubscribe {
  const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const list: Category[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Category);
    });
    callback(list);
  }, (err) => {
    console.error('Categories error:', err);
    callback([]);
  });
}

export async function addCategory(category: Omit<Category, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'categories'), removeUndefinedFields({
    ...category,
    createdAt: new Date().toISOString()
  }));
  return docRef.id;
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<void> {
  const docRef = doc(db, 'categories', id);
  const { id: _, ...rest } = category;
  await updateDoc(docRef, removeUndefinedFields({
    ...rest,
    updatedAt: new Date().toISOString()
  }));
}

export async function deleteCategory(id: string): Promise<void> {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
}

// ================= APKS =================

export function mapRowToApkItem(row: any): ApkItem {
  if (!row) return {} as ApkItem;

  const rawIconUrl = row.icon_url || row.icon_path || row.iconUrl || row.icon || '';
  const iconUrl = getStoragePublicUrl(rawIconUrl, BUCKETS.APP_IMAGES);

  const rawApkUrl = row.apk_url || row.apk_path || row.download_url || row.downloadUrl || '';
  const externalUrl = row.external_download_url || row.externalDownloadUrl || '';
  let finalDownloadUrl = externalUrl || rawApkUrl;
  
  if (!finalDownloadUrl && rawApkUrl) {
    finalDownloadUrl = getStoragePublicUrl(rawApkUrl, BUCKETS.APK_FILES);
  }

  let processedScreenshots: string[] = [];
  const rawScreenshots = row.screenshots || row.screenshot_urls || row.screenshotUrls || [];
  if (Array.isArray(rawScreenshots)) {
    processedScreenshots = rawScreenshots.map((s: string) => getStoragePublicUrl(s, BUCKETS.APP_SCREENSHOTS));
  } else if (typeof rawScreenshots === 'string') {
    try {
      const parsed = JSON.parse(rawScreenshots);
      if (Array.isArray(parsed)) {
        processedScreenshots = parsed.map((s: string) => getStoragePublicUrl(s, BUCKETS.APP_SCREENSHOTS));
      }
    } catch (e) {
      if (rawScreenshots.trim()) {
        processedScreenshots = [getStoragePublicUrl(rawScreenshots, BUCKETS.APP_SCREENSHOTS)];
      }
    }
  }

  const title = row.title || row.name || 'Untitled App';
  const categoryName = row.category || row.category_name || row.categoryName || 'General';
  
  let features: string[] = [];
  const rawFeatures = row.mod_features || row.features;
  if (Array.isArray(rawFeatures)) {
    features = rawFeatures;
  } else if (typeof rawFeatures === 'string') {
    if (rawFeatures.startsWith('[') && rawFeatures.endsWith(']')) {
      try { features = JSON.parse(rawFeatures); } catch (e) { features = rawFeatures.split(',').map(s => s.trim()); }
    } else {
      features = rawFeatures.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (!features.length) {
    features = ['Premium Unlocked', 'VIP MOD'];
  }

  const isFree = row.free_download !== undefined ? Boolean(row.free_download) : (row.is_free !== undefined ? Boolean(row.is_free) : true);
  const isFeatured = row.featured_vip !== undefined ? Boolean(row.featured_vip) : (row.is_featured !== undefined ? Boolean(row.is_featured) : Boolean(row.featured));
  const isActive = row.active_visible !== undefined ? Boolean(row.active_visible) : (row.active !== undefined ? Boolean(row.active) : (row.is_active !== undefined ? Boolean(row.is_active) : (row.status === 'published' || row.status === 'active' || row.status === undefined)));

  return {
    id: String(row.id),
    name: title,
    slug: row.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: row.description || '',
    shortDescription: row.description ? row.description.slice(0, 120) : '',
    category: categoryName,
    categoryId: row.category_id || '',
    categoryName: categoryName,
    version: row.version || '1.0.0',
    androidVersion: row.android_requirement || row.android_version || '7.0+',
    size: row.file_size || row.size || '45 MB',
    icon: iconUrl || rawIconUrl,
    iconUrl: iconUrl || rawIconUrl,
    icon_path: rawIconUrl,
    screenshots: processedScreenshots,
    screenshotUrls: processedScreenshots,
    features: features,
    changelog: row.changelog || 'Initial release',
    downloadMethod: row.download_method || (externalUrl ? 'external' : 'upload'),
    apkFilePath: rawApkUrl,
    apk_file_path: rawApkUrl,
    apkFileName: row.apk_file_name || '',
    externalDownloadUrl: externalUrl,
    downloadUrl: finalDownloadUrl,
    isFree: isFree,
    isPremium: !isFree,
    isFeatured: isFeatured,
    isActive: isActive,
    rating: Number(row.rating || 4.8),
    reviewsCount: Number(row.reviews_count || 0),
    downloadsCount: Number(row.download_count || row.downloads_count || 0),
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function upsertSupabaseApk(apk: Partial<ApkItem>): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
  }

  const now = new Date().toISOString();
  
  // Ensure ID is a valid UUID or generate a new valid UUID
  let safeId = apk.id;
  const isUuid = safeId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(safeId);
  if (!isUuid) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      safeId = crypto.randomUUID();
    } else {
      safeId = '10000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
    }
  }

  const title = (apk.name || (apk as any).title || 'Untitled App').trim();
  const category = (apk.category || 'General').trim();
  const iconUrl = apk.iconUrl || apk.icon || apk.icon_path || '';
  const apkUrl = apk.downloadUrl || apk.apk_file_path || apk.apkFilePath || '';
  const externalUrl = (apk.externalDownloadUrl || '').trim();
  const screenshots = apk.screenshots || apk.screenshotUrls || [];

  const isActive = apk.isActive !== false;
  const isFree = apk.isFree ?? false;
  const isFeatured = apk.isFeatured ?? false;

  let modFeaturesStr = '';
  if (Array.isArray(apk.features)) {
    modFeaturesStr = apk.features.join(', ');
  } else if (typeof apk.features === 'string') {
    modFeaturesStr = apk.features;
  } else {
    modFeaturesStr = 'Premium Unlocked, VIP MOD';
  }

  const payload = removeUndefinedFields({
    id: safeId,
    title: title,
    category: category,
    version: apk.version || '1.0.0',
    android_requirement: apk.androidVersion || '7.0+',
    file_size: apk.size || apk.apkFileSize || '45 MB',
    icon_url: iconUrl,
    apk_url: apkUrl,
    external_download_url: externalUrl,
    description: apk.description || '',
    mod_features: modFeaturesStr,
    changelog: apk.changelog || 'Initial release',
    screenshots: screenshots,
    free_download: isFree,
    featured_vip: isFeatured,
    active_visible: isActive,
    download_count: apk.downloadsCount || 0,
    created_at: apk.createdAt || now,
    updated_at: now
  });

  console.log(`[SUPABASE SAVE] Inserting/updating record "${safeId}" into public.apks...`, payload);
  const { data, error } = await supabase
    .from('apks')
    .upsert(payload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('[SUPABASE SAVE ERROR]', error);
    let formattedError = error.message || error.details || error.hint || String(error);
    if (error.code === 'PGRST205' || formattedError.includes('schema cache') || formattedError.includes('not found')) {
      formattedError = "Could not find the table 'public.apks' in Supabase. Please run the SQL migration script in your Supabase SQL Editor.";
    }
    throw new Error(`Database save failed: ${formattedError}`);
  }

  console.log('[SUPABASE SAVE SUCCESS]', data?.[0] || safeId);
  return safeId;
}

export async function fetchApksFromSupabase(includeInactive = false): Promise<ApkItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase.from('apks').select('*').order('created_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map(mapRowToApkItem);
      const filtered = includeInactive ? mapped : mapped.filter(a => a.isActive);
      console.log(`[APP FETCH SUCCESS] Loaded ${filtered.length} apps from Supabase table "apks"`);
      return filtered;
    } else if (error) {
      console.warn('[APP FETCH ERROR]', error.message);
    }
  } catch (e) {
    console.warn('[APP FETCH EXCEPTION] Table "apks":', e);
  }

  return [];
}

export function subscribeApks(callback: (apks: ApkItem[]) => void, includeInactive = false): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const sbApks = await fetchApksFromSupabase(includeInactive);
      if (isSubscribed) {
        callback(sbApks);
      }
    } catch (err) {
      console.warn('[SUPABASE LOAD WARNING]', err);
    }
  };

  // 1. Initial Supabase Fetch
  loadFromSupabase();

  // 2. Realtime Subscription to Supabase apks table
  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel('public_apks_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apks' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {
      console.warn('[SUPABASE REALTIME WARNING]', e);
    }
  }

  // 3. Fallback Firestore read if Supabase table is empty or unpopulated
  const apksCol = collection(db, 'apks');
  const simpleQ = includeInactive ? apksCol : query(apksCol, where('isActive', '==', true));
  const fsUnsub = onSnapshot(simpleQ, async (snap) => {
    const sbApks = await fetchApksFromSupabase(includeInactive);
    if (sbApks.length === 0 && isSubscribed) {
      const list: ApkItem[] = [];
      snap.forEach((docSnap) => {
        list.push(mapRowToApkItem({ id: docSnap.id, ...docSnap.data() }));
      });
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore fallback note:', err);
  });

  return () => {
    isSubscribed = false;
    if (supabaseChannel) {
      try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    }
    if (fsUnsub) {
      fsUnsub();
    }
  };
}

export async function getApkBySlugOrId(identifier: string): Promise<ApkItem | null> {
  if (!identifier) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data: idData } = await supabase.from('apks').select('*').eq('id', identifier).maybeSingle();
      if (idData) return mapRowToApkItem(idData);

      const { data: titleData } = await supabase.from('apks').select('*').eq('title', identifier).maybeSingle();
      if (titleData) return mapRowToApkItem(titleData);
    } catch (e) {}
  }

  try {
    const idRef = doc(db, 'apks', identifier);
    const idSnap = await getDoc(idRef);
    if (idSnap.exists()) {
      return mapRowToApkItem({ id: idSnap.id, ...idSnap.data() });
    }
  } catch (e) {}

  return null;
}

export async function addApk(apk: Partial<ApkItem>): Promise<string> {
  const savedId = await upsertSupabaseApk(apk);
  return savedId;
}

export async function updateApk(id: string, apk: Partial<ApkItem>): Promise<void> {
  await upsertSupabaseApk({ ...apk, id });
}

export async function deleteApk(id: string): Promise<void> {
  if (!id) return;

  // Cleanup Storage files if possible
  try {
    const existing = await getApkBySlugOrId(id);
    if (existing) {
      if (existing.icon_path || existing.iconUrl) {
        await deleteStorageFile(existing.icon_path || existing.iconUrl);
      }
      if (existing.apk_file_path || existing.apkFilePath) {
        await deleteStorageFile(existing.apk_file_path || existing.apkFilePath);
      }
      if (Array.isArray(existing.screenshots)) {
        for (const scr of existing.screenshots) {
          await deleteStorageFile(scr);
        }
      }
    }
  } catch (err) {
    console.warn('Storage cleanup prior to app deletion note:', err);
  }

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('apks').delete().eq('id', id);
    if (error) {
      console.error('[SUPABASE DELETE ERROR]', error);
      throw new Error(`Database delete failed: ${error.message}`);
    }
    console.log(`[SUPABASE DELETE SUCCESS] Deleted app "${id}" from public.apks`);
  }
}

// ================= PLANS =================
export function subscribePlans(apkId: string, callback: (plans: PlanItem[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'plans'), 
    where('apkId', '==', apkId)
  );
  return onSnapshot(q, (snap) => {
    const list: PlanItem[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as PlanItem);
    });
    // Sort client side by price
    list.sort((a, b) => a.price - b.price);
    callback(list);
  }, (err) => {
    console.error('Subscribe plans error:', err);
    callback([]);
  });
}

export async function getPlansForApk(apkId: string): Promise<PlanItem[]> {
  const q = query(collection(db, 'plans'), where('apkId', '==', apkId));
  const snap = await getDocs(q);
  const list: PlanItem[] = [];
  snap.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() } as PlanItem);
  });
  list.sort((a, b) => a.price - b.price);
  return list;
}

export async function addPlan(plan: Omit<PlanItem, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'plans'), removeUndefinedFields(plan));
  return docRef.id;
}

export async function updatePlan(id: string, plan: Partial<PlanItem>): Promise<void> {
  const { id: _, ...rest } = plan;
  await updateDoc(doc(db, 'plans', id), removeUndefinedFields(rest));
}

export async function deletePlan(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid plan ID provided for deletion.');
  }

  const cleanId = id.trim();

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', cleanId);

      if (error) {
        console.warn('Supabase plan deletion note:', error.message || error);
      }
    } catch (sbErr) {
      console.warn('Supabase delete plan exception:', sbErr);
    }
  }

  try {
    await deleteDoc(doc(db, 'plans', cleanId));
  } catch (fsErr: any) {
    console.error('Firestore delete plan error:', fsErr);
    throw new Error(fsErr?.message || 'Failed to delete plan from database.');
  }
}

// ================= COUPONS =================
export function subscribeCoupons(callback: (coupons: Coupon[]) => void): Unsubscribe {
  const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: Coupon[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Coupon);
    });
    callback(list);
  }, (err) => {
    console.error('Subscribe coupons error:', err);
    callback([]);
  });
}

export async function validateCoupon(code: string, amount: number, userId?: string): Promise<{
  valid: boolean;
  message?: string;
  coupon?: Coupon;
  discountAmount?: number;
}> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Please enter a coupon code' };
  }

  const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    return { valid: false, message: 'Invalid coupon code' };
  }

  const couponDoc = snap.docs[0];
  const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

  if (!coupon.active) {
    return { valid: false, message: 'This coupon is no longer active' };
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { valid: false, message: 'Coupon is not yet active' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
    return { valid: false, message: 'Coupon has expired' };
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'Coupon maximum usage limit reached' };
  }

  if (coupon.minPurchase > 0 && amount < coupon.minPurchase) {
    return { valid: false, message: `Minimum purchase amount for this coupon is ₹${coupon.minPurchase}` };
  }

  // Per user limit check
  if (userId && coupon.perUserLimit > 0) {
    const userOrdersQ = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      where('couponCode', '==', cleanCode),
      where('status', 'in', ['APPROVED', 'COUPON_FREE'])
    );
    const userOrdersSnap = await getDocs(userOrdersQ);
    if (userOrdersSnap.size >= coupon.perUserLimit) {
      return { valid: false, message: 'You have reached the usage limit for this coupon' };
    }
  }

  // Calculate discount
  let rawDiscount = (amount * coupon.discountPercent) / 100;
  if (coupon.maxDiscount > 0 && rawDiscount > coupon.maxDiscount) {
    rawDiscount = coupon.maxDiscount;
  }

  const discountAmount = Math.min(amount, Math.round(rawDiscount));

  return {
    valid: true,
    coupon,
    discountAmount,
    message: coupon.discountPercent === 100 
      ? '100% OFF Coupon Applied! Free access unlocked.' 
      : `${coupon.discountPercent}% OFF Applied!`
  };
}

export async function addCoupon(coupon: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'coupons'), removeUndefinedFields({
    ...coupon,
    code: coupon.code.toUpperCase().trim(),
    usedCount: 0,
    createdAt: new Date().toISOString()
  }));
  return docRef.id;
}

export async function updateCoupon(id: string, coupon: Partial<Coupon>): Promise<void> {
  const { id: _, ...rest } = coupon;
  const data: any = { ...rest };
  if (data.code) {
    data.code = data.code.toUpperCase().trim();
  }
  await updateDoc(doc(db, 'coupons', id), removeUndefinedFields(data));
}

export async function deleteCoupon(id: string): Promise<void> {
  await deleteDoc(doc(db, 'coupons', id));
}

// ================= ORDERS & PURCHASES =================
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<{ orderId: string; status: OrderStatus; purchaseId?: string }> {
  const now = new Date().toISOString();
  let status: OrderStatus = 'PENDING';

  // Check if final price is 0 (100% discount or free)
  if (orderData.finalPrice <= 0) {
    status = 'COUPON_FREE';
  }

  const newOrderDoc = await addDoc(collection(db, 'orders'), removeUndefinedFields({
    ...orderData,
    status,
    createdAt: now,
    updatedAt: now
  }));

  const orderId = newOrderDoc.id;

  // Increment coupon usage count if used
  if (orderData.couponCode) {
    const q = query(collection(db, 'coupons'), where('code', '==', orderData.couponCode.toUpperCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const cDoc = snap.docs[0];
      const currentCount = cDoc.data().usedCount || 0;
      await updateDoc(doc(db, 'coupons', cDoc.id), {
        usedCount: currentCount + 1
      });
    }
  }

  // If status is COUPON_FREE, automatically create active Purchase entitlement right away!
  if (status === 'COUPON_FREE') {
    const purchaseId = await createPurchaseFromOrder({
      id: orderId,
      ...orderData,
      status,
      createdAt: now,
      updatedAt: now
    });
    return { orderId, status, purchaseId };
  }

  return { orderId, status };
}

export async function submitPaymentProof(orderId: string, utr: string, screenshotUrl: string, storagePath?: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, removeUndefinedFields({
    utr: utr.trim(),
    screenshotUrl: screenshotUrl.trim(),
    screenshot_path: storagePath || screenshotUrl.trim(),
    status: 'PENDING',
    updatedAt: new Date().toISOString()
  }));
}

export function subscribeUserOrders(userId: string, callback: (orders: Order[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const list: Order[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Order);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error('User orders error:', err);
    callback([]);
  });
}

export function subscribeAllOrders(callback: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, 'orders'));
  return onSnapshot(q, (snap) => {
    const list: Order[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Order);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error('All orders error:', err);
    callback([]);
  });
}

export async function approveOrder(orderId: string): Promise<string> {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error('Order not found');
  }

  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
  const now = new Date().toISOString();

  await updateDoc(orderRef, {
    status: 'APPROVED',
    updatedAt: now
  });

  // Create active purchase entitlement
  return await createPurchaseFromOrder(order);
}

export async function rejectOrder(orderId: string, reason: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: 'REJECTED',
    rejectionReason: reason || 'Payment could not be verified.',
    updatedAt: new Date().toISOString()
  });
}

async function createPurchaseFromOrder(order: Order): Promise<string> {
  const now = new Date();
  const startDate = now.toISOString();
  
  // Expiry date calculation based on durationDays
  const expiryTime = now.getTime() + (order.durationDays * 24 * 60 * 60 * 1000);
  const expiryDate = new Date(expiryTime).toISOString();

  // Get current APK download URL
  const apkSnap = await getDoc(doc(db, 'apks', order.apkId));
  const apkData = apkSnap.exists() ? apkSnap.data() as ApkItem : null;

  const purchaseData: Omit<Purchase, 'id'> = {
    orderId: order.id,
    userId: order.userId,
    userEmail: order.userEmail,
    apkId: order.apkId,
    apkName: order.apkName,
    apkIcon: order.apkIcon || (apkData ? apkData.icon : ''),
    planName: order.planName,
    durationDays: order.durationDays,
    startDate,
    expiryDate,
    status: 'ACTIVE',
    downloadUrl: apkData?.downloadUrl || '',
    createdAt: startDate
  };

  const docRef = await addDoc(collection(db, 'purchases'), removeUndefinedFields(purchaseData));
  return docRef.id;
}

export function subscribeUserPurchases(userId: string, callback: (purchases: Purchase[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'purchases'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, async (snap) => {
    const list: Purchase[] = [];
    const now = new Date();

    for (const docSnap of snap.docs) {
      const data = { id: docSnap.id, ...docSnap.data() } as Purchase;
      
      // Auto-update expired purchases if date passed
      if (data.status === 'ACTIVE' && new Date(data.expiryDate) < now) {
        data.status = 'EXPIRED';
        updateDoc(doc(db, 'purchases', data.id), { status: 'EXPIRED' }).catch(console.error);
      }
      list.push(data);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error('Subscribe purchases error:', err);
    callback([]);
  });
}

export async function checkApkAccess(userId: string | undefined, apkId: string): Promise<{
  hasAccess: boolean;
  purchase?: Purchase;
  isFree?: boolean;
}> {
  // First check if APK itself is free
  const apkSnap = await getDoc(doc(db, 'apks', apkId));
  if (apkSnap.exists() && apkSnap.data().isFree) {
    return { hasAccess: true, isFree: true };
  }

  if (!userId) {
    return { hasAccess: false };
  }

  // Check active purchases
  const q = query(
    collection(db, 'purchases'),
    where('userId', '==', userId),
    where('apkId', '==', apkId),
    where('status', '==', 'ACTIVE')
  );

  const snap = await getDocs(q);
  const now = new Date();

  for (const docSnap of snap.docs) {
    const p = { id: docSnap.id, ...docSnap.data() } as Purchase;
    if (new Date(p.expiryDate) > now) {
      return { hasAccess: true, purchase: p };
    } else {
      // mark expired
      updateDoc(doc(db, 'purchases', p.id), { status: 'EXPIRED' }).catch(console.error);
    }
  }

  return { hasAccess: false };
}

// ================= ADMIN STATS & USERS =================
export function subscribeUsers(callback: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'));
  return onSnapshot(q, (snap) => {
    const list: UserProfile[] = [];
    snap.forEach((docSnap) => {
      list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
    });
    callback(list);
  }, (err) => {
    console.error('Subscribe users error:', err);
    callback([]);
  });
}

// ================= REVIEWS & RATINGS =================
export function subscribeApkReviews(apkId: string, callback: (reviews: ReviewItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'reviews'), where('apkId', '==', apkId));
  return onSnapshot(q, (snap) => {
    const list: ReviewItem[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ReviewItem);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error('Subscribe reviews error:', err);
    callback([]);
  });
}

export async function recalculateApkRating(apkId: string): Promise<void> {
  try {
    const q = query(collection(db, 'reviews'), where('apkId', '==', apkId));
    const snap = await getDocs(q);
    let totalStars = 0;
    const count = snap.size;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      totalStars += (data.rating || 5);
    });
    const avgRating = count > 0 ? Number((totalStars / count).toFixed(1)) : 4.8;
    await updateDoc(doc(db, 'apks', apkId), {
      rating: avgRating,
      reviewsCount: count,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not recalculate APK rating:', err);
  }
}

export async function addOrUpdateReview(reviewData: {
  id?: string;
  apkId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  rating: number;
  comment: string;
}): Promise<string> {
  const now = new Date().toISOString();
  let reviewId = reviewData.id;

  // Check if user already submitted a review for this APK if no id provided
  if (!reviewId) {
    const q = query(
      collection(db, 'reviews'),
      where('apkId', '==', reviewData.apkId),
      where('userId', '==', reviewData.userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      reviewId = snap.docs[0].id;
    }
  }

  if (reviewId) {
    const docRef = doc(db, 'reviews', reviewId);
    await updateDoc(docRef, removeUndefinedFields({
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
      userName: reviewData.userName,
      userPhotoURL: reviewData.userPhotoURL || '',
      updatedAt: now
    }));
  } else {
    const docRef = await addDoc(collection(db, 'reviews'), removeUndefinedFields({
      apkId: reviewData.apkId,
      userId: reviewData.userId,
      userName: reviewData.userName,
      userPhotoURL: reviewData.userPhotoURL || '',
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
      createdAt: now,
      updatedAt: now
    }));
    reviewId = docRef.id;
  }

  // Recalculate average rating & reviews count on APK doc
  await recalculateApkRating(reviewData.apkId);

  return reviewId;
}

export async function deleteReview(reviewId: string, apkId: string): Promise<void> {
  const docRef = doc(db, 'reviews', reviewId);
  await deleteDoc(docRef);
  await recalculateApkRating(apkId);
}

