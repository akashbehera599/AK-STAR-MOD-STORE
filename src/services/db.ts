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
  PurchaseStatus,
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
    if (isSupabaseConfigured()) {
      // Check Categories in Supabase
      const { data: catData } = await supabase.from('categories').select('id').limit(1);
      if (!catData || catData.length === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}_${cat.order}`;
          await supabase.from('categories').upsert({
            id: safeId,
            name: cat.name,
            slug: cat.slug,
            active: cat.active,
            "order": cat.order,
            created_at: new Date().toISOString()
          });
        }
      }

      // Check Store Settings in Supabase
      const { data: setRow } = await supabase.from('store_settings').select('id').limit(1).maybeSingle();
      if (!setRow) {
        await supabase.from('store_settings').upsert({
          id: 'store',
          website_name: DEFAULT_STORE_SETTINGS.websiteName,
          logo_text: DEFAULT_STORE_SETTINGS.logoText,
          upi_id: DEFAULT_STORE_SETTINGS.upiId,
          support_email: DEFAULT_STORE_SETTINGS.supportEmail,
          telegram_link: DEFAULT_STORE_SETTINGS.telegramLink,
          payment_instructions: DEFAULT_STORE_SETTINGS.paymentInstructions,
          maintenance_mode: false,
          announcement_banner: DEFAULT_STORE_SETTINGS.announcementBanner,
          updated_at: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Seed initial data notice:', err);
  }
}

// ================= ROW MAPPERS =================
export function mapRowToCategory(row: any): Category {
  return {
    id: String(row.id),
    name: row.name || '',
    slug: row.slug || (row.name ? row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''),
    iconName: row.icon_name || row.iconName || '',
    active: row.active !== undefined ? Boolean(row.active) : true,
    order: Number(row.order || 0)
  };
}

export function mapRowToPlan(row: any): PlanItem {
  return {
    id: String(row.id || ''),
    apkId: String(row.apk_id || row.apkId || ''),
    name: row.name || 'Access Plan',
    durationDays: Number(row.duration_days || row.durationDays || 30),
    durationUnit: row.duration_unit || row.durationUnit || 'days',
    price: Number(row.price !== undefined && row.price !== null ? row.price : 0),
    active: row.active !== undefined ? Boolean(row.active) : true,
    createdAt: row.created_at || row.createdAt || undefined,
    updatedAt: row.updated_at || row.updatedAt || undefined
  };
}

export function mapRowToCoupon(row: any): Coupon {
  return {
    id: String(row.id),
    code: String(row.code || '').toUpperCase(),
    discountPercent: Number(row.discount_percent || row.discountPercent || 0),
    minPurchase: Number(row.min_purchase || row.minPurchase || 0),
    maxDiscount: Number(row.max_discount || row.maxDiscount || 0),
    startDate: row.start_date || row.startDate || '',
    expiryDate: row.expiry_date || row.expiryDate || '',
    usageLimit: Number(row.usage_limit || row.usageLimit || 0),
    usedCount: Number(row.used_count || row.usedCount || 0),
    perUserLimit: Number(row.per_user_limit || row.perUserLimit || 1),
    active: row.active !== undefined ? Boolean(row.active) : true,
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

export function mapRowToStoreSettings(row: any): StoreSettings {
  if (!row) return DEFAULT_STORE_SETTINGS;
  return {
    websiteName: row.website_name || row.websiteName || DEFAULT_STORE_SETTINGS.websiteName,
    logoText: row.logo_text || row.logoText || DEFAULT_STORE_SETTINGS.logoText,
    logoUrl: getStoragePublicUrl(row.logo_url || row.logoUrl || row.logo_path || '', BUCKETS.STORE_ASSETS),
    logo_path: row.logo_path || row.logo_url || row.logoUrl || '',
    faviconUrl: getStoragePublicUrl(row.favicon_url || row.faviconUrl || row.favicon_path || '', BUCKETS.STORE_ASSETS),
    favicon_path: row.favicon_path || row.favicon_url || row.faviconUrl || '',
    upiId: row.upi_id || row.upiId || DEFAULT_STORE_SETTINGS.upiId,
    upiQrUrl: getStoragePublicUrl(row.upi_qr_url || row.upiQrUrl || row.payment_qr_path || '', BUCKETS.STORE_ASSETS),
    payment_qr_path: row.payment_qr_path || row.upi_qr_url || row.upiQrUrl || '',
    supportEmail: row.support_email || row.supportEmail || DEFAULT_STORE_SETTINGS.supportEmail,
    telegramLink: row.telegram_link || row.telegramLink || DEFAULT_STORE_SETTINGS.telegramLink,
    whatsappLink: row.whatsapp_link || row.whatsappLink || DEFAULT_STORE_SETTINGS.whatsappLink,
    paymentInstructions: row.payment_instructions || row.paymentInstructions || DEFAULT_STORE_SETTINGS.paymentInstructions,
    maintenanceMode: row.maintenance_mode !== undefined ? Boolean(row.maintenance_mode) : Boolean(row.maintenanceMode),
    announcementBanner: row.announcement_banner || row.announcementBanner || DEFAULT_STORE_SETTINGS.announcementBanner,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

export function mapRowToOrder(row: any): Order {
  return {
    id: String(row.id),
    userId: String(row.user_id || row.userId || ''),
    userEmail: row.user_email || row.userEmail || '',
    userName: row.user_name || row.userName || 'User',
    apkId: String(row.apk_id || row.apkId || ''),
    apkName: row.apk_name || row.apkName || '',
    apkIcon: getStoragePublicUrl(row.apk_icon || row.apkIcon || '', BUCKETS.APP_IMAGES),
    planId: String(row.plan_id || row.planId || ''),
    planName: row.plan_name || row.planName || '',
    durationDays: Number(row.duration_days || row.durationDays || 30),
    originalPrice: Number(row.original_price || row.originalPrice || 0),
    couponCode: row.coupon_code || row.couponCode || '',
    discountPercent: Number(row.discount_percent || row.discountPercent || 0),
    discountAmount: Number(row.discount_amount || row.discountAmount || 0),
    finalPrice: Number(row.final_price || row.finalPrice || 0),
    upiId: row.upi_id || row.upiId || '',
    utr: row.utr || '',
    screenshotUrl: getStoragePublicUrl(row.screenshot_url || row.screenshotUrl || row.screenshot_path || '', BUCKETS.PAYMENT_PROOFS),
    screenshot_path: row.screenshot_path || row.screenshot_url || row.screenshotUrl || '',
    status: row.status as OrderStatus,
    rejectionReason: row.rejection_reason || row.rejectionReason || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

export function mapRowToPurchase(row: any): Purchase {
  return {
    id: String(row.id),
    orderId: String(row.order_id || row.orderId || ''),
    userId: String(row.user_id || row.userId || ''),
    userEmail: row.user_email || row.userEmail || '',
    apkId: String(row.apk_id || row.apkId || ''),
    apkName: row.apk_name || row.apkName || '',
    apkIcon: getStoragePublicUrl(row.apk_icon || row.apkIcon || '', BUCKETS.APP_IMAGES),
    planName: row.plan_name || row.planName || '',
    durationDays: Number(row.duration_days || row.durationDays || 30),
    startDate: row.start_date || row.startDate || new Date().toISOString(),
    expiryDate: row.expiry_date || row.expiryDate || new Date().toISOString(),
    status: row.status as PurchaseStatus,
    downloadUrl: row.download_url || row.downloadUrl || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
}

export function mapRowToReview(row: any): ReviewItem {
  return {
    id: String(row.id),
    apkId: String(row.apk_id || row.apkId || ''),
    userId: String(row.user_id || row.userId || ''),
    userName: row.user_name || row.userName || 'Anonymous',
    userPhotoURL: row.user_photo_url || row.userPhotoURL || '',
    rating: Number(row.rating || 5),
    comment: row.comment || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

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
  const packageName = row.package_name || row.packageName || '';
  
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
    packageName: packageName,
    package_name: packageName,
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
    price: Number(row.price || 0),
    currency: row.currency || 'INR',
    accessDuration: row.access_duration || row.accessDuration || '30 Days',
    startDate: row.start_date || row.startDate || '',
    expiryDate: row.expiry_date || row.expiryDate || '',
    isFree: isFree,
    isPremium: !isFree,
    isFeatured: isFeatured,
    isActive: isActive,
    rating: Number(row.rating || 4.8),
    reviewsCount: Number(row.reviews_count || row.reviewsCount || 0),
    downloadsCount: Number(row.download_count || row.downloads_count || 0),
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

// ================= STORE SETTINGS =================
export function subscribeStoreSettings(callback: (settings: StoreSettings) => void): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('store_settings').select('*').limit(1).maybeSingle();
      if (!error && data && isSubscribed) {
        callback(mapRowToStoreSettings(data));
        return;
      }
    } catch (e) {}

    if (isSubscribed) {
      callback(DEFAULT_STORE_SETTINGS);
    }
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`store_settings_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  // Fallback to Firestore if needed
  const settingsRef = doc(db, 'settings', 'store');
  const fsUnsub = onSnapshot(settingsRef, (snap) => {
    if (snap.exists() && isSubscribed) {
      callback(mapRowToStoreSettings(snap.data()));
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export async function updateStoreSettings(data: Partial<StoreSettings>): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: 'store',
      website_name: data.websiteName,
      logo_text: data.logoText,
      logo_url: data.logoUrl || data.logo_path,
      favicon_url: data.faviconUrl || data.favicon_path,
      upi_id: data.upiId,
      upi_qr_url: data.upiQrUrl || data.payment_qr_path,
      support_email: data.supportEmail,
      telegram_link: data.telegramLink,
      whatsapp_link: data.whatsappLink,
      payment_instructions: data.paymentInstructions,
      maintenance_mode: data.maintenanceMode,
      announcement_banner: data.announcementBanner,
      updated_at: now
    });

    const { error } = await supabase.from('store_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[SUPABASE SETTINGS UPDATE ERROR]', error);
      throw new Error(`Store settings update failed: ${error.message}`);
    }
  }

  try {
    const settingsRef = doc(db, 'settings', 'store');
    await setDoc(settingsRef, removeUndefinedFields({ ...data, updatedAt: now }), { merge: true });
  } catch (e) {}
}

// ================= CATEGORIES =================
export function subscribeCategories(callback: (categories: Category[]) => void): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('categories').select('*').order('order', { ascending: true });
      if (!error && data && isSubscribed) {
        callback(data.map(mapRowToCategory));
        return;
      }
    } catch (e) {}
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`categories_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed && snap.docs.length > 0) {
      const list: Category[] = [];
      snap.forEach(docSnap => list.push(mapRowToCategory({ id: docSnap.id, ...docSnap.data() })));
      callback(list);
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export async function addCategory(category: Omit<Category, 'id'>): Promise<string> {
  const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`;
  const now = new Date().toISOString();
  let fsSuccess = false;

  try {
    await setDoc(doc(db, 'categories', safeId), removeUndefinedFields({ ...category, id: safeId, createdAt: now }));
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safeId,
      name: category.name.trim(),
      slug: category.slug || category.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon_name: category.iconName || '',
      active: category.active !== false,
      order: category.order || 0,
      created_at: now,
      updated_at: now
    });

    try {
      const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('[SUPABASE ADD CATEGORY NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Category add failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Category add failed');
    }
  }

  return safeId;
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<void> {
  const now = new Date().toISOString();
  let fsSuccess = false;

  try {
    const docRef = doc(db, 'categories', id);
    const { id: _, ...rest } = category;
    await setDoc(docRef, removeUndefinedFields({ ...rest, updatedAt: now }), { merge: true });
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id,
      name: category.name ? category.name.trim() : undefined,
      slug: category.slug,
      icon_name: category.iconName,
      active: category.active,
      order: category.order,
      updated_at: now
    });

    try {
      const { error } = await supabase.from('categories').update(payload).eq('id', id);
      if (error) {
        console.warn('[SUPABASE UPDATE CATEGORY NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Category update failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Category update failed');
    }
  }
}

export async function deleteCategory(id: string): Promise<void> {
  let fsSuccess = false;
  try {
    await deleteDoc(doc(db, 'categories', id));
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        console.warn('[SUPABASE DELETE CATEGORY NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Category delete failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Category delete failed');
    }
  }
}

// ================= APKS =================
export async function upsertSupabaseApk(apk: Partial<ApkItem>): Promise<string> {
  const now = new Date().toISOString();
  
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
  const packageName = (apk.packageName || apk.package_name || '').trim();
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

  // 1. Save to Firestore for instant fallback availability
  let fsSuccess = false;
  try {
    await setDoc(doc(db, 'apks', safeId), removeUndefinedFields({
      ...apk,
      id: safeId,
      name: title,
      title: title,
      category: category,
      categoryName: category,
      packageName: packageName,
      package_name: packageName,
      icon: iconUrl,
      iconUrl: iconUrl,
      downloadUrl: apkUrl || externalUrl,
      apkFilePath: apkUrl,
      externalDownloadUrl: externalUrl,
      screenshots: screenshots,
      createdAt: apk.createdAt || now,
      updatedAt: now,
      isActive: isActive
    }), { merge: true });
    fsSuccess = true;
  } catch (fsErr) {
    console.warn('Firestore save apk notice:', fsErr);
  }

  // 2. Save to Supabase if configured
  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safeId,
      title: title,
      category: category,
      category_id: apk.categoryId || '',
      version: apk.version || '1.0.0',
      android_requirement: apk.androidVersion || '7.0+',
      package_name: packageName,
      file_size: apk.size || apk.apkFileSize || '45 MB',
      icon_url: iconUrl,
      apk_url: apkUrl,
      external_download_url: externalUrl,
      description: apk.description || '',
      mod_features: modFeaturesStr,
      changelog: apk.changelog || 'Initial release',
      screenshots: screenshots,
      price: apk.price || 0,
      currency: apk.currency || 'INR',
      access_duration: apk.accessDuration || '30 Days',
      start_date: apk.startDate || now,
      expiry_date: apk.expiryDate || null,
      free_download: isFree,
      featured_vip: isFeatured,
      active_visible: isActive,
      download_count: apk.downloadsCount || 0,
      created_at: apk.createdAt || now,
      updated_at: now
    });

    try {
      const { data, error } = await supabase
        .from('apks')
        .upsert(payload, { onConflict: 'id' })
        .select();

      if (error) {
        console.warn('[SUPABASE SAVE APK NOTICE]', error.message);
        if (error.code === 'PGRST205' || error.message.includes('schema cache') || error.message.includes('not found')) {
          console.warn("Could not find table 'public.apks' in Supabase. Run /supabase/schema.sql in Supabase SQL Editor.");
        } else if (!fsSuccess) {
          throw new Error(`Database save failed: ${error.message}`);
        }
      } else {
        console.log('[SUPABASE SAVE SUCCESS]', data?.[0] || safeId);
      }
    } catch (sbErr: any) {
      if (!fsSuccess) {
        throw new Error(sbErr?.message || 'Database save failed');
      }
    }
  }

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
  let currentApks: ApkItem[] = [];

  const updateAndEmit = (newList: ApkItem[]) => {
    currentApks = newList;
    if (isSubscribed) {
      callback(currentApks);
    }
  };

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const sbApks = await fetchApksFromSupabase(includeInactive);
      if (isSubscribed) {
        updateAndEmit(sbApks);
      }
    } catch (err) {
      console.warn('[SUPABASE LOAD WARNING]', err);
    }
  };

  // 1. Initial Load
  loadFromSupabase();

  // 2. Realtime Subscription to Supabase apks table
  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      const channelName = `ak-star-mod-store-apks-${includeInactive ? 'admin' : 'user'}-${Math.random().toString(36).substring(2, 7)}`;
      supabaseChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'apks'
          },
          (payload: any) => {
            console.log('APK database change:', payload);

            if (payload.eventType === 'INSERT') {
              const newItem = mapRowToApkItem(payload.new);
              if (includeInactive || newItem.isActive) {
                const index = currentApks.findIndex(a => a.id === newItem.id);
                if (index >= 0) {
                  const updated = [...currentApks];
                  updated[index] = newItem;
                  updateAndEmit(updated);
                } else {
                  updateAndEmit([newItem, ...currentApks]);
                }
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedItem = mapRowToApkItem(payload.new);
              const index = currentApks.findIndex(a => a.id === updatedItem.id);
              if (includeInactive || updatedItem.isActive) {
                if (index >= 0) {
                  const updated = [...currentApks];
                  updated[index] = updatedItem;
                  updateAndEmit(updated);
                } else {
                  updateAndEmit([updatedItem, ...currentApks]);
                }
              } else {
                if (index >= 0) {
                  updateAndEmit(currentApks.filter(a => a.id !== updatedItem.id));
                }
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = String(payload.old?.id || payload.new?.id || '');
              if (deletedId) {
                updateAndEmit(currentApks.filter(a => a.id !== deletedId));
              }
            }

            // Sync with backend
            loadFromSupabase();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime status: SUBSCRIBED');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime status: ${status}, keeping current store data visible`);
          }
        });
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
      updateAndEmit(list);
    }
  }, (err) => {
    console.warn('Firestore fallback note:', err);
  });

  return () => {
    isSubscribed = false;
    if (supabaseChannel) {
      try {
        supabase.removeChannel(supabaseChannel);
      } catch (e) {}
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
  if (!apkId) {
    callback([]);
    return () => {};
  }

  let isSubscribed = true;
  let sbPlans: PlanItem[] = [];
  let fsPlans: PlanItem[] = [];

  const emitCombined = () => {
    if (!isSubscribed) return;
    const map = new Map<string, PlanItem>();

    for (const p of fsPlans) {
      if (p && p.id && p.apkId === apkId) {
        map.set(p.id, p);
      }
    }

    for (const p of sbPlans) {
      if (p && p.id && p.apkId === apkId) {
        const existing = map.get(p.id);
        if (existing) {
          map.set(p.id, {
            ...existing,
            ...p,
            price: p.price !== undefined && p.price !== null ? p.price : existing.price,
            name: p.name || existing.name,
            durationDays: p.durationDays || existing.durationDays,
            active: p.active !== undefined ? p.active : existing.active
          });
        } else {
          map.set(p.id, p);
        }
      }
    }

    const combined = Array.from(map.values()).sort((a, b) => a.price - b.price);
    callback(combined);
  };

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured() || !apkId) return;
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('apk_id', apkId)
        .order('price', { ascending: true });

      if (!error && data) {
        sbPlans = data.map(mapRowToPlan);
        emitCombined();
      }
    } catch (err) {
      console.warn('[SUPABASE SUBSCRIBE PLANS NOTICE]', err);
    }
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`plans_${apkId}_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'plans'), where('apkId', '==', apkId));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed) {
      const list: PlanItem[] = [];
      snap.forEach(docSnap => list.push(mapRowToPlan({ id: docSnap.id, ...docSnap.data() })));
      fsPlans = list;
      emitCombined();
    }
  }, (err) => {
    console.warn('[FIRESTORE SUBSCRIBE PLANS ERROR]', err);
  });

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export async function getPlansForApk(apkId: string): Promise<PlanItem[]> {
  if (!apkId) return [];

  const map = new Map<string, PlanItem>();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('apk_id', apkId)
        .order('price', { ascending: true });

      if (!error && data && data.length > 0) {
        data.map(mapRowToPlan).forEach(p => {
          if (p.id) map.set(p.id, p);
        });
      }
    } catch (err) {
      console.warn('[GET PLANS SUPABASE NOTICE]', err);
    }
  }

  try {
    const q = query(collection(db, 'plans'), where('apkId', '==', apkId));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const p = mapRowToPlan({ id: docSnap.id, ...docSnap.data() });
      if (p.id) {
        if (!map.has(p.id)) {
          map.set(p.id, p);
        } else {
          const existing = map.get(p.id)!;
          map.set(p.id, {
            ...p,
            ...existing,
            price: existing.price !== undefined ? existing.price : p.price
          });
        }
      }
    });
  } catch (e) {
    console.warn('[GET PLANS FIRESTORE NOTICE]', e);
  }

  const list = Array.from(map.values()).sort((a, b) => a.price - b.price);
  return list;
}

export async function addPlan(plan: Omit<PlanItem, 'id'>): Promise<string> {
  const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `plan_${Date.now()}`;
  const now = new Date().toISOString();

  const planObj: PlanItem = {
    id: safeId,
    apkId: String(plan.apkId),
    name: plan.name ? plan.name.trim() : '30 Days Access',
    durationDays: Number(plan.durationDays || 30),
    durationUnit: plan.durationUnit || 'days',
    price: Number(plan.price !== undefined ? plan.price : 0),
    active: plan.active !== false,
    createdAt: plan.createdAt || now,
    updatedAt: now
  };

  // 1. Dual-write to Firestore for instant fallback availability
  let fsSuccess = false;
  try {
    await setDoc(doc(db, 'plans', safeId), removeUndefinedFields({
      ...planObj
    }));
    fsSuccess = true;
  } catch (e) {
    console.warn('Firestore add plan notice:', e);
  }

  // 2. Dual-write to Supabase if configured
  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safeId,
      apk_id: planObj.apkId,
      name: planObj.name,
      duration_days: planObj.durationDays,
      duration_unit: planObj.durationUnit,
      price: planObj.price,
      active: planObj.active,
      created_at: planObj.createdAt,
      updated_at: planObj.updatedAt
    });

    try {
      const { error } = await supabase.from('plans').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('[SUPABASE ADD PLAN NOTICE]', error.message);
        if (error.code === 'PGRST205' || error.message.includes('schema cache') || error.message.includes('not found')) {
          console.warn(`[SUPABASE MIGRATION REQUIRED] Table 'public.plans' was not found in Supabase. Please run '/supabase/schema.sql' in your Supabase SQL Editor.`);
        } else if (!fsSuccess) {
          throw new Error(`Plan add failed: ${error.message}`);
        }
      }
    } catch (sbErr: any) {
      if (!fsSuccess) {
        throw new Error(sbErr?.message || 'Plan add failed');
      }
    }
  }

  return safeId;
}

export async function updatePlan(id: string, plan: Partial<PlanItem>): Promise<void> {
  const now = new Date().toISOString();
  let fsSuccess = false;

  try {
    const { id: _, ...rest } = plan;
    await setDoc(doc(db, 'plans', id), removeUndefinedFields({ ...rest, updatedAt: now }), { merge: true });
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id,
      apk_id: plan.apkId,
      name: plan.name ? plan.name.trim() : undefined,
      duration_days: plan.durationDays !== undefined ? Number(plan.durationDays) : undefined,
      price: plan.price !== undefined ? Number(plan.price) : undefined,
      active: plan.active,
      updated_at: now
    });

    try {
      const { error } = await supabase.from('plans').update(payload).eq('id', id);
      if (error) {
        console.warn('[SUPABASE UPDATE PLAN NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Plan update failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Plan update failed');
    }
  }
}

export async function deletePlan(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('Invalid plan ID provided for deletion.');
  }

  const cleanId = id.trim();
  let fsSuccess = false;

  try {
    await deleteDoc(doc(db, 'plans', cleanId));
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('plans').delete().eq('id', cleanId);
      if (error) {
        console.warn('[SUPABASE DELETE PLAN NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Plan deletion failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Plan deletion failed');
    }
  }
}

// ================= COUPONS =================
export function subscribeCoupons(callback: (coupons: Coupon[]) => void): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (!error && data && isSubscribed) {
        callback(data.map(mapRowToCoupon));
        return;
      }
    } catch (err) {}
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`coupons_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed && snap.docs.length > 0) {
      const list: Coupon[] = [];
      snap.forEach(docSnap => list.push(mapRowToCoupon({ id: docSnap.id, ...docSnap.data() })));
      callback(list);
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
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

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (!error && data) {
        const coupon = mapRowToCoupon(data);
        if (!coupon.active) return { valid: false, message: 'This coupon is no longer active' };

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
    } catch (e) {}
  }

  // Fallback check in Firestore
  try {
    const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const couponDoc = snap.docs[0];
      const coupon = mapRowToCoupon({ id: couponDoc.id, ...couponDoc.data() });
      if (!coupon.active) return { valid: false, message: 'This coupon is no longer active' };

      let rawDiscount = (amount * coupon.discountPercent) / 100;
      if (coupon.maxDiscount > 0 && rawDiscount > coupon.maxDiscount) {
        rawDiscount = coupon.maxDiscount;
      }
      const discountAmount = Math.min(amount, Math.round(rawDiscount));
      return {
        valid: true,
        coupon,
        discountAmount,
        message: coupon.discountPercent === 100 ? '100% OFF Coupon Applied!' : `${coupon.discountPercent}% OFF Applied!`
      };
    }
  } catch (e) {}

  return { valid: false, message: 'Invalid coupon code' };
}

export async function addCoupon(coupon: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Promise<string> {
  const safeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `coupon_${Date.now()}`;
  const now = new Date().toISOString();
  let fsSuccess = false;

  try {
    await setDoc(doc(db, 'coupons', safeId), removeUndefinedFields({
      ...coupon,
      id: safeId,
      code: coupon.code.toUpperCase().trim(),
      usedCount: 0,
      createdAt: now
    }));
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safeId,
      code: coupon.code.toUpperCase().trim(),
      discount_percent: coupon.discountPercent,
      min_purchase: coupon.minPurchase,
      max_discount: coupon.maxDiscount,
      start_date: coupon.startDate,
      expiry_date: coupon.expiryDate,
      usage_limit: coupon.usageLimit,
      used_count: 0,
      per_user_limit: coupon.perUserLimit || 1,
      active: coupon.active !== false,
      created_at: now,
      updated_at: now
    });

    try {
      const { error } = await supabase.from('coupons').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('[SUPABASE ADD COUPON NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Coupon add failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Coupon add failed');
    }
  }

  return safeId;
}

export async function updateCoupon(id: string, coupon: Partial<Coupon>): Promise<void> {
  const now = new Date().toISOString();
  let fsSuccess = false;

  try {
    const { id: _, ...rest } = coupon;
    const data: any = { ...rest, updatedAt: now };
    if (data.code) data.code = data.code.toUpperCase().trim();
    await setDoc(doc(db, 'coupons', id), removeUndefinedFields(data), { merge: true });
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id,
      code: coupon.code ? coupon.code.toUpperCase().trim() : undefined,
      discount_percent: coupon.discountPercent,
      min_purchase: coupon.minPurchase,
      max_discount: coupon.maxDiscount,
      start_date: coupon.startDate,
      expiry_date: coupon.expiryDate,
      usage_limit: coupon.usageLimit,
      used_count: coupon.usedCount,
      per_user_limit: coupon.perUserLimit,
      active: coupon.active,
      updated_at: now
    });

    try {
      const { error } = await supabase.from('coupons').update(payload).eq('id', id);
      if (error) {
        console.warn('[SUPABASE UPDATE COUPON NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Coupon update failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Coupon update failed');
    }
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  let fsSuccess = false;
  try {
    await deleteDoc(doc(db, 'coupons', id));
    fsSuccess = true;
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) {
        console.warn('[SUPABASE DELETE COUPON NOTICE]', error.message);
        if (!fsSuccess) throw new Error(`Coupon deletion failed: ${error.message}`);
      }
    } catch (e: any) {
      if (!fsSuccess) throw new Error(e?.message || 'Coupon deletion failed');
    }
  }
}

// ================= ORDERS & PURCHASES =================
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<{ orderId: string; status: OrderStatus; purchaseId?: string }> {
  const now = new Date().toISOString();
  const safeOrderId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `order_${Date.now()}`;
  let status: OrderStatus = orderData.finalPrice <= 0 ? 'COUPON_FREE' : 'PENDING';

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safeOrderId,
      user_id: orderData.userId,
      user_email: orderData.userEmail,
      user_name: orderData.userName,
      apk_id: orderData.apkId,
      apk_name: orderData.apkName,
      apk_icon: orderData.apkIcon,
      plan_id: orderData.planId,
      plan_name: orderData.planName,
      duration_days: orderData.durationDays,
      original_price: orderData.originalPrice,
      coupon_code: orderData.couponCode,
      discount_percent: orderData.discountPercent,
      discount_amount: orderData.discountAmount,
      final_price: orderData.finalPrice,
      upi_id: orderData.upiId,
      utr: orderData.utr,
      screenshot_url: orderData.screenshotUrl,
      screenshot_path: orderData.screenshot_path,
      status: status,
      created_at: now,
      updated_at: now
    });

    const { error } = await supabase.from('orders').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[SUPABASE CREATE ORDER ERROR]', error);
      throw new Error(`Order creation failed: ${error.message}`);
    }
  }

  try {
    await setDoc(doc(db, 'orders', safeOrderId), removeUndefinedFields({ ...orderData, status, createdAt: now, updatedAt: now }));
  } catch (e) {}

  if (status === 'COUPON_FREE') {
    const purchaseId = await createPurchaseFromOrder({
      id: safeOrderId,
      ...orderData,
      status,
      createdAt: now,
      updatedAt: now
    });
    return { orderId: safeOrderId, status, purchaseId };
  }

  return { orderId: safeOrderId, status };
}

export async function submitPaymentProof(orderId: string, utr: string, screenshotUrl: string, storagePath?: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('orders').update({
      utr: utr.trim(),
      screenshot_url: screenshotUrl.trim(),
      screenshot_path: storagePath || screenshotUrl.trim(),
      status: 'PENDING',
      updated_at: now
    }).eq('id', orderId);

    if (error) {
      console.error('[SUPABASE SUBMIT PROOF ERROR]', error);
      throw new Error(`Payment proof submission failed: ${error.message}`);
    }
  }

  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, removeUndefinedFields({
      utr: utr.trim(),
      screenshotUrl: screenshotUrl.trim(),
      screenshot_path: storagePath || screenshotUrl.trim(),
      status: 'PENDING',
      updatedAt: now
    }));
  } catch (e) {}
}

export function subscribeUserOrders(userId: string, callback: (orders: Order[]) => void): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured() || !userId) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && isSubscribed) {
        callback(data.map(mapRowToOrder));
        return;
      }
    } catch (err) {}
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`orders_user_${userId}_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'orders'), where('userId', '==', userId));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed && snap.docs.length > 0) {
      const list: Order[] = [];
      snap.forEach(docSnap => list.push(mapRowToOrder({ id: docSnap.id, ...docSnap.data() })));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export function subscribeAllOrders(callback: (orders: Order[]) => void): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && isSubscribed) {
        callback(data.map(mapRowToOrder));
        return;
      }
    } catch (err) {}
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`orders_all_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'orders'));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed && snap.docs.length > 0) {
      const list: Order[] = [];
      snap.forEach(docSnap => list.push(mapRowToOrder({ id: docSnap.id, ...docSnap.data() })));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export async function approveOrder(orderId: string): Promise<string> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const { data: orderData, error: fetchErr } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (fetchErr || !orderData) throw new Error('Order not found in database');

    const { error: updateErr } = await supabase.from('orders').update({
      status: 'APPROVED',
      updated_at: now
    }).eq('id', orderId);

    if (updateErr) throw new Error(`Approve order failed: ${updateErr.message}`);

    const order = mapRowToOrder(orderData);
    return await createPurchaseFromOrder(order);
  }

  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error('Order not found');
  const order = mapRowToOrder({ id: orderSnap.id, ...orderSnap.data() });
  await updateDoc(orderRef, { status: 'APPROVED', updatedAt: now });
  return await createPurchaseFromOrder(order);
}

export async function rejectOrder(orderId: string, reason: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('orders').update({
      status: 'REJECTED',
      rejection_reason: reason || 'Payment could not be verified.',
      updated_at: now
    }).eq('id', orderId);

    if (error) throw new Error(`Reject order failed: ${error.message}`);
  }

  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: 'REJECTED',
      rejectionReason: reason || 'Payment could not be verified.',
      updatedAt: now
    });
  } catch (e) {}
}

export async function createPurchaseFromOrder(order: Order): Promise<string> {
  const now = new Date();
  const startDate = now.toISOString();
  const expiryTime = now.getTime() + (order.durationDays * 24 * 60 * 60 * 1000);
  const expiryDate = new Date(expiryTime).toISOString();
  const safePurchaseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pur_${Date.now()}`;

  let apkDownloadUrl = '';
  if (isSupabaseConfigured() && order.apkId) {
    const { data: apkRow } = await supabase.from('apks').select('*').eq('id', order.apkId).maybeSingle();
    if (apkRow) {
      const mapped = mapRowToApkItem(apkRow);
      apkDownloadUrl = mapped.downloadUrl || mapped.externalDownloadUrl || '';
    }
  }

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safePurchaseId,
      order_id: order.id,
      user_id: order.userId,
      user_email: order.userEmail,
      apk_id: order.apkId,
      apk_name: order.apkName,
      apk_icon: order.apkIcon,
      plan_name: order.planName,
      duration_days: order.durationDays,
      start_date: startDate,
      expiry_date: expiryDate,
      status: 'ACTIVE',
      download_url: apkDownloadUrl,
      created_at: startDate,
      updated_at: startDate
    });

    const { error } = await supabase.from('purchases').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('[SUPABASE CREATE PURCHASE ERROR]', error);
      throw new Error(`Purchase creation failed: ${error.message}`);
    }
  }

  try {
    const purchaseData: Omit<Purchase, 'id'> = {
      orderId: order.id,
      userId: order.userId,
      userEmail: order.userEmail,
      apkId: order.apkId,
      apkName: order.apkName,
      apkIcon: order.apkIcon,
      planName: order.planName,
      durationDays: order.durationDays,
      startDate,
      expiryDate,
      status: 'ACTIVE',
      downloadUrl: apkDownloadUrl,
      createdAt: startDate
    };
    await setDoc(doc(db, 'purchases', safePurchaseId), removeUndefinedFields(purchaseData));
  } catch (e) {}

  return safePurchaseId;
}

export function subscribeUserPurchases(userId: string, callback: (purchases: Purchase[]) => void): Unsubscribe {
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured() || !userId) return;
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && isSubscribed) {
        const mapped = data.map(mapRowToPurchase);
        const now = new Date();
        for (const p of mapped) {
          if (p.status === 'ACTIVE' && new Date(p.expiryDate) < now) {
            p.status = 'EXPIRED';
            supabase.from('purchases').update({ status: 'EXPIRED' }).eq('id', p.id).then();
          }
        }
        callback(mapped);
        return;
      }
    } catch (err) {}
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`purchases_user_${userId}_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'purchases'), where('userId', '==', userId));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed && snap.docs.length > 0) {
      const list: Purchase[] = [];
      const now = new Date();
      snap.forEach((docSnap) => {
        const p = mapRowToPurchase({ id: docSnap.id, ...docSnap.data() });
        if (p.status === 'ACTIVE' && new Date(p.expiryDate) < now) {
          p.status = 'EXPIRED';
        }
        list.push(p);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export async function checkApkAccess(userId: string | undefined, apkId: string): Promise<{
  hasAccess: boolean;
  purchase?: Purchase;
  isFree?: boolean;
}> {
  if (isSupabaseConfigured() && apkId) {
    const { data: apkRow } = await supabase.from('apks').select('*').eq('id', apkId).maybeSingle();
    if (apkRow) {
      const mapped = mapRowToApkItem(apkRow);
      if (mapped.isFree) return { hasAccess: true, isFree: true };
    }

    if (userId) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('apk_id', apkId)
        .eq('status', 'ACTIVE');

      if (purchases && purchases.length > 0) {
        const now = new Date();
        for (const row of purchases) {
          const p = mapRowToPurchase(row);
          if (new Date(p.expiryDate) > now) {
            return { hasAccess: true, purchase: p };
          }
        }
      }
    }
  }

  // Fallback check in Firestore
  try {
    const apkSnap = await getDoc(doc(db, 'apks', apkId));
    if (apkSnap.exists() && apkSnap.data().isFree) {
      return { hasAccess: true, isFree: true };
    }
    if (userId) {
      const q = query(
        collection(db, 'purchases'),
        where('userId', '==', userId),
        where('apkId', '==', apkId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      const now = new Date();
      for (const docSnap of snap.docs) {
        const p = mapRowToPurchase({ id: docSnap.id, ...docSnap.data() });
        if (new Date(p.expiryDate) > now) {
          return { hasAccess: true, purchase: p };
        }
      }
    }
  } catch (e) {}

  return { hasAccess: false };
}

// ================= ADMIN USERS =================
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
  let isSubscribed = true;

  const loadFromSupabase = async () => {
    if (!isSupabaseConfigured() || !apkId) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('apk_id', apkId)
        .order('created_at', { ascending: false });

      if (!error && data && isSubscribed) {
        callback(data.map(mapRowToReview));
        return;
      }
    } catch (err) {}
  };

  loadFromSupabase();

  let supabaseChannel: any = null;
  if (isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel(`reviews_${apkId}_${Math.random().toString(36).substring(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
          loadFromSupabase();
        })
        .subscribe();
    } catch (e) {}
  }

  const q = query(collection(db, 'reviews'), where('apkId', '==', apkId));
  const fsUnsub = onSnapshot(q, (snap) => {
    if (isSubscribed && snap.docs.length > 0) {
      const list: ReviewItem[] = [];
      snap.forEach(docSnap => list.push(mapRowToReview({ id: docSnap.id, ...docSnap.data() })));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }
  }, () => {});

  return () => {
    isSubscribed = false;
    if (supabaseChannel) try { supabase.removeChannel(supabaseChannel); } catch (e) {}
    if (fsUnsub) fsUnsub();
  };
}

export async function recalculateApkRating(apkId: string): Promise<void> {
  if (!isSupabaseConfigured() || !apkId) return;
  try {
    const { data: reviews } = await supabase.from('reviews').select('rating').eq('apk_id', apkId);
    let total = 0;
    const count = reviews ? reviews.length : 0;
    if (reviews) {
      reviews.forEach(r => { total += Number(r.rating || 5); });
    }
    const avgRating = count > 0 ? Number((total / count).toFixed(1)) : 4.8;
    await supabase.from('apks').update({
      rating: avgRating,
      reviews_count: count,
      updated_at: new Date().toISOString()
    }).eq('id', apkId);
  } catch (err) {}
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
  const safeId = reviewData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rev_${Date.now()}`);
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const payload = removeUndefinedFields({
      id: safeId,
      apk_id: reviewData.apkId,
      user_id: reviewData.userId,
      user_name: reviewData.userName,
      user_photo_url: reviewData.userPhotoURL || '',
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
      created_at: now,
      updated_at: now
    });

    const { error } = await supabase.from('reviews').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Review submission failed: ${error.message}`);
    await recalculateApkRating(reviewData.apkId);
  }

  return safeId;
}

export async function deleteReview(reviewId: string, apkId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('reviews').delete().eq('id', reviewId);
    await recalculateApkRating(apkId);
  }
}
