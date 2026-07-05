"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import {
  Search, User, ClipboardList, Star, Plus, Minus, X,
  ShoppingBag, Trash2, UtensilsCrossed,
} from "lucide-react";

const CATEGORIES = ["مشاوي", "بيتزا", "أكل صحي", "مشروبات", "fastfood"];

export default function HomePage() {
  const router = useRouter();
  const cart = useCart();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [activeRestaurant, setActiveRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // -------------------------------------------------
  // 1) نتأكد لو فيه مستخدم مسجل دخول (من غير ما نحوّله لصفحة اللوجين).
  //    الصفحة الرئيسية بقت متاحة للكل حتى من غير تسجيل دخول، وهنستخدم
  //    isLoggedIn بس عشان نعرف نوجّه المستخدم صح لما يدوس "إتمام الطلب"
  //    أو أيقونة البروفايل.
  // -------------------------------------------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
  }, []);

  // -------------------------------------------------
  // 2) جلب المطاعم النشطة من Supabase (بدون أي شرط على تسجيل الدخول)
  // -------------------------------------------------
  useEffect(() => {
    const loadRestaurants = async () => {
      setLoadingRestaurants(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (!error) setRestaurants(data || []);
      setLoadingRestaurants(false);
    };

    loadRestaurants();
  }, []);

  // -------------------------------------------------
  // فلترة محلية بالبحث + التصنيفات (تقدر تحولها لاستعلام supabase
  // بـ .ilike() و .in() لو عدد المطاعم كبير)
  // -------------------------------------------------
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesQuery = query.trim() === "" || r.name.includes(query);
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(r.category);
      return matchesQuery && matchesCategory;
    });
  }, [restaurants, query, selectedCategories]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // -------------------------------------------------
  // 3) فتح مطعم معين وجلب المنتجات المتاحة بتاعته
  // -------------------------------------------------
  const openRestaurant = async (restaurant) => {
    setActiveRestaurant(restaurant);
    setLoadingMenu(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true);

    if (!error) setMenuItems(data || []);
    setLoadingMenu(false);
  };

  return (
    <div className="min-h-screen">
      {/* الهيدر */}
      <header className="sticky top-0 z-20 bg-[#FFFBF6]/95 backdrop-blur border-b border-[#EFE9E1]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/profile")}
              className="w-10 h-10 rounded-full bg-[#F4EFE6] flex items-center justify-center"
              aria-label="الملف الشخصي"
            >
              <User size={18} className="text-[#5C564C]" />
            </button>
            <button
              onClick={() => router.push("/orders")}
              className="h-10 px-3.5 rounded-full bg-[#F4EFE6] flex items-center gap-1.5 text-[13px] font-bold font-[Cairo] text-[#5C564C]"
            >
              <ClipboardList size={16} />
              طلباتي
            </button>
          </div>
          <span className="font-[Cairo] font-extrabold text-[16px] text-[#FF6B35]">توصيل</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* المحتوى الرئيسي: البحث + التصنيفات + المطاعم */}
        <main>
          <div className="relative mb-4">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8175]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن مطعم أو منتج..."
              className="w-full h-12 rounded-2xl bg-white border border-[#EFE9E1] pr-11 pl-4 text-[14px] outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 transition"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-full text-[13px] font-semibold font-[Cairo] border transition ${
                    active
                      ? "bg-[#24201B] text-white border-[#24201B]"
                      : "bg-white text-[#5C564C] border-[#EFE9E1]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {loadingRestaurants ? (
            <p className="text-[#8A8175] text-[14px]">جاري تحميل المطاعم...</p>
          ) : filteredRestaurants.length === 0 ? (
            <p className="text-[#8A8175] text-[14px]">مفيش مطاعم مطابقة.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredRestaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openRestaurant(r)}
                  className="text-right bg-white rounded-2xl border border-[#EFE9E1] overflow-hidden hover:border-[#E3D9CB] transition-all active:scale-[0.98]"
                >
                  <div className="h-28 bg-[#FFF1EB] flex items-center justify-center overflow-hidden">
  {r.image_url ? (
    <img 
      src={r.image_url} 
      alt={r.name} 
      className="w-full h-full object-cover"
    />
  ) : (
    <UtensilsCrossed size={32} strokeWidth={1.5} className="text-[#B23E12]" />
  )}
</div>
                  <div className="p-3.5">
                    <h3 className="font-bold font-[Cairo] text-[15px] text-[#24201B]">{r.name}</h3>
                    <p className="text-[12.5px] text-[#8A8175] mb-1.5">{r.category || "غير مصنف"}</p>
                    <p className="text-[12px] text-[#8A8175] line-clamp-2">{r.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {/* الكارت الجانبي */}
        <CartPanel
          onCheckout={() => {
            if (!isLoggedIn) {
              router.push("/login?redirect=/checkout");
            } else {
              router.push("/checkout");
            }
          }}
        />
      </div>

      {/* مودال المنيو */}
      {activeRestaurant && (
        <MenuModal
          restaurant={activeRestaurant}
          items={menuItems}
          loading={loadingMenu}
          onClose={() => setActiveRestaurant(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------
   مودال قائمة الطعام لمطعم معين
--------------------------------------------------- */
function MenuModal({ restaurant, items, loading, onClose }) {
  const { cart, addItem, incItem, decItem } = useCart();
  const restaurantCart = cart[restaurant.id]?.items || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#24201B]/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#EFE9E1]">
          <h2 className="font-[Cairo] font-extrabold text-[16px] text-[#24201B]">{restaurant.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F4EFE6] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <p className="text-[#8A8175] text-[13px] py-6">جاري تحميل المنيو...</p>
          ) : items.length === 0 ? (
            <p className="text-[#8A8175] text-[13px] py-6">لا يوجد منتجات متاحة حاليًا.</p>
          ) : (
            <div className="divide-y divide-[#EFE9E1]">
              {items.map((item) => {
                const qty = restaurantCart[item.id]?.qty || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <p className="font-bold font-[Cairo] text-[14px] text-[#24201B]">{item.name}</p>
                      <p className="text-[12px] text-[#8A8175] mb-1 line-clamp-2">{item.description}</p>
                      <p className="text-[13px] font-bold font-[JetBrains_Mono]">{Number(item.price).toLocaleString("ar-EG")} ج.م</p>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => addItem(item, restaurant)}
                        className="w-9 h-9 rounded-full bg-[#FF6B35] text-white flex items-center justify-center active:scale-90 transition"
                      >
                        <Plus size={18} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#FF6B35] rounded-full px-1 py-1">
                        <button onClick={() => incItem(restaurant.id, item.id)} className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center">
                          <Plus size={13} strokeWidth={3} />
                        </button>
                        <span className="text-white text-[12.5px] font-bold font-[JetBrains_Mono] min-w-[14px] text-center">{qty}</span>
                        <button onClick={() => decItem(restaurant.id, item.id)} className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center">
                          <Minus size={13} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-[#24201B] text-white font-bold font-[Cairo] text-[14px]"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   بانل الكارت — مقسم لـ Sub Orders حسب كل مطعم
--------------------------------------------------- */
function CartPanel({ onCheckout }) {
  const { subOrders, itemsCount, subtotal, incItem, decItem, removeSubOrder } = useCart();

  return (
    <aside className="bg-white border border-[#EFE9E1] rounded-2xl p-4 h-fit lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[Cairo] font-extrabold text-[16px] text-[#24201B]">سلة الطلبات</h2>
        <span className="text-[12px] text-[#8A8175]">{itemsCount} عنصر</span>
      </div>

      {subOrders.length === 0 ? (
        <div className="py-10 text-center">
          <ShoppingBag size={32} className="mx-auto mb-2 text-[#D8CFC0]" strokeWidth={1.3} />
          <p className="text-[#8A8175] text-[13px]">السلة فارغة</p>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {subOrders.map((so) => (
            <div key={so.restaurant.id} className="border-2 border-dashed border-[#EFE9E1] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold font-[Cairo] text-[13px] text-[#24201B]">{so.restaurant.name}</p>
                <button onClick={() => removeSubOrder(so.restaurant.id)} aria-label="حذف طلب هذا المطعم">
                  <Trash2 size={14} className="text-[#B0A99C]" />
                </button>
              </div>
              {so.items.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between py-1.5">
                  <p className="text-[12.5px] text-[#5C564C]">{product.name}</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => incItem(so.restaurant.id, product.id)} className="w-6 h-6 rounded-full bg-[#F4EFE6] flex items-center justify-center">
                      <Plus size={11} strokeWidth={3} />
                    </button>
                    <span className="text-[12px] font-bold font-[JetBrains_Mono] min-w-[12px] text-center">{qty}</span>
                    <button onClick={() => decItem(so.restaurant.id, product.id)} className="w-6 h-6 rounded-full bg-[#F4EFE6] flex items-center justify-center">
                      <Minus size={11} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="text-left text-[12px] font-bold font-[JetBrains_Mono] text-[#24201B] mt-1.5 pt-1.5 border-t border-[#EFE9E1]">
                {so.subtotal.toLocaleString("ar-EG")} ج.م
              </div>
            </div>
          ))}
        </div>
      )}

      {subOrders.length > 0 && (
        <>
          <div className="flex justify-between text-[14px] font-bold text-[#24201B] mb-3 pt-3 border-t border-[#EFE9E1]">
            <span>الإجمالي</span>
            <span className="font-[JetBrains_Mono]">{subtotal.toLocaleString("ar-EG")} ج.م</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full h-12 rounded-2xl bg-[#FF6B35] hover:bg-[#E8551F] text-white font-bold font-[Cairo] text-[14px] transition"
          >
            إتمام الطلب
          </button>
        </>
      )}
    </aside>
  );
}
