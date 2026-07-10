"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, Phone, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone_number: "",
    email: "",
    password: "",
  });

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // -------------------------------------------------
  // تسجيل حساب جديد
  // -------------------------------------------------
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // supabase.auth.signUp بيعمل يوزر في auth.users
    // الـ metadata (name, phone_number) بتتقرأ تلقائيًا من الـ trigger
    // اللي عملناه في schema-updates.sql عشان يعمل سطر في جدول Users
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          phone_number: form.phone_number,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // حسب المطلوب: بعد التسجيل نفضل في نفس الصفحة ونحوّل لتبويب تسجيل الدخول
    setNotice("تم إنشاء حسابك بنجاح، سجّل دخولك دلوقتي.");
    setMode("login");
    setForm((f) => ({ ...f, password: "" }));
  };

  // -------------------------------------------------
  // تسجيل الدخول
  // -------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (signInError) {
      setError("البريد الإلكتروني أو كلمة السر غير صحيحة.");
      return;
    }

    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold font-[Cairo]">ط</span>
          </div>
          <h1 className="font-[Cairo] font-extrabold text-[20px] text-[#24201B]">
            {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
        </div>

        {/* تبديل التبويب */}
        <div className="flex bg-[#F4EFE6] rounded-2xl p-1 mb-6">
          <button
            onClick={() => { setMode("login"); setError(""); setNotice(""); }}
            className={`flex-1 h-10 rounded-xl text-[14px] font-bold font-[Cairo] transition ${
              mode === "login" ? "bg-white text-[#24201B] shadow-sm" : "text-[#8A8175]"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); setNotice(""); }}
            className={`flex-1 h-10 rounded-xl text-[14px] font-bold font-[Cairo] transition ${
              mode === "signup" ? "bg-white text-[#24201B] shadow-sm" : "text-[#8A8175]"
            }`}
          >
            حساب جديد
          </button>
        </div>

        {notice && (
          <div className="mb-4 bg-[#E9F5EE] text-[#166248] text-[13px] rounded-xl px-4 py-3">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-[#FCEBEB] text-[#A32D2D] text-[13px] rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3">
          {mode === "signup" && (
            <>
              <Field icon={User} placeholder="الاسم بالكامل" value={form.name} onChange={update("name")} required />
              <Field icon={Phone} placeholder="رقم الموبايل" type="tel" value={form.phone_number} onChange={update("phone_number")} required />
            </>
          )}
          <Field icon={Mail} placeholder="البريد الإلكتروني" type="email" value={form.email} onChange={update("email")} required />
          <Field icon={Lock} placeholder="كلمة السر" type="password" value={form.password} onChange={update("password")} required minLength={6} />

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-[#FF6B35] hover:bg-[#E8551F] disabled:opacity-60 text-white font-bold font-[Cairo] text-[15px] flex items-center justify-center gap-2 transition"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0A99C]" />
      <input
        {...props}
        className="w-full h-12 rounded-2xl bg-white border border-[#EFE9E1] pr-11 pl-4 text-[14px] text-[#24201B] placeholder:text-[#B0A99C] outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 transition"
      />
    </div>
  );
}
