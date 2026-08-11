import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, LayoutDashboard, Smartphone, ShoppingBag, Tag, 
  Grid, Settings, Users, Plus, Edit, Trash2, Check, X, Eye, 
  Upload, CheckCircle2, Clock, XCircle, AlertTriangle, Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isAdminEmail } from '../lib/admin';
import { 
  ApkItem, Category, Coupon, Order, PlanItem, StoreSettings, UserProfile 
} from '../types';
import { AdminApkModal } from '../components/AdminApkModal';
import { 
  addApk, addCategory, addCoupon, addPlan, approveOrder, 
  deleteApk, deleteCategory, deleteCoupon, deletePlan, getPlansForApk,
  rejectOrder, subscribeAllOrders, subscribeApks, subscribeCategories, 
  subscribeCoupons, subscribeStoreSettings, subscribeUsers, 
  updateApk, updateCategory, updateCoupon, updatePlan, updateStoreSettings 
} from '../services/db';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface AdminPanelProps {
  onNavigateHome: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigateHome }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'apks' | 'orders' | 'coupons' | 'categories' | 'settings' | 'users'>('dashboard');

  // Real-time Firestore states
  const [apks, setApks] = useState<ApkItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Modal / Form States
  const [showApkModal, setShowApkModal] = useState(false);
  const [editingApk, setEditingApk] = useState<Partial<ApkItem> | null>(null);

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedApkForPlans, setSelectedApkForPlans] = useState<ApkItem | null>(null);
  const [newPlanData, setNewPlanData] = useState<{ name: string; durationDays: number; price: number }>({ name: '30 Days Access', durationDays: 30, price: 99 });

  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'apk' | 'coupon' | 'category' | 'plan';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  const [loadingAction, setLoadingAction] = useState(false);

  // Security Verification
  const isAuthorized = isAdminEmail(user?.email);

  useEffect(() => {
    if (!isAuthorized) return;

    const unsubApks = subscribeApks(setApks, true);
    const unsubOrders = subscribeAllOrders(setOrders);
    const unsubCoupons = subscribeCoupons(setCoupons);
    const unsubCategories = subscribeCategories(setCategories);
    const unsubSettings = subscribeStoreSettings(setStoreSettings);
    const unsubUsers = subscribeUsers(setUsersList);

    return () => {
      unsubApks();
      unsubOrders();
      unsubCoupons();
      unsubCategories();
      unsubSettings();
      unsubUsers();
    };
  }, [isAuthorized]);

  if (!user || !isAuthorized) {
    return (
      <div className="bg-zinc-900/80 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto mt-12 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-white">Access Denied</h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The Admin Panel is strictly restricted to authorized administrator accounts (<span className="text-amber-400 font-bold">akashbehera599@gmail.com</span>, <span className="text-amber-400 font-bold">akstarofficial732@gmail.com</span>).
        </p>
        <button
          id="btn-admin-access-denied-home"
          onClick={onNavigateHome}
          className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs py-3 rounded-2xl shadow transition"
        >
          Return to Customer Store
        </button>
      </div>
    );
  }

  // Dashboard metrics
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const approvedOrders = orders.filter(o => o.status === 'APPROVED' || o.status === 'COUPON_FREE');
  const rejectedOrders = orders.filter(o => o.status === 'REJECTED');
  const totalRevenue = approvedOrders.reduce((acc, o) => acc + (o.finalPrice || 0), 0);

  // APK Save Handler
  const handleSaveApk = async (apkPayload: Partial<ApkItem>) => {
    if (!apkPayload.name || !apkPayload.category) {
      alert('APK Name and Category are required');
      return;
    }

    setLoadingAction(true);
    try {
      const data: Omit<ApkItem, 'id'> = {
        name: apkPayload.name.trim(),
        slug: apkPayload.slug || apkPayload.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: apkPayload.description || '',
        shortDescription: apkPayload.shortDescription || '',
        category: apkPayload.category,
        categoryId: apkPayload.categoryId || '',
        categoryName: apkPayload.categoryName || apkPayload.category,
        version: apkPayload.version || '1.0.0',
        androidVersion: apkPayload.androidVersion || '7.0+',
        size: apkPayload.size || '45 MB',
        icon: apkPayload.icon || apkPayload.iconUrl || '',
        iconUrl: apkPayload.iconUrl || apkPayload.icon || '',
        screenshots: apkPayload.screenshots || apkPayload.screenshotUrls || [],
        screenshotUrls: apkPayload.screenshotUrls || apkPayload.screenshots || [],
        features: apkPayload.features || ['Premium Unlocked', 'No Ads'],
        changelog: apkPayload.changelog || 'Initial release',
        downloadMethod: apkPayload.downloadMethod || 'upload',
        apkFilePath: apkPayload.apkFilePath || '',
        apkFileName: apkPayload.apkFileName || '',
        apkFileSize: apkPayload.apkFileSize || '',
        externalDownloadUrl: apkPayload.externalDownloadUrl || '',
        downloadUrl: apkPayload.downloadUrl || '',
        isFree: !!apkPayload.isFree,
        isPremium: !apkPayload.isFree,
        isFeatured: !!apkPayload.isFeatured,
        isActive: apkPayload.isActive !== undefined ? apkPayload.isActive : true,
        rating: apkPayload.rating || 4.8,
        downloadsCount: apkPayload.downloadsCount || 100,
        createdAt: editingApk?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingApk?.id) {
        await updateApk(editingApk.id, data);
      } else {
        await addApk(data);
      }

      setShowApkModal(false);
      setEditingApk(null);
    } catch (err: any) {
      console.error(err);
      alert('Error saving APK: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Coupon Save Handler
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon?.code) {
      alert('Coupon code is required');
      return;
    }

    setLoadingAction(true);
    try {
      const discount = Math.min(100, Math.max(10, editingCoupon.discountPercent || 10));
      const data = {
        code: editingCoupon.code.toUpperCase().trim(),
        discountPercent: discount,
        minPurchase: editingCoupon.minPurchase || 0,
        maxDiscount: editingCoupon.maxDiscount || 0,
        startDate: editingCoupon.startDate || new Date().toISOString(),
        expiryDate: editingCoupon.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString(),
        usageLimit: editingCoupon.usageLimit || 0,
        perUserLimit: editingCoupon.perUserLimit || 1,
        active: editingCoupon.active !== undefined ? editingCoupon.active : true
      };

      if (editingCoupon.id) {
        await updateCoupon(editingCoupon.id, data);
      } else {
        await addCoupon(data);
      }

      setShowCouponModal(false);
      setEditingCoupon(null);
    } catch (err: any) {
      console.error(err);
      alert('Error saving coupon: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Category Save Handler
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    setLoadingAction(true);
    try {
      const data = {
        name: editingCategory.name,
        slug: editingCategory.slug || editingCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        active: editingCategory.active !== undefined ? editingCategory.active : true,
        order: editingCategory.order || categories.length + 1
      };

      if (editingCategory.id) {
        await updateCategory(editingCategory.id, data);
      } else {
        await addCategory(data);
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (err: any) {
      alert('Error saving category: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Approve Order Handler
  const handleApproveOrder = async (orderId: string) => {
    try {
      await approveOrder(orderId);
      alert('Payment approved successfully! Customer app access has been activated.');
    } catch (err: any) {
      alert('Error approving payment: ' + err.message);
    }
  };

  // Reject Order Handler
  const handleRejectOrder = async () => {
    if (!rejectingOrderId) return;
    try {
      await rejectOrder(rejectingOrderId, rejectionReason);
      setRejectingOrderId(null);
      setRejectionReason('');
      alert('Order payment marked as rejected.');
    } catch (err: any) {
      alert('Error rejecting order: ' + err.message);
    }
  };

  // Delete Action Executor (Requirement 22: Delete must really work!)
  const handleExecuteDelete = async () => {
    if (!confirmDelete) return;
    setLoadingAction(true);

    try {
      if (confirmDelete.type === 'apk') {
        await deleteApk(confirmDelete.id);
      } else if (confirmDelete.type === 'coupon') {
        await deleteCoupon(confirmDelete.id);
      } else if (confirmDelete.type === 'category') {
        await deleteCategory(confirmDelete.id);
      } else if (confirmDelete.type === 'plan') {
        await deletePlan(confirmDelete.id);
      }

      setConfirmDelete(null);
    } catch (err: any) {
      alert('Error deleting item: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Admin Header */}
      <div className="bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">AK STAR MOD Admin Panel</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                LIVE DB
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Logged in as <span className="text-amber-400 font-semibold">{user.email}</span>
            </p>
          </div>
        </div>

        <button
          id="btn-admin-nav-home"
          onClick={onNavigateHome}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-4 py-2.5 rounded-xl transition"
        >
          View Customer Store
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 overflow-x-auto scrollbar-none">
        <button
          id="tab-admin-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'dashboard' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </button>
        <button
          id="tab-admin-apks"
          onClick={() => setActiveTab('apks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'apks' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" /> APKs ({apks.length})
        </button>
        <button
          id="tab-admin-orders"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'orders' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Orders & Payments {pendingOrders.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full">{pendingOrders.length}</span>}
        </button>
        <button
          id="tab-admin-coupons"
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'coupons' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" /> Coupons ({coupons.length})
        </button>
        <button
          id="tab-admin-categories"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'categories' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" /> Categories
        </button>
        <button
          id="tab-admin-settings"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" /> Store Settings
        </button>
        <button
          id="tab-admin-users"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Users ({usersList.length})
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Total Revenue</p>
              <p className="text-xl font-black text-amber-400 mt-1">₹{totalRevenue}</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Pending Payments</p>
              <p className="text-xl font-black text-amber-500 mt-1">{pendingOrders.length}</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Approved Payments</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{approvedOrders.length}</p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Total APKs</p>
              <p className="text-xl font-black text-white mt-1">{apks.length}</p>
            </div>
          </div>

          {/* Quick Pending Payments Section */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Pending Payment Verifications
              </h2>
              <button onClick={() => setActiveTab('orders')} className="text-xs text-amber-400 font-bold hover:underline">
                View All
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No pending UTR payments awaiting approval.</p>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-zinc-950 p-4 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-white">{order.apkName} ({order.planName})</p>
                      <p className="text-zinc-400">Customer: {order.userEmail}</p>
                      <p className="text-amber-400 font-mono font-bold mt-1">UTR: {order.utr || 'Not provided'}</p>
                      <p className="text-zinc-500 text-[10px]">{new Date(order.createdAt).toLocaleString()} • Payable: ₹{order.finalPrice}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.screenshotUrl && (
                        <button
                          onClick={() => setScreenshotModalUrl(order.screenshotUrl || null)}
                          className="bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                        >
                          View Screenshot
                        </button>
                      )}
                      <button
                        onClick={() => handleApproveOrder(order.id)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold px-3.5 py-1.5 rounded-xl shadow"
                      >
                        APPROVE
                      </button>
                      <button
                        onClick={() => setRejectingOrderId(order.id)}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold px-3 py-1.5 rounded-xl border border-red-500/30"
                      >
                        REJECT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* APKS MANAGEMENT TAB */}
      {activeTab === 'apks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">APK Catalog ({apks.length})</h2>
            <button
              id="btn-admin-add-apk"
              onClick={() => {
                setEditingApk({
                  name: '',
                  category: categories[0]?.name || 'Tools',
                  version: '1.0.0',
                  androidVersion: '7.0+',
                  size: '45 MB',
                  isFree: false,
                  isFeatured: false,
                  isActive: true,
                  rating: 4.8,
                  downloadsCount: 500,
                  features: ['VIP Unlocked', 'Ad Free']
                });
                setShowApkModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add New APK
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {apks.map(apk => (
              <div key={apk.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                <img src={apk.icon} alt={apk.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-zinc-700" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-bold text-white truncate">{apk.name}</h3>
                    {apk.isFree ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">FREE</span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold">VIP</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{apk.category} • v{apk.version}</p>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800 text-xs">
                    <button
                      onClick={() => {
                        setEditingApk(apk);
                        setShowApkModal(true);
                      }}
                      className="text-amber-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      onClick={() => {
                        setSelectedApkForPlans(apk);
                        setShowPlanModal(true);
                      }}
                      className="text-zinc-300 font-bold hover:underline"
                    >
                      Plans
                    </button>

                    <button
                      onClick={() => {
                        setConfirmDelete({
                          type: 'apk',
                          id: apk.id,
                          title: `Delete APK "${apk.name}"?`,
                          message: 'Are you sure you want to delete this APK? This action cannot be undone.'
                        });
                      }}
                      className="text-red-400 font-bold hover:underline ml-auto flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDERS / PAYMENTS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white">All Orders & Payment Verification</h2>

          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                  <div>
                    <span className="font-bold text-white text-sm">{order.apkName}</span>
                    <span className="text-zinc-400 ml-2">({order.planName})</span>
                  </div>

                  <span className={`font-black text-[10px] px-2.5 py-0.5 rounded-full border ${
                    order.status === 'APPROVED' || order.status === 'COUPON_FREE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : order.status === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300">
                  <p><span className="text-zinc-500">Customer Gmail:</span> {order.userEmail}</p>
                  <p><span className="text-zinc-500">UTR / Ref:</span> <span className="font-mono text-amber-400 font-bold">{order.utr || 'N/A'}</span></p>
                  <p><span className="text-zinc-500">Amount Paid:</span> ₹{order.finalPrice} (Orig: ₹{order.originalPrice})</p>
                  <p><span className="text-zinc-500">Date:</span> {new Date(order.createdAt).toLocaleString()}</p>
                </div>

                {order.status === 'PENDING' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    {order.screenshotUrl && (
                      <button
                        onClick={() => setScreenshotModalUrl(order.screenshotUrl || null)}
                        className="bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                      >
                        View Payment Screenshot
                      </button>
                    )}
                    <button
                      onClick={() => handleApproveOrder(order.id)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black px-4 py-1.5 rounded-xl shadow"
                    >
                      APPROVE PAYMENT
                    </button>
                    <button
                      onClick={() => setRejectingOrderId(order.id)}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold px-3 py-1.5 rounded-xl border border-red-500/30"
                    >
                      REJECT
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Coupons ({coupons.length})</h2>
            <button
              id="btn-admin-add-coupon"
              onClick={() => {
                setEditingCoupon({
                  code: 'AKVIP100',
                  discountPercent: 100,
                  minPurchase: 0,
                  maxDiscount: 0,
                  usageLimit: 50,
                  perUserLimit: 1,
                  active: true
                });
                setShowCouponModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coupons.map(coupon => (
              <div key={coupon.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-amber-400 text-sm">{coupon.code}</span>
                  <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-black">
                    {coupon.discountPercent}% OFF
                  </span>
                </div>
                <p className="text-zinc-400">Used: {coupon.usedCount} / {coupon.usageLimit || '∞'} times</p>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setEditingCoupon(coupon);
                      setShowCouponModal(true);
                    }}
                    className="text-amber-400 font-bold hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDelete({
                        type: 'coupon',
                        id: coupon.id,
                        title: `Delete Coupon "${coupon.code}"?`,
                        message: 'Are you sure you want to delete this coupon code?'
                      });
                    }}
                    className="text-red-400 font-bold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Categories ({categories.length})</h2>
            <button
              id="btn-admin-add-category"
              onClick={() => {
                setEditingCategory({ name: '', slug: '', active: true, order: categories.length + 1 });
                setShowCategoryModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{cat.name}</p>
                  <p className="text-[10px] text-zinc-500">{cat.slug}</p>
                </div>
                <button
                  onClick={() => {
                    setConfirmDelete({
                      type: 'category',
                      id: cat.id,
                      title: `Delete Category "${cat.name}"?`,
                      message: 'Are you sure you want to delete this category?'
                    });
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STORE SETTINGS TAB */}
      {activeTab === 'settings' && storeSettings && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-4 max-w-xl">
          <h2 className="text-sm font-bold text-white">Store UPI & Info Settings</h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-zinc-400 font-semibold">Store UPI ID</label>
              <input
                type="text"
                value={storeSettings.upiId}
                onChange={(e) => setStoreSettings({ ...storeSettings, upiId: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-semibold">Custom UPI QR Code Image URL (Optional)</label>
              <input
                type="text"
                value={storeSettings.upiQrUrl || ''}
                placeholder="Leave blank to auto-generate QR code"
                onChange={(e) => setStoreSettings({ ...storeSettings, upiQrUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-semibold">Telegram Support Link</label>
              <input
                type="text"
                value={storeSettings.telegramLink || ''}
                onChange={(e) => setStoreSettings({ ...storeSettings, telegramLink: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white mt-1"
              />
            </div>

            <button
              onClick={async () => {
                await updateStoreSettings(storeSettings);
                alert('Settings updated successfully!');
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs py-3 rounded-xl transition"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">Registered Customers ({usersList.length})</h2>
          <div className="space-y-2">
            {usersList.map(u => (
              <div key={u.uid} className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{u.displayName}</p>
                  <p className="text-zinc-400">{u.email}</p>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Role: {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* APK EDIT / ADD MODAL */}
      {showApkModal && (
        <AdminApkModal
          editingApk={editingApk}
          categories={categories}
          onClose={() => {
            setShowApkModal(false);
            setEditingApk(null);
          }}
          onSave={handleSaveApk}
        />
      )}

      {/* PLAN MANAGER MODAL FOR SELECTED APK */}
      {showPlanModal && selectedApkForPlans && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-extrabold text-white">
              Pricing Plans for "{selectedApkForPlans.name}"
            </h3>

            {/* Existing Plans */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <PlansListForApk apkId={selectedApkForPlans.id} onDeletePlan={(id) => {
                setConfirmDelete({
                  type: 'plan',
                  id,
                  title: 'Delete Plan?',
                  message: 'Are you sure you want to delete this pricing plan?'
                });
              }} />
            </div>

            {/* Add New Plan */}
            <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs">
              <p className="font-bold text-amber-400">+ Add Duration Plan</p>
              <input
                type="text"
                placeholder="Plan Name (e.g. 30 Days Access)"
                value={newPlanData.name}
                onChange={(e) => setNewPlanData({ ...newPlanData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Duration Days"
                  value={newPlanData.durationDays}
                  onChange={(e) => setNewPlanData({ ...newPlanData, durationDays: Number(e.target.value) })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={newPlanData.price}
                  onChange={(e) => setNewPlanData({ ...newPlanData, price: Number(e.target.value) })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newPlanData.name) return;
                  await addPlan({
                    apkId: selectedApkForPlans.id,
                    name: newPlanData.name,
                    durationDays: newPlanData.durationDays,
                    price: newPlanData.price,
                    active: true
                  });
                  setNewPlanData({ name: '30 Days Access', durationDays: 30, price: 99 });
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs py-2 rounded-xl transition"
              >
                Add Plan
              </button>
            </div>

            <button
              onClick={() => setShowPlanModal(false)}
              className="w-full bg-zinc-800 text-zinc-300 font-bold text-xs py-2 rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* COUPON MODAL */}
      {showCouponModal && editingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCoupon} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-3 text-xs">
            <h3 className="text-sm font-extrabold text-white">
              {editingCoupon.id ? 'Edit Coupon' : 'Create Coupon'}
            </h3>

            <div>
              <label className="text-zinc-400 font-semibold">Coupon Code</label>
              <input
                type="text"
                required
                value={editingCoupon.code || ''}
                onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white uppercase font-mono mt-1"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-semibold">Discount Percentage (10% - 100%)</label>
              <input
                type="number"
                min={10}
                max={100}
                required
                value={editingCoupon.discountPercent || 100}
                onChange={(e) => setEditingCoupon({ ...editingCoupon, discountPercent: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white mt-1"
              />
              <p className="text-[10px] text-zinc-500 mt-0.5">100% discount means free access order.</p>
            </div>

            <div>
              <label className="text-zinc-400 font-semibold">Max Usage Limit</label>
              <input
                type="number"
                value={editingCoupon.usageLimit || 50}
                onChange={(e) => setEditingCoupon({ ...editingCoupon, usageLimit: Number(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white mt-1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="w-1/3 bg-zinc-800 text-zinc-300 font-bold py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2 rounded-xl"
              >
                Save Coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SCREENSHOT PREVIEW MODAL */}
      {screenshotModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 p-4 rounded-3xl max-w-lg w-full space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-white">
              <span>Payment Screenshot Proof</span>
              <button onClick={() => setScreenshotModalUrl(null)} className="text-zinc-400 hover:text-white">Close</button>
            </div>
            <img src={screenshotModalUrl} alt="Payment proof" className="max-h-[70vh] mx-auto rounded-2xl object-contain border border-zinc-800" />
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-3 text-xs">
            <h3 className="text-sm font-bold text-white">Reject Payment</h3>
            <p className="text-zinc-400">Please provide a reason for rejection:</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. UTR number not found in bank statement."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectingOrderId(null)} className="w-1/3 bg-zinc-800 text-zinc-300 font-bold py-2 rounded-xl">
                Cancel
              </button>
              <button onClick={handleRejectOrder} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE MODAL */}
      {confirmDelete && (
        <ConfirmationModal
          isOpen={true}
          title={confirmDelete.title}
          message={confirmDelete.message}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDangerous={true}
          loading={loadingAction}
          onConfirm={handleExecuteDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// Helper sub-component for plans list in modal
function PlansListForApk({ apkId, onDeletePlan }: { apkId: string; onDeletePlan: (id: string) => void }) {
  const [plans, setPlans] = useState<PlanItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    getPlansForApk(apkId).then(list => {
      if (isMounted) setPlans(list);
    });
    return () => { isMounted = false; };
  }, [apkId]);

  if (plans.length === 0) {
    return <p className="text-xs text-zinc-500 py-2">No plans configured yet for this APK.</p>;
  }

  return (
    <div className="space-y-1 text-xs">
      {plans.map(p => (
        <div key={p.id} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center">
          <div>
            <span className="font-bold text-white">{p.name}</span>
            <span className="text-zinc-400 ml-2">₹{p.price} ({p.durationDays} Days)</span>
          </div>
          <button onClick={() => onDeletePlan(p.id)} className="text-red-400 hover:text-red-300 p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
