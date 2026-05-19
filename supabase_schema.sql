-- =========================================================================
-- MIZAN FINANCE SUPABASE SQL SCRIPT
-- =========================================================================

-- 1. PROFILES TABLE (Foydalanuvchilar va rollar)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT CHECK (role IN ('owner','admin','accountant')) NOT NULL DEFAULT 'admin',
  department  TEXT CHECK (department IN ('oquv','marketing','all')) DEFAULT 'all',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TRANSACTIONS TABLE (Kirim va xarajatlar)
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT CHECK (type IN ('income','expense')) NOT NULL,
  amount        BIGINT NOT NULL CHECK (amount > 0),
  category      TEXT NOT NULL,
  department    TEXT CHECK (department IN ('oquv','marketing')) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash','card','bank','debt')),
  note          TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by    UUID REFERENCES profiles(id) NOT NULL,
  receipt_url   TEXT,
  
  -- Kreditor qarzlari (3-chi shaxs)
  is_third_party BOOLEAN DEFAULT false,
  paid_by       TEXT,
  third_party_name TEXT,
  
  deleted_at    TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. STORAGE BUCKET YARATISH (Chek rasmlari uchun)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 4. STORAGE POLICY (Rasmlarni o'qish va yuklash ruxsati)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'receipts');

CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- =========================================================================
-- O'ZINGIZ UCHUN BIRINCHI OWNER PROFILINI YARATISH 
-- (O'z profilingiz id'sini 'auth.users' jadvalidan olib almashtiring)
-- =========================================================================
/*
INSERT INTO profiles (id, full_name, email, role, department)
VALUES (
  'SIZNING_AUTH_ID_RAQAMINGIZNI_SHU_YERGA_YOZING',
  'Abduraxmon',
  'sizning@emailingiz.com',
  'owner',
  'all'
);
*/

-- =========================================================================
-- XAVFSIZLIK: ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profillarni barcha ko'ra oladi (ammo faqat owner o'zgartira oladi, front-endda himoyalangan)
CREATE POLICY "All users can view profiles" 
ON profiles FOR SELECT USING (true);

-- Tranzaksiyalarni ko'rish
-- Owner va Accountant hammasini ko'radi
CREATE POLICY "Owner and Accountant can view all" 
ON transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('owner','accountant')
  )
);

-- Admin (Reception) faqat o'zi qo'shganini ko'radi
CREATE POLICY "Admin can view own" 
ON transactions FOR SELECT 
USING (
  created_by = auth.uid()
);

-- Tranzaksiya qo'shish (Owner va Admin qo'shishi mumkin)
CREATE POLICY "Owner and Admin can insert" 
ON transactions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('owner','admin')
  )
);

-- Tranzaksiya o'chirish (Soft delete - faqat Owner uchun)
CREATE POLICY "Owner can update (delete)" 
ON transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'owner'
  )
);
