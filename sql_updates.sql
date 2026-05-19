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
