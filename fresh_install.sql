-- =========================================================================
-- MIZAN FINANCE: NOLDAN O'RNATISH UCHUN TO'LIQ SQL SCRIPT
-- (Diqqat: Agar bazani tozalab, noldan boshlayotgan bo'lsangiz shuni ishlating)
-- =========================================================================

-- Avvalgi barcha jadvallarni va ularga bog'liq narsalarni o'chirish (Tozalash)
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. PROFILES TABLE (Foydalanuvchilar va rollar)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT CHECK (role IN ('owner','admin','accountant')) NOT NULL DEFAULT 'admin',
  department  TEXT CHECK (department IN ('oquv','marketing','all')) DEFAULT 'all',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TEACHERS (Xodimlar va O'qituvchilar)
CREATE TABLE public.teachers (
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
CREATE TABLE public.groups (
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
CREATE TABLE public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    course_name TEXT,
    monthly_fee NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    group_id UUID REFERENCES public.groups(id)
);

-- 5. TRANSACTIONS TABLE (Kirim, Xarajat va Qarzlar)
CREATE TABLE public.transactions (
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
  due_date        DATE, 

  -- Bog'liqliklar
  student_id      UUID REFERENCES public.students(id),
  teacher_id      UUID REFERENCES public.teachers(id),

  deleted_at      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. BUDGETS (Oylik byudjet limitlari)
CREATE TABLE public.budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL,
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "All users can view profiles" ON public.profiles FOR SELECT USING (true);

-- 2. Teachers
CREATE POLICY "Barcha ko'ra oladi" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Admin va Owner qo'sha oladi" ON public.teachers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.teachers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 3. Groups
CREATE POLICY "Barcha ko'ra oladi" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Admin va Owner qo'sha oladi" ON public.groups FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.groups FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 4. Students
CREATE POLICY "Barcha ko'ra oladi" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admin va Owner qo'sha oladi" ON public.students FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.students FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 5. Transactions
CREATE POLICY "Owner and Accountant can view all" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','accountant'))
);
CREATE POLICY "Admin can view own" ON public.transactions FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Owner and Admin can insert" ON public.transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin'))
);
CREATE POLICY "Owner can update (delete)" ON public.transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
);

-- 6. Budgets
CREATE POLICY "Barcha ko'ra oladi" ON public.budgets FOR SELECT USING (true);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.budgets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 7. Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- =========================================================================
-- BIRINCHI OWNER PROFILINI YARATISH
-- (Sizning oldingi yozgan kodingizdagi profil avtomatik kiritiladi)
-- =========================================================================
INSERT INTO public.profiles (id, full_name, email, role, department)
VALUES (
  'f1c86aa9-b234-4207-a1e1-be80198ac68f',
  'Abduraxmon',
  'abduraxmon@mizan.uz',
  'owner',
  'all'
)
ON CONFLICT (id) DO NOTHING;
