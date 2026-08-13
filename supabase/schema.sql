-- ================================================================
-- AK STAR MOD STORE — COMPLETE SUPABASE DATABASE SCHEMA & MIGRATIONS
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. APKS TABLE
CREATE TABLE IF NOT EXISTS public.apks (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Games',
  category_id TEXT,
  version TEXT DEFAULT '1.0.0',
  android_requirement TEXT DEFAULT '7.0+',
  package_name TEXT DEFAULT '',
  file_size TEXT DEFAULT '45 MB',
  icon_url TEXT DEFAULT '',
  apk_url TEXT DEFAULT '',
  external_download_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  mod_features TEXT DEFAULT '',
  changelog TEXT DEFAULT 'Initial release',
  screenshots JSONB DEFAULT '[]'::jsonb,
  price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  access_duration TEXT DEFAULT '30 Days',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  free_download BOOLEAN DEFAULT false,
  featured_vip BOOLEAN DEFAULT false,
  active_visible BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 4.8,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure package_name and price columns exist if table was already created
ALTER TABLE public.apks ADD COLUMN IF NOT EXISTS package_name TEXT DEFAULT '';
ALTER TABLE public.apks ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.apks ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.apks ADD COLUMN IF NOT EXISTS access_duration TEXT DEFAULT '30 Days';
ALTER TABLE public.apks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.apks ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_name TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  apk_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_days INTEGER DEFAULT 30,
  price NUMERIC DEFAULT 99,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  min_purchase NUMERIC DEFAULT 0,
  max_discount NUMERIC DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'store',
  website_name TEXT DEFAULT 'AK STAR MOD',
  logo_text TEXT DEFAULT 'AK STAR MOD',
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  upi_id TEXT DEFAULT 'akstarofficial@upi',
  upi_qr_url TEXT DEFAULT '',
  support_email TEXT DEFAULT 'akstarofficial732@gmail.com',
  telegram_link TEXT DEFAULT 'https://t.me/akstarmod',
  whatsapp_link TEXT DEFAULT '',
  payment_instructions TEXT DEFAULT '1. Copy UPI ID or Scan QR Code.\n2. Open any UPI App (GPay/PhonePe/Paytm).\n3. Send exact final amount.\n4. Copy UTR / Transaction ID.\n5. Submit UTR & payment screenshot.',
  maintenance_mode BOOLEAN DEFAULT false,
  announcement_banner TEXT DEFAULT 'Welcome to AK STAR MOD — Premium Android Apps & Games',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT DEFAULT 'User',
  apk_id TEXT NOT NULL,
  apk_name TEXT DEFAULT '',
  apk_icon TEXT DEFAULT '',
  plan_id TEXT DEFAULT '',
  plan_name TEXT DEFAULT '',
  duration_days INTEGER DEFAULT 30,
  original_price NUMERIC DEFAULT 0,
  coupon_code TEXT DEFAULT '',
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  final_price NUMERIC DEFAULT 0,
  upi_id TEXT DEFAULT '',
  utr TEXT DEFAULT '',
  screenshot_url TEXT DEFAULT '',
  screenshot_path TEXT DEFAULT '',
  status TEXT DEFAULT 'PENDING',
  rejection_reason TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  apk_id TEXT NOT NULL,
  apk_name TEXT DEFAULT '',
  apk_icon TEXT DEFAULT '',
  plan_name TEXT DEFAULT '',
  duration_days INTEGER DEFAULT 30,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  download_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  apk_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Anonymous',
  user_photo_url TEXT DEFAULT '',
  rating NUMERIC DEFAULT 5,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.apks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Set up Row Level Security (RLS) Policies
ALTER TABLE public.apks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public Read APKS" ON public.apks FOR SELECT USING (true);
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Read Purchases" ON public.purchases FOR SELECT USING (true);

-- Permissive write policies (allow admin/frontend anon key operations)
CREATE POLICY "Anon Write APKS" ON public.apks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Plans" ON public.plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Write Reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
