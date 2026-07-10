"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import SearchOverlay from "./SearchOverlay";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemsCount, openCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);

  const goToProtected = async (path) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }
    router.push(path);
  };

  const isHome = pathname === "/";
  const isProfile = pathname === "/profile";

  return (
    <>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-[#EFE9E1] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => router.push("/")}
            className="flex flex-col items-center justify-center gap-1"
            aria-label="الرئيسية"
          >
            <Home size={21} className={isHome ? "text-[#FF6B35]" : "text-[#8A8175]"} strokeWidth={isHome ? 2.4 : 1.8} />
            <span className={`text-[10.5px] font-[Cairo] font-bold ${isHome ? "text-[#FF6B35]" : "text-[#8A8175]"}`}>
              الرئيسية
            </span>
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center justify-center gap-1"
            aria-label="بحث"
          >
            <Search size={21} className="text-[#8A8175]" strokeWidth={1.8} />
            <span className="text-[10.5px] font-[Cairo] font-bold text-[#8A8175]">بحث</span>
          </button>

          <button
            onClick={openCart}
            className="relative flex flex-col items-center justify-center gap-1"
            aria-label="السلة"
          >
            <ShoppingBag size={21} className="text-[#8A8175]" strokeWidth={1.8} />
            {itemsCount > 0 && (
              <span className="absolute top-1 right-[calc(50%-16px)] w-4 h-4 rounded-full bg-[#FF6B35] text-white text-[9px] font-bold flex items-center justify-center">
                {itemsCount > 9 ? "9+" : itemsCount}
              </span>
            )}
            <span className="text-[10.5px] font-[Cairo] font-bold text-[#8A8175]">السلة</span>
          </button>

          <button
            onClick={() => goToProtected("/profile")}
            className="flex flex-col items-center justify-center gap-1"
            aria-label="البروفايل"
          >
            <User size={21} className={isProfile ? "text-[#FF6B35]" : "text-[#8A8175]"} strokeWidth={isProfile ? 2.4 : 1.8} />
            <span className={`text-[10.5px] font-[Cairo] font-bold ${isProfile ? "text-[#FF6B35]" : "text-[#8A8175]"}`}>
              البروفايل
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
