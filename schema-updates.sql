-- ============================================================
-- تعديلات لازم تتعمل على الـ Schema بتاعك في Supabase SQL Editor
-- قبل ما تشغل المشروع
-- ============================================================

-- 1) عمود التصنيف والصورة للمطاعم (مطلوب لفلترة الصفحة الرئيسية)
ALTER TABLE Restaurants ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE Restaurants ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE Restaurants ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE Restaurants ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 2) عمود صورة للمنتجات (اختياري لكن مفيد للـ UI)
ALTER TABLE Products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3) طريقة الدفع في الطلب (كاش / محفظة / انستاباي)
ALTER TABLE Orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash';

-- ============================================================
-- ربط جدول Users بجدول auth.users بتاع Supabase Auth
-- بما إن التسجيل هيبقى بـ Supabase Auth (Email + Password)
-- محتاجين أي مستخدم يتسجل يتعمله سطر تلقائي في جدول Users
-- بنفس الـ id بتاعه في auth.users
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.Users (id, name, phone_number)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'phone_number'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- تفعيل Row Level Security + Policies الأساسية
-- (عدّل حسب احتياجك، دي إعدادات مبدئية آمنة)
-- ============================================================

ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يشوف بياناته بس"
  ON Users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "المستخدم يعدل بياناته بس"
  ON Users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE Addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير عناوينه بس"
  ON Addresses FOR ALL USING (auth.uid() = user_id);

ALTER TABLE Orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يشوف طلباته بس"
  ON Orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "المستخدم ينشئ طلب لنفسه بس"
  ON Orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Restaurants و Products عامة (أي حد يقرأها بدون تسجيل دخول)
ALTER TABLE Restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الكل يشوف المطاعم" ON Restaurants FOR SELECT USING (true);

ALTER TABLE Products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الكل يشوف المنتجات" ON Products FOR SELECT USING (true);

-- Sub_Orders و Order_Items: يظهروا فقط لصاحب الـ Order المرتبطين بيه
ALTER TABLE Sub_Orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "صاحب الطلب يشوف الطلبات الفرعية"
  ON Sub_Orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM Orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "صاحب الطلب ينشئ الطلبات الفرعية"
  ON Sub_Orders FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM Orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

ALTER TABLE Order_Items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "صاحب الطلب يشوف عناصر الطلب"
  ON Order_Items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM Sub_Orders so
      JOIN Orders o ON o.id = so.order_id
      WHERE so.id = sub_order_id AND o.user_id = auth.uid()
    )
  );
CREATE POLICY "صاحب الطلب ينشئ عناصر الطلب"
  ON Order_Items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM Sub_Orders so
      JOIN Orders o ON o.id = so.order_id
      WHERE so.id = sub_order_id AND o.user_id = auth.uid()
    )
  );
