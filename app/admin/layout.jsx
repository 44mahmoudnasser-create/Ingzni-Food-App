"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard, UtensilsCrossed, Package, ClipboardList, Users, LogOut, Tag, Wallet,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/restaurants", label: "المطاعم", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "التصنيفات", icon: Tag },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/admin/wallets", label: "المحافظ", icon: Wallet },
  { href: "/admin/users", label: "المستخدمين", icon: Users },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  // checking | denied | allowed
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const check = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace(`/login?redirect=${pathname}`);
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single();

      setStatus(userRow?.is_admin ? "allowed" : "denied");
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (status === "checking") {
    return <p className="text-center py-20 text-[#8A8175]">جاري التحقق من الصلاحيات...</p>;
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <p className="font-[Cairo] font-extrabold text-[18px] text-[#24201B] mb-2">مفيش صلاحية دخول</p>
          <p className="text-[#8A8175] text-[13.5px] mb-4">
            الحساب ده مش عنده صلاحية أدمن. لو المفروض تبقى أدمن، اطلب من حد
            معاه صلاحية يفعّلها لك من صفحة "المستخدمين".
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-[#FF6B35] font-bold text-[13.5px]"
          >
            رجوع للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FFFBF6]">
      {/* سايدبار (شاشات كبيرة) */}
      <aside className="w-60 bg-white border-l border-[#EFE9E1] p-4 hidden md:flex md:flex-col shrink-0">
        <p className="font-[Cairo] font-extrabold text-[16px] text-[#FF6B35] mb-6 px-2">لوحة التحكم</p>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-bold font-[Cairo] transition ${
                  active ? "bg-[#FFF1EB] text-[#FF6B35]" : "text-[#5C564C] hover:bg-[#F4EFE6]"
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-bold font-[Cairo] text-[#A32D2D]"
        >
          <LogOut size={17} />
          تسجيل الخروج
        </button>
      </aside>

      {/* نافبار علوي (موبايل) */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-[#EFE9E1] flex items-center gap-1.5 overflow-x-auto px-2 py-2 scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-bold font-[Cairo] ${
                active ? "bg-[#FF6B35] text-white" : "bg-[#F4EFE6] text-[#5C564C]"
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 max-w-5xl mx-auto w-full">{children}</main>
    </div>
  );
}
