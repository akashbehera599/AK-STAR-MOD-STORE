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
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
export function subscribeApks(callback: (apks: ApkItem[]) => void, includeInactive = false): Unsubscribe {
  const apksCol = collection(db, 'apks');
  const q = includeInactive 
    ? query(apksCol, orderBy('createdAt', 'desc'))
    : query(apksCol, where('isActive', '==', true), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    const list: ApkItem[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ApkItem);
    });
    callback(list);
  }, (err) => {
    console.error('Apks subscribe error:', err);
    // Fallback without orderBy if index is missing initially
    const simpleQ = includeInactive ? apksCol : query(apksCol, where('isActive', '==', true));
    return onSnapshot(simpleQ, (fallbackSnap) => {
      const list: ApkItem[] = [];
      fallbackSnap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ApkItem);
      });
      callback(list);
    });
  });
}

export async function getApkBySlugOrId(identifier: string): Promise<ApkItem | null> {
  // First check by ID
  const idRef = doc(db, 'apks', identifier);
  const idSnap = await getDoc(idRef);
  if (idSnap.exists()) {
    return { id: idSnap.id, ...idSnap.data() } as ApkItem;
  }

  // Next check by slug
  const q = query(collection(db, 'apks'), where('slug', '==', identifier));
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    const first = qSnap.docs[0];
    return { id: first.id, ...first.data() } as ApkItem;
  }

  return null;
}

export async function addApk(apk: Omit<ApkItem, 'id'>): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'apks'), removeUndefinedFields({
    ...apk,
    createdAt: now,
    updatedAt: now
  }));
  return docRef.id;
}

export async function updateApk(id: string, apk: Partial<ApkItem>): Promise<void> {
  const docRef = doc(db, 'apks', id);
  const { id: _, ...rest } = apk;
  await updateDoc(docRef, removeUndefinedFields({
    ...rest,
    updatedAt: new Date().toISOString()
  }));
}

export async function deleteApk(id: string): Promise<void> {
  // Check if purchases exist for safety
  const purchasesQ = query(collection(db, 'purchases'), where('apkId', '==', id));
  const pSnap = await getDocs(purchasesQ);
  
  if (!pSnap.empty) {
    // Soft disable to preserve purchase history integrity
    await updateDoc(doc(db, 'apks', id), {
      isActive: false,
      updatedAt: new Date().toISOString()
    });
  } else {
    // Delete cleanly
    await deleteDoc(doc(db, 'apks', id));
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

