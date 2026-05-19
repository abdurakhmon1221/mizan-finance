# Mizan Finance - O'rnatish va Deploy qilish bo'yicha Qollanma

Bu hujjatda "Mizan Finance" dasturini ishga tushirish, ma'lumotlar bazasini sozlash va uni internetga (Vercel) chiqarish bo'yicha qadam-baqadam ko'rsatmalar saqlangan. Barcha suhbatlarimizning muhim qismi shu hujjatda jamlangan.

## 1. Supabase Ma'lumotlar Bazasini Sozlash

Supabase (backend va ma'lumotlar bazasi) dastur ma'lumotlarini saqlash uchun ishlatiladi.

1. **SQL Editor** sahifasini oching:
   - Havola: [Supabase SQL Editor](https://supabase.com/dashboard/project/xtioydziumpissjbqcej/sql/new)
2. **SQL Kodini kiriting:**
   - Loyihangizdagi `mizan-finance/supabase_schema.sql` fayli ichidagi barcha kodlarni to'liq nusxalang.
   - Supabase qora oynasiga tashlang va yashil **Run** (yoki `Ctrl + Enter`) tugmasini bosing.
   *(Bu amaliyot barcha kerakli jadvallar va RLS xavfsizlik qoidalarini yaratadi).*

## 2. Birinchi Owner (Egasi) Profilini Yaratish

Ma'lumotlar bazasi yaratilgach, dasturga kirish uchun maxsus Owner profilini yaratish kerak.

1. VS Code terminalini oching ( `mizan-finance` papkasida ekanligingizga ishonch hosil qiling).
2. Quyidagi buyruqni ishlating:
   ```bash
   node setup.js
   ```
3. Terminalda **"✅ Muvaffaqiyatli! Endi dasturga kirishingiz mumkin."** degan yozuv chiqadi.
4. Tizimga kirish uchun ma'lumotlaringiz:
   - **Email:** `abduraxmon@mizan.uz`
   - **Parol:** `MizanOwner2025!`

## 3. Loyihani GitHub'ga joylash va Vercel'ga ulash (Deploy)

Dasturni hammaga ochiq, telefon va boshqa kompyuterlardan ham kirish mumkin bo'lishi uchun uni Vercel hostingiga joylashtiramiz.

### A) GitHub'ga yuklash
1. Kompyuteringizdagi **GitHub Desktop** dasturini oching.
2. Yuqoridan **File -> Add local repository...** ni tanlang.
3. `mizan-finance` papkasini ko'rsating va "Add repository" tugmasini bosing.
4. Ekrandagi ko'k rangli **Publish repository** tugmasini bosing. Loyiha GitHub profilingizga yuklanadi.

### B) Vercel'da ishga tushirish
1. [vercel.com](https://vercel.com) saytiga kiring va tizimga ulaning (GitHub orqali).
2. Katta qora **Add New... -> Project** tugmasini bosing.
3. GitHub ro'yxatidan `mizan-finance` repozitoriyasini topib, yonidagi **Import** tugmasini bosing.
4. **Environment Variables** (Muhit o'zgaruvchilari) bo'limini kengaytiring va quyidagi 2 ta kalitni qo'shing:
   - Name: `VITE_SUPABASE_URL` | Value: `https://xtioydziumpissjbqcej.supabase.co`
   - Name: `VITE_SUPABASE_ANON_KEY` | Value: (Sizdagi uzun `sb_publishable...` kalitini kiriting).
5. Ikkalasini *Add* qilib qo'shgach, eng pastdagi ko'k rangli **Deploy** tugmasini bosing.

🎉 **Tayyor!** Vercel sizga taxminan 1 daqiqa ichida tayyor sayt manzilini beradi. Shu link yordamida dasturdan foydalanaverasiz.
