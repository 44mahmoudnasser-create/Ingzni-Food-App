-- ============================================================
-- تعديلات إضافية على الـ Schema (المرحلة التالتة)
-- شغّل الملف ده بعد schema-updates.sql و schema-updates-2.sql
-- ============================================================

-- 1) وقت التجهيز التقريبي لكل مطعم بالدقايق (يدخل في حساب الوقت
-- الإجمالي للتوصيل مع وقت الحركة الفعلي من جوجل ماب)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 15;

-- 2) أعمدة لتخزين بيانات مسار جوجل الفعلي مع كل طلب (اختياري لكن
-- مفيد لعرضه لاحقًا في صفحة الطلبات أو لوحة تحكم الإدارة)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_distance_km NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_waypoint_order JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_legs JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_maps_url TEXT;

-- ملاحظة: لازم تملأ عمود prep_time_minutes يدويًا لكل مطعم عندك
-- (لو سبته من غير تعديل، هياخد القيمة الافتراضية 15 دقيقة).
