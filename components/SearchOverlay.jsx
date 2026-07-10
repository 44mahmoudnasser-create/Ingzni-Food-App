"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Search, X, UtensilsCrossed } from "lucide-react";

export default function SearchOverlay({ onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term === "") {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      // بندور على اسم المطعم، وكمان على اسم أي منتج جوه أي مطعم
      const [{ data: byName }, { data: byProduct }] = await Promise.all([
        supabase.from("restaurants").select("*").eq("is_active", true).ilike("name", `%${term}%`),
        supabase
          .from("products")
          .select("restaurant_id, restaurants(*)")
          .ilike("name", `%${term}%`),
      ]);

      const map = new Map();
      (byName || []).forEach((r) => map.set(r.id, r));
      (byProduct || []).forEach((p) => {
        if (p.restaurants) map.set(p.restaurants.id, p.restaurants);
      });

      setResults(Array.from(map.values()));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const openRestaurant = (restaurant) => {
    onClose();
    router.push(`/?restaurant=${restaurant.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FFFBF6] flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[#EFE9E1]">
        <div className="relative flex-1">
          <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8175]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مطعم أو صنف..."
            className="w-full h-12 rounded-2xl bg-white border border-[#EFE9E1] pr-11 pl-4 text-[14px] outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 transition"
          />
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#F4EFE6] flex items-center justify-center shrink-0" aria-label="إغلاق البحث">
          <X size={18} className="text-[#5C564C]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {query.trim() === "" ? (
          <p className="text-[#8A8175] text-[13.5px] text-center py-10">اكتب اسم مطعم أو صنف عشان تبدأ البحث</p>
        ) : loading ? (
          <p className="text-[#8A8175] text-[13.5px] text-center py-10">جاري البحث...</p>
        ) : results.length === 0 ? (
          <p className="text-[#8A8175] text-[13.5px] text-center py-10">مفيش نتائج مطابقة.</p>
        ) : (
          <div className="space-y-2.5">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => openRestaurant(r)}
                className="w-full flex items-center gap-3 bg-white border border-[#EFE9E1] rounded-2xl p-3 text-right"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFF1EB] flex items-center justify-center shrink-0">
                  <UtensilsCrossed size={20} className="text-[#B23E12]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold font-[Cairo] text-[14px] text-[#24201B]">{r.name}</p>
                  <p className="text-[12px] text-[#8A8175]">{r.category || "غير مصنف"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
