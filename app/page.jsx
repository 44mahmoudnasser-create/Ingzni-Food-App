"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import {
  Search, User, ClipboardList, Plus, Minus, X,
  ShoppingBag, Trash2, UtensilsCrossed, Pencil, StickyNote,
} from "lucide-react";

const CATEGORIES = ["مشاوي", "بيتزا", "أكل صحي", "مشروبات", "شرقي"];

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [productMatchIds, setProductMatchIds] = useState(null); // restaurant_ids اللي فيها منتج مطابق للبحث

  const [activeRestaurant, setActiveRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // -------------------------------------------------
  // الصفحة الرئيسية متاحة للزوار من غير تسجيل دخول.
  // بنعرف بس هل فيه مستخدم مسجل ولا لأ من غير ما نمنعه من التصفح.
  // -------------------------------------------------
  useEffect(() => {
    supabase.auth.getUser().then(() => setCheckingAuth(false));
  }, []);

  // بتتأكد إن فيه مستخدم مسجل دخول قبل ما تروح لصفحة شخصية،
  // لو مفيش بتحوّله لصفحة تسجيل الدخول بدل الصفحة المطلوبة
  const goToProtected = async (path) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }
    router.push(path);
  };

  // -------------------------------------------------
  // جلب المطاعم النشطة
  // -------------------------------------------------
  useEffect(() => {
    if (checkingAuth) return;
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
  }, [checkingAuth]);

  // -------------------------------------------------
  // البحث بالاسم: بيدور على اسم المطعم، وكمان بيدور جوه المنتجات
  // عشان لو كتبت اسم صنف (مش اسم مطعم) يطلعلك المطعم اللي بيقدمه.
  // -------------------------------------------------
  useEffect(() => {
    const term = query.trim();
    if (term === "") {
      setProductMatchIds(null);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("restaurant_id")
        .ilike("name", `%${term}%`);
      setProductMatchIds(new Set((data || []).map((p) => p.restaurant_id)));
    }, 300); // debounce بسيط عشان مايبعتش استعلام مع كل حرف

    return () => clearTimeout(timeout);
  }, [query]);

  const filteredRestaurants = useMemo(() => {
    const term = query.trim();
    return restaurants.filter((r) => {
      const matchesName = term === "" || r.name.includes(term);
      const matchesProduct = productMatchIds?.has(r.id) || false;
      const matchesQuery = term === "" || matchesName || matchesProduct;
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(r.category);
      return matchesQuery && matchesCategory;
    });
  }, [restaurants, query, selectedCategories, productMatchIds]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // -------------------------------------------------
  // لو المستخدم جاي من مكوّن البحث في الشريط السفلي (رابط فيه
  // ?restaurant=<id>)، نفتحله المطعم ده تلقائيًا
  // -------------------------------------------------
  useEffect(() => {
    const restaurantId = searchParams.get("restaurant");
    if (!restaurantId) return;

    const openFromLink = async () => {
      const { data } = await supabase.from("restaurants").select("*").eq("id", restaurantId).single();
      if (data) openRestaurant(data);
      router.replace("/"); // نظّف الرابط بعد الفتح
    };
    openFromLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // -------------------------------------------------
  // فتح مطعم وجلب المنتجات المتاحة بتاعته
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

  if (checkingAuth) return null;

  return (
    <div className="min-h-screen">
      {/* الهيدر */}
      <header className="sticky top-0 z-20 bg-[#FFFBF6]/95 backdrop-blur border-b border-[#EFE9E1]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToProtected("/profile")}
              className="w-10 h-10 rounded-full bg-[#F4EFE6] flex items-center justify-center"
              aria-label="الملف الشخصي"
            >
              <User size={18} className="text-[#5C564C]" />
            </button>
            <button
              onClick={() => goToProtected("/orders")}
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
        <main>
          <div className="relative mb-4">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8175]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن مطعم أو صنف..."
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
            <p className="text-[#8A8175] text-[14px]">مفيش مطاعم أو أصناف مطابقة.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredRestaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => openRestaurant(r)}
                  className="text-right bg-white rounded-2xl border border-[#EFE9E1] overflow-hidden hover:border-[#E3D9CB] transition-all active:scale-[0.98]"
                >
                  <div className="h-28 bg-[#FFF1EB] flex items-center justify-center">
                    <UtensilsCrossed size={32} strokeWidth={1.5} className="text-[#B23E12]" />
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

        {/* على الموبايل السلة بتتفتح من الشريط السفلي، فالبانل ده للشاشات الكبيرة بس */}
        <div className="hidden lg:block">
          <CartPanel onCheckout={() => goToProtected("/checkout")} />
        </div>
      </div>

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
   مودال قائمة الطعام: مقسّم لأقسام + بحث محلي + ملاحظة قبل الإضافة
--------------------------------------------------- */
function MenuModal({ restaurant, items, loading, onClose }) {
  const { cart, addItem, incItem, decItem } = useCart();
  const restaurantCart = cart[restaurant.id]?.items || {};
  const [menuQuery, setMenuQuery] = useState("");
  const [noteDraftFor, setNoteDraftFor] = useState(null); // id الصنف اللي بنكتب ملاحظة ليه دلوقتي
  const [noteText, setNoteText] = useState("");

  const visibleItems = useMemo(() => {
    const term = menuQuery.trim();
    if (term === "") return items;
    return items.filter((i) => i.name.includes(term));
  }, [items, menuQuery]);

  // تجميع الأصناف حسب القسم (عمود section في جدول products)
  const sections = useMemo(() => {
    const groups = {};
    visibleItems.forEach((item) => {
      const sectionName = item.section || "أصناف أخرى";
      if (!groups[sectionName]) groups[sectionName] = [];
      groups[sectionName].push(item);
    });
    return groups;
  }, [visibleItems]);

  const openNoteForm = (item) => {
    setNoteDraftFor(item.id);
    setNoteText(restaurantCart[item.id]?.note || "");
  };

  const confirmAdd = (item) => {
    addItem(item, restaurant, noteText.trim());
    setNoteDraftFor(null);
    setNoteText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#24201B]/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#EFE9E1]">
          <h2 className="font-[Cairo] font-extrabold text-[16px] text-[#24201B]">{restaurant.name}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F4EFE6] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* بحث عن صنف داخل المنيو */}
        <div className="px-5 pt-3">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8175]" />
            <input
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="ابحث عن صنف في المنيو..."
              className="w-full h-10 rounded-xl bg-[#FFFBF6] border border-[#EFE9E1] pr-9 pl-3 text-[13px] outline-none focus:border-[#FF6B35] transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2">
          {loading ? (
            <p className="text-[#8A8175] text-[13px] py-6">جاري تحميل المنيو...</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-[#8A8175] text-[13px] py-6">لا يوجد أصناف مطابقة.</p>
          ) : (
            Object.entries(sections).map(([sectionName, sectionItems]) => (
              <div key={sectionName} className="mb-2">
                <p className="text-[12px] font-bold font-[Cairo] text-[#FF6B35] pt-3 pb-1 sticky top-0 bg-white">
                  {sectionName}
                </p>
                <div className="divide-y divide-[#EFE9E1]">
                  {sectionItems.map((item) => {
                    const qty = restaurantCart[item.id]?.qty || 0;
                    const existingNote = restaurantCart[item.id]?.note;
                    const showNoteForm = noteDraftFor === item.id;

                    return (
                      <div key={item.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold font-[Cairo] text-[14px] text-[#24201B]">{item.name}</p>
                            <p className="text-[12px] text-[#8A8175] mb-1 line-clamp-2">{item.description}</p>
                            <p className="text-[13px] font-bold font-[JetBrains_Mono]">
                              {Number(item.price).toLocaleString("ar-EG")} ج.م
                            </p>
                            {existingNote && !showNoteForm && (
                              <p className="text-[11px] text-[#8A5A0A] bg-[#FEF3E2] inline-flex items-center gap-1 rounded-md px-2 py-0.5 mt-1.5">
                                <StickyNote size={10} /> {existingNote}
                              </p>
                            )}
                          </div>

                          {qty === 0 ? (
                            <button
                              onClick={() => openNoteForm(item)}
                              className="w-9 h-9 rounded-full bg-[#FF6B35] text-white flex items-center justify-center active:scale-90 transition"
                              aria-label={`إضافة ${item.name}`}
                            >
                              <Plus size={18} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openNoteForm(item)}
                                className="w-7 h-7 rounded-full bg-[#F4EFE6] flex items-center justify-center"
                                aria-label="تعديل الملاحظة"
                              >
                                <Pencil size={12} className="text-[#8A8175]" />
                              </button>
                              <div className="flex items-center gap-2 bg-[#FF6B35] rounded-full px-1 py-1">
                                <button onClick={() => incItem(restaurant.id, item.id)} className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center">
                                  <Plus size={13} strokeWidth={3} />
                                </button>
                                <span className="text-white text-[12.5px] font-bold font-[JetBrains_Mono] min-w-[14px] text-center">{qty}</span>
                                <button onClick={() => decItem(restaurant.id, item.id)} className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center">
                                  <Minus size={13} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* فورم الملاحظة قبل/بعد الإضافة */}
                        {showNoteForm && (
                          <div className="mt-2.5 bg-[#FFFBF6] border border-[#EFE9E1] rounded-xl p-2.5">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              rows={2}
                              placeholder="ملاحظة على الصنف ده (اختياري)، مثلاً: من غير بصل"
                              className="w-full rounded-lg border border-[#EFE9E1] p-2 text-[12.5px] outline-none focus:border-[#FF6B35] resize-none mb-2"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => confirmAdd(item)}
                                className="flex-1 h-8 rounded-lg bg-[#FF6B35] text-white text-[12px] font-bold font-[Cairo]"
                              >
                                {qty === 0 ? "إضافة للسلة" : "حفظ الملاحظة"}
                              </button>
                              <button
                                onClick={() => setNoteDraftFor(null)}
                                className="flex-1 h-8 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[12px] font-bold font-[Cairo]"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
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
   بانل الكارت — مقسم لـ Sub Orders، مع عرض ملاحظة كل صنف
--------------------------------------------------- */
function CartPanel({ onCheckout }) {
  const { subOrders, itemsCount, subtotal, incItem, decItem, removeSubOrder, updateNote } = useCart();
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  const startEditNote = (restaurantId, product) => {
    setEditingNoteFor(`${restaurantId}:${product.id}`);
    setNoteDraft(product.note || "");
  };

  const saveNote = (restaurantId, productId) => {
    updateNote(restaurantId, productId, noteDraft.trim());
    setEditingNoteFor(null);
  };

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
              {so.items.map(({ product, qty, note }) => {
                const editKey = `${so.restaurant.id}:${product.id}`;
                const isEditing = editingNoteFor === editKey;
                return (
                  <div key={product.id} className="py-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] text-[#5C564C]">{product.name}</p>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEditNote(so.restaurant.id, { ...product, note })} className="text-[#B0A99C]" aria-label="ملاحظة على الصنف">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => incItem(so.restaurant.id, product.id)} className="w-6 h-6 rounded-full bg-[#F4EFE6] flex items-center justify-center">
                          <Plus size={11} strokeWidth={3} />
                        </button>
                        <span className="text-[12px] font-bold font-[JetBrains_Mono] min-w-[12px] text-center">{qty}</span>
                        <button onClick={() => decItem(so.restaurant.id, product.id)} className="w-6 h-6 rounded-full bg-[#F4EFE6] flex items-center justify-center">
                          <Minus size={11} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    {note && !isEditing && (
                      <p className="text-[10.5px] text-[#8A5A0A] mt-0.5">ملاحظة: {note}</p>
                    )}
                    {isEditing && (
                      <div className="mt-1.5 flex gap-1.5">
                        <input
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="ملاحظة على الصنف..."
                          className="flex-1 h-8 rounded-lg border border-[#EFE9E1] px-2 text-[11.5px] outline-none focus:border-[#FF6B35]"
                        />
                        <button onClick={() => saveNote(so.restaurant.id, product.id)} className="px-2.5 h-8 rounded-lg bg-[#FF6B35] text-white text-[11px] font-bold">حفظ</button>
                      </div>
                    )}
                  </div>
                );
              })}
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
import { Suspense } from "react"; // تأكد إن دي مكتوبة فوق مع الـ imports

// الدالة دي هي اللي Next.js هيشوفها، وهتشغل محتوى الصفحة بتاعتك جوه Suspense
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>جاري التحميل...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
