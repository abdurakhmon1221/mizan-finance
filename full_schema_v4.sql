-- =========================================================================
-- MIZAN FINANCE: TO'LIQ SUPABASE SQL SCRIPT (V4 — Yakuniy)
-- Barcha 10 ta yangilanishni o'z ichiga oladi
-- =========================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT CHECK (role IN ('owner','admin','accountant')) NOT NULL DEFAULT 'admin',
  department  TEXT CHECK (department IN ('oquv','marketing','all')) DEFAULT 'all',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TEACHERS (Xodimlar va O'qituvchilar)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    salary_type TEXT DEFAULT 'fixed', -- 'fixed' yoki 'percentage'
    base_salary NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- 3. GROUPS (Guruhlar va Kurslar)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id),
    price NUMERIC NOT NULL DEFAULT 0,
    schedule TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- 4. STUDENTS (O'quvchilar)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    course_name TEXT,
    monthly_fee NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    group_id UUID REFERENCES public.groups(id) -- Guruhga bog'lash
);

-- 5. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT CHECK (type IN ('income','expense')) NOT NULL,
  amount          BIGINT NOT NULL CHECK (amount > 0),
  category        TEXT NOT NULL,
  department      TEXT CHECK (department IN ('oquv','marketing')) NOT NULL,
  payment_method  TEXT CHECK (payment_method IN ('cash','card','bank','debt')),
  note            TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by      UUID REFERENCES public.profiles(id) NOT NULL,
  receipt_url     TEXT,

  -- Kreditor va Debitor qarzlari uchun
  is_third_party  BOOLEAN DEFAULT false,
  paid_by         TEXT,
  third_party_name TEXT,
  due_date        DATE, -- Qarzni qaytarish muddati

  -- Bog'liqliklar
  student_id      UUID REFERENCES public.students(id),
  teacher_id      UUID REFERENCES public.teachers(id),

  deleted_at      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Eski jadvallar bo'lsa, yetishmayotgan ustunlarni qo'shib qoyish (Xato bermaydi):
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id);

-- 6. BUDGETS (Oylik byudjetlar)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(month_year, department, category)
);

-- 7. STORAGE BUCKET (Chek rasmlari uchun)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- XAVFSIZLIK: ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Eski policylarni o'chirish (Xato bermasligi uchun)
DROP POLICY IF EXISTS "All users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Owner and Accountant can view all" ON transactions;
DROP POLICY IF EXISTS "Admin can view own" ON transactions;
DROP POLICY IF EXISTS "Owner and Admin can insert" ON transactions;
DROP POLICY IF EXISTS "Owner can update (delete)" ON transactions;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;

DROP POLICY IF EXISTS "Barcha ko'ra oladi" ON profiles;
DROP POLICY IF EXISTS "Barcha ko'ra oladi" ON teachers;
DROP POLICY IF EXISTS "Barcha ko'ra oladi" ON groups;
DROP POLICY IF EXISTS "Barcha ko'ra oladi" ON students;
DROP POLICY IF EXISTS "Barcha ko'ra oladi" ON budgets;

DROP POLICY IF EXISTS "Admin va Owner qo'sha oladi" ON teachers;
DROP POLICY IF EXISTS "Admin va Owner tahrirlay oladi" ON teachers;
DROP POLICY IF EXISTS "Admin va Owner qo'sha oladi" ON groups;
DROP POLICY IF EXISTS "Admin va Owner tahrirlay oladi" ON groups;
DROP POLICY IF EXISTS "Admin va Owner qo'sha oladi" ON students;
DROP POLICY IF EXISTS "Admin va Owner tahrirlay oladi" ON students;
DROP POLICY IF EXISTS "Admin va Owner tahrirlay oladi" ON budgets;

-- Barcha ko'ra oladigan jadvallar (Faqat tizimga kirganlar ko'radi degan mantiqda)
CREATE POLICY "Barcha ko'ra oladi" ON profiles FOR SELECT USING (true);
CREATE POLICY "Barcha ko'ra oladi" ON teachers FOR SELECT USING (true);
CREATE POLICY "Barcha ko'ra oladi" ON groups FOR SELECT USING (true);
CREATE POLICY "Barcha ko'ra oladi" ON students FOR SELECT USING (true);
CREATE POLICY "Barcha ko'ra oladi" ON budgets FOR SELECT USING (true);

-- Ma'lumot qo'shish va tahrirlash (Admin va Owner uchun)
CREATE POLICY "Admin va Owner qo'sha oladi" ON teachers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON teachers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "Admin va Owner qo'sha oladi" ON groups FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON groups FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "Admin va Owner qo'sha oladi" ON students FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON students FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "Admin va Owner tahrirlay oladi" ON budgets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- TRANSACTIONS POLICIES
CREATE POLICY "Owner and Accountant can view all" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','accountant'))
);
CREATE POLICY "Admin can view own" ON transactions FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Owner and Admin can insert" ON transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin'))
);

CREATE POLICY "Owner can update (delete)" ON transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
);

-- STORAGE POLICIES
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- =========================================================================
-- BIRINCHI OWNER PROFILINI YARATISH (Siz yozgan kod)
-- =========================================================================
INSERT INTO profiles (id, full_name, email, role, department)
VALUES (
  'f1c86aa9-b234-4207-a1e1-be80198ac68f',
  'Abduraxmon',
  'abduraxmon@mizan.uz',
  'owner',
  'all'
)
ON CONFLICT (id) DO NOTHING;
