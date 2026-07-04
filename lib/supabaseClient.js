import { createClient } from "@supabase/supabase-js";

// حط القيم دي في ملف .env.local في روت المشروع:
// NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
