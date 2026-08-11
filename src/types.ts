export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName?: string;
  active: boolean;
  order?: number;
}

export interface ApkItem {
  id: string;
  name: string; // Title
  slug: string;
  description: string;
  shortDescription?: string;
  category: string; // categoryName
  categoryId?: string;
  categoryName?: string;
  version: string;
  androidVersion: string;
  size: string;
  icon: string; // iconUrl
  iconUrl?: string;
  screenshots: string[]; // screenshotUrls
  screenshotUrls?: string[];
  features: string[];
  changelog: string;
  
  downloadMethod?: 'upload' | 'external';
  apkFilePath?: string;
  apkFileName?: string;
  apkFileSize?: string;
  externalDownloadUrl?: string;
  downloadUrl?: string; // Unified download link for customers

  isFree: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  isActive: boolean;
  rating: number; // e.g. 4.8
  downloadsCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type DurationUnit = 'days' | 'months' | 'years';

export interface PlanItem {
  id: string;
  apkId: string;
  name: string; // e.g., "30 Days Access"
  durationDays: number;
  price: number; // in INR e.g. 99
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string; // uppercase string e.g. AKVIP100
  discountPercent: number; // 10 to 100
  minPurchase: number;
  maxDiscount: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  active: boolean;
  createdAt: string;
}

export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COUPON_FREE';

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  apkId: string;
  apkName: string;
  apkIcon: string;
  planId: string;
  planName: string;
  durationDays: number;
  originalPrice: number;
  couponCode?: string;
  discountPercent?: number;
  discountAmount: number;
  finalPrice: number;
  upiId: string;
  utr?: string;
  screenshotUrl?: string;
  status: OrderStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseStatus = 'ACTIVE' | 'EXPIRED';

export interface Purchase {
  id: string;
  orderId: string;
  userId: string;
  userEmail: string;
  apkId: string;
  apkName: string;
  apkIcon: string;
  planName: string;
  durationDays: number;
  startDate: string;
  expiryDate: string;
  status: PurchaseStatus;
  downloadUrl?: string;
  createdAt: string;
}

export interface StoreSettings {
  websiteName: string;
  logoText: string;
  upiId: string;
  upiQrUrl: string;
  supportEmail: string;
  telegramLink?: string;
  whatsappLink?: string;
  paymentInstructions: string;
  maintenanceMode: boolean;
  announcementBanner?: string;
  updatedAt: string;
}
