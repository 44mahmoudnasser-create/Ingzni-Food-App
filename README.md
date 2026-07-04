# تطبيق التوصيل — Next.js + Supabase

## هيكل المشروع

```
food-delivery-app/
├── app/
│   ├── layout.jsx          # تغليف التطبيق بـ CartProvider + الخطوط
│   ├── globals.css
│   ├── page.jsx            # الصفحة الرئيسية (المطاعم + الكارت)
│   ├── login/page.jsx      # تسجيل الدخول / حساب جديد
│   ├── checkout/page.jsx   # إتمام الطلب
│   ├── orders/page.jsx     # طلباتي
│   └── profile/page.jsx    # الملف الشخصي
├── context/
│   └── CartContext.jsx     # إدارة الكارت وتقسيمه لـ Sub Orders
├── lib/
│   └── supabaseClient.js
├── schema-updates.sql      # تعديلات لازمة على الـ database بتاعتك
└── .env.local.example
```

## خطوات التشغيل

### 1) ثبّت المكتبات
```bash
npm install
```

### 2) جهّز متغيرات البيئة
انسخ `.env.local.example` باسم `.env.local` وحط فيه بيانات مشروعك
(هتلاقيها في Supabase Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3) نفّذ تعديلات الـ Schema
افتح **Supabase → SQL Editor** وشغّل محتوى ملف `schema-updates.sql`.
الملف ده بيعمل 3 حاجات مهمة:

1. **يضيف أعمدة ناقصة** كانت لازمة للواجهة (`category` و `image_url` في
   المطاعم، `payment_method` في الطلبات).
2. **يربط جدول `Users` بنظام تسجيل الدخول بتاع Supabase (`auth.users`)**
   عن طريق trigger: أي مستخدم يعمل حساب جديد بالإيميل والباسورد،
   بيتعمله تلقائيًا سطر في جدول `Users` بنفس الـ `id`.
3. **يفعّل Row Level Security** بحيث كل مستخدم يشوف بياناته وطلباته
   وعناوينه بس، والمطاعم/المنتجات تبقى متاحة للكل.

> ملاحظة: أسماء الجداول اللي انت كاتبها كانت من غير علامات اقتباس
> (`CREATE TABLE Users`)، فـ Postgres بيحفظها فعليًا بحروف صغيرة
> (`users`, `restaurants`, `products`...). عشان كده كل الاستعلامات في
> الكود (`.from("restaurants")`) بحروف صغيرة، وده الصح ومتوافق مع
> الجداول الأصلية.

### 4) شغّل المشروع
```bash
npm run dev
```

## إزاي كل صفحة بتستخدم Supabase API

| الصفحة | الاستعلامات المستخدمة |
|---|---|
| `login` | `supabase.auth.signUp()` و `supabase.auth.signInWithPassword()` |
| `page.jsx` (الرئيسية) | `supabase.auth.getUser()`, `.from("restaurants").select()`, `.from("products").select()` عند فتح مطعم |
| `checkout` | `.from("addresses").select()`, ثم عند التأكيد: `insert` في `orders` → `sub_orders` (واحد لكل مطعم) → `order_items` |
| `orders` | استعلام واحد متداخل (`select` مع علاقات) يجيب `orders` مع `sub_orders` و `order_items` و أسماء المطاعم/المنتجات |
| `profile` | `.from("users").select()/.update()`, و CRUD كامل على `.from("addresses")` |

## تحديد العنوان بالموقع (خريطة)

صفحة البروفايل فيها دلوقتي خريطة تفاعلية (Leaflet + OpenStreetMap،
مجانية بالكامل بدون API key) لما تضيف أو تعدّل عنوان:

- تقدر تدوس على أي نقطة في الخريطة لتحديد الموقع، أو تسحب الدبوس.
- أو تدوس "استخدام موقعي الحالي" عشان ياخد موقعك الفعلي من المتصفح
  (المتصفح هيطلب إذنك الأول).
- الإحداثيات بتتسجل في عمودي `latitude` و `longitude` الموجودين
  أصلًا في جدول `addresses`.

بعد `npm install` (عشان يجيب مكتبة `leaflet` الجديدة)، شغّل المشروع
عادي وجرّب من صفحة البروفايل.

## نقاط محتاجة شغل فعلي لاحقًا (TODO)

- **حساب رسوم التوصيل**: دلوقتي بيتحسب فعليًا بمسافة خط مستقيم
  (Haversine) بين إحداثيات المطعم وإحداثيات العنوان، بمعادلة
  `10 ج.م أساسي + 2.5 ج.م لكل كيلومتر` (موجودة في `checkout/page.jsx`).
  ده تقريبي لأنه مش بياخد شكل الطرق الفعلي في الاعتبار. لو حبيت دقة
  أكبر، استبدل الدالة بنداء **Google Distance Matrix API** بنفس الـ
  inputs. **مهم:** الحساب ده مش هيشتغل صح غير لو عمود
  `latitude`/`longitude` بتاع كل مطعم متملي فعليًا في جدول
  `restaurants` (لسه فاضي دلوقتي، لازم تدخله يدوي أو من لوحة تحكم
  الإدارة).
- **تصنيفات المطاعم**: لازم تملأ عمود `category` يدويًا للمطاعم
  الموجودة (أو من لوحة تحكم الإدارة) بالقيم: `مشاوي`, `بيتزا`,
  `أكل صحي`, `مشروبات`, `شرقي` (أو عدّل المصفوفة `CATEGORIES` في
  `app/page.jsx` حسب التصنيفات الفعلية عندك).
- **صور المطاعم/المنتجات**: الأعمدة `image_url` مضافة لكن الواجهة
  حاليًا بتعرض أيقونة بدل الصورة؛ لو عبّيت الأعمدة دي، بدّل مكان
  الأيقونة في `RestaurantCard` بـ `<img src={r.image_url} />`.
