-- ============================================================
-- تعديلات إضافية على الـ Schema (المرحلة التانية)
-- شغّل الملف ده في Supabase SQL Editor بعد schema-updates.sql
-- ============================================================

-- 1) تقسيم الأصناف داخل المطعم لأقسام (مقبلات، أطباق رئيسية، مشروبات...)
ALTER TABLE products ADD COLUMN IF NOT EXISTS section VARCHAR(50);

-- 2) ملاحظة على كل صنف داخل الطلب (مثلاً: "من غير بصل")
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3) ملاحظة عامة على الطلب كله (مثلاً: "اتصل قبل ما توصل")
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4) التقييم بعد التوصيل
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_comment TEXT;

-- 5) الوقت التقريبي المتوقع للتوصيل (بالدقايق)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER;

-- ============================================================
-- سياسة تسمح للمستخدم يعدّل طلبه (مطلوبة عشان يقدر يحفظ تقييمه)
-- ============================================================
DROP POLICY IF EXISTS "المستخدم يعدل تقييم طلبه" ON orders;
CREATE POLICY "المستخدم يعدل تقييم طلبه"
  ON orders FOR UPDATE USING (auth.uid() = user_id);
