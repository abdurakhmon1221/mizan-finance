-- =========================================================================
-- MIZAN FINANCE SUPABASE SQL SCRIPT (v2 — xavfsiz, qayta ishlatish mumkin)
-- =========================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT CHECK (role IN ('owner','admin','accountant')) NOT NULL DEFAULT 'admin',
  department  TEXT CHECK (department IN ('oquv','marketing','all')) DEFAULT 'all',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT CHECK (type IN ('income','expense')) NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  category        TEXT NOT NULL,
  department      TEXT CHECK (department IN ('oquv','marketing')) NOT NULL,
  payment_method  TEXT CHECK (payment_method IN ('cash','card','bank','debt')),
  note            TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by      UUID REFERENCES profiles(id) NOT NULL,
  receipt_url     TEXT,

  -- Kreditor qarzlari (3-chi shaxs)
  is_third_party  BOOLEAN DEFAULT false,
  paid_by         TEXT,
  third_party_name TEXT,

  deleted_at      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. STORAGE BUCKET (Chek rasmlari uchun)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- XAVFSIZLIK: ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Avvalgi policiylarni o'chirib, qayta yaratamiz (xato chiqmasligi uchun)
DROP POLICY IF EXISTS "All users can view profiles"         ON profiles;
DROP POLICY IF EXISTS "Owner and Accountant can view all"   ON transactions;
DROP POLICY IF EXISTS "Admin can view own"                  ON transactions;
DROP POLICY IF EXISTS "Owner and Admin can insert"          ON transactions;
DROP POLICY IF EXISTS "Owner can update (delete)"           ON transactions;
DROP POLICY IF EXISTS "Public Access"                       ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert"                         ON storage.objects;

-- Profiles: barchasi ko'ra oladi
CREATE POLICY "All users can view profiles"
ON profiles FOR SELECT USING (true);

-- Transactions: Owner va Accountant hammasini ko'radi
CREATE POLICY "Owner and Accountant can view all"
ON transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('owner','accountant')
  )
);

-- Admin (Reception) faqat o'zi kirganlarni ko'radi
CREATE POLICY "Admin can view own"
ON transactions FOR SELECT
USING (created_by = auth.uid());

-- INSERT: Owner va Admin qo'sha oladi
CREATE POLICY "Owner and Admin can insert"
ON transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('owner','admin')
  )
);

-- UPDATE / Soft Delete: faqat Owner
CREATE POLICY "Owner can update (delete)"
ON transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'owner'
  )
);

-- Storage rasm ko'rish
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Storage rasm yuklash (faqat tizimga kirganlar)
CREATE POLICY "Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- =========================================================================
-- BIRINCHI OWNER PROFILINI YARATISH
-- Supabase → Authentication → Add User → yarating
-- Keyin user ID sini olib quyidagi so'rovni ishga tushiring:
-- =========================================================================
/*
INSERT INTO profiles (id, full_name, email, role, department)
VALUES (
  'BU_YERGA_AUTH_USER_ID_YOZING',
  'Abduraxmon',
  'abduraxmon@mizan.uz',
  'owner',
  'all'
)
ON CONFLICT (id) DO NOTHING;
*/
