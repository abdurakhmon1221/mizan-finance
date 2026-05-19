-- 1. Students (O'quvchilar) jadvalini yaratish
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    course_name TEXT,
    monthly_fee NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id)
);

-- RLS (Row Level Security)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barcha ko'ra oladi" ON public.students
    FOR SELECT USING (true);

CREATE POLICY "Admin va Owner qo'sha oladi" ON public.students
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    );

CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.students
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Tranzaksiyalar jadvaliga o'quvchi ID sini qo'shish (ixtiyoriy, to'lovni bog'lash uchun)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id);

-- 2. Teachers (O'qituvchilar va Xodimlar) jadvalini yaratish
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    salary_type TEXT DEFAULT 'fixed', -- 'fixed' (belgilangan) yoki 'percentage' (foiz)
    base_salary NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id)
);

-- RLS (Row Level Security)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barcha ko'ra oladi" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Admin va Owner qo'sha oladi" ON public.teachers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.teachers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Tranzaksiyalarga o'qituvchini bog'lash uchun
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id);

-- 3. Budgets (Oylik byudjetlar) jadvalini yaratish
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    UNIQUE(month_year, department, category)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barcha ko'ra oladi" ON public.budgets FOR SELECT USING (true);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.budgets FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
