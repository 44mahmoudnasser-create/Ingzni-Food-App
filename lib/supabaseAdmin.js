import { createClient } from "@supabase/supabase-js";

// عميل Supabase بصلاحيات كاملة (Service Role) — بيتخطى RLS بالكامل.
// ⚠️ لازم يتستخدم بس جوه API routes (سيرفر)، وممنوع منعًا باتًا يتستورد
// في أي كومبوننت فيه "use client"، عشان مفتاح الـ Service Role سري
// وخطير لو ظهر في المتصفح (بيدي صلاحية كاملة على الداتابيز كلها).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
