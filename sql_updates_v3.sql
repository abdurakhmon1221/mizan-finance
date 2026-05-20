-- 3-bosqich o'zgarishlari: Qarzlar uchun muddat (due_date) qo'shish
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS due_date DATE;
