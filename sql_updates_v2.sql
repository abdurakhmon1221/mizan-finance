-- 1. Groups (Guruhlar/Kurslar) jadvalini yaratish
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id UUID REFERENCES public.teachers(id),
    price NUMERIC NOT NULL DEFAULT 0,
    schedule TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id)
);

-- RLS (Row Level Security)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barcha ko'ra oladi" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Admin va Owner qo'sha oladi" ON public.groups FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Admin va Owner tahrirlay oladi" ON public.groups FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);

-- 2. Students jadvaliga group_id qo'shish
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id);

-- Eslatma: transactions jadvalida student_id va teacher_id avvalgi sql_updates.sql da qo'shilgan edi.
