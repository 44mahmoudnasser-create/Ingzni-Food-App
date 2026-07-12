"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

const EMPTY_DRAFT = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  section: "",
  is_available: true,
};

export default function AdminProductsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  // تحميل قائمة المطاعم مرة واحدة، واختيار أول واحد تلقائيًا
  useEffect(() => {
    const loadRestaurants = async () => {
      const { data } = await supabase.from("restaurants").select("id, name").order("name");
      setRestaurants(data || []);
      if (data && data.length > 0) setRestaurantId(data[0].id);
      else setLoading(false);
    };
    loadRestaurants();
  }, []);

  const loadProducts = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("products")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("section")
      .order("name");
    if (!err) setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (p) => {
    setDraft({
      name: p.name || "",
      description: p.description || "",
      price: p.price ?? "",
      image_url: p.image_url || "",
      section: p.section || "",
      is_available: p.is_available,
    });
    setEditingId(p.id);
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const save = async () => {
    if (!draft.name.trim() || draft.price === "") {
      setError("اسم المنتج والسعر مطلوبين.");
      return;
    }
    setError("");
    setSaving(true);

    const payload = { ...draft, price: Number(draft.price), restaurant_id: restaurantId };

    if (editingId) {
      const { error: err } = await supabase.from("products").update(payload).eq("id", editingId);
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase.from("products").insert(payload);
      if (err) setError(err.message);
    }

    setSaving(false);
    if (!error) {
      cancel();
      loadProducts();
    }
  };

  const toggleAvailable = async (p) => {
    await supabase.from("products").update({ is_available: !p.is_available }).eq("id", p.id);
    loadProducts();
  };

  const remove = async (id) => {
    if (!confirm("متأكد إنك عايز تمسح المنتج ده؟")) return;
    const { error: err } = await supabase.from("products").delete().eq("id", id);
    if (err) {
      alert("تعذر الحذف: " + err.message);
      return;
    }
    loadProducts();
  };

  // تجميع المنتجات حسب القسم
  const grouped = products.reduce((acc, p) => {
    const section = p.section?.trim() || "أصناف أخرى";
    acc[section] = acc[section] || [];
    acc[section].push(p);
    return acc;
  }, {});

  const Form = (
    <div className="border-2 border-dashed border-[#EFE9E1] rounded-2xl p-4 mb-4 space-y-2.5">
      <input
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        placeholder="اسم المنتج"
        className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
      />
      <textarea
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        placeholder="وصف المنتج"
        rows={2}
        className="w-full rounded-lg border border-[#EFE9E1] p-3 text-[13px] outline-none focus:border-[#FF6B35] resize-none"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <input
          value={draft.price}
          onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
          placeholder="السعر (ج.م)"
          type="number"
          className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
        />
        <input
          value={draft.section}
          onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
          placeholder="القسم (مقبلات، أطباق رئيسية...)"
          className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
        />
      </div>
      <input
        value={draft.image_url}
        onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
        placeholder="رابط صورة المنتج (اختياري)"
        className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
      />
      <label className="flex items-center gap-2 text-[13px] text-[#5C564C]">
        <input
          type="checkbox"
          checked={draft.is_available}
          onChange={(e) => setDraft((d) => ({ ...d, is_available: e.target.checked }))}
        />
        متاح للطلب دلوقتي
      </label>
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 h-10 rounded-lg bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo] disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
        <button onClick={cancel} className="flex-1 h-10 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[13px] font-bold font-[Cairo]">
          إلغاء
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B] mb-4">المنتجات</h1>

      {/* اختيار المطعم */}
      <div className="mb-4">
        <select
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          className="w-full sm:w-80 h-11 rounded-xl border border-[#EFE9E1] bg-white px-3 text-[13.5px] font-bold font-[Cairo] text-[#24201B] outline-none focus:border-[#FF6B35]"
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {restaurants.length === 0 ? (
        <p className="text-[#8A8175] text-[13.5px]">أضف مطعم الأول من صفحة "المطاعم" قبل ما تضيف منتجات.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-[#8A8175]">{products.length} منتج</p>
            {!adding && !editingId && (
              <button
                onClick={startAdd}
                className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo]"
              >
                <Plus size={15} />
                إضافة منتج
              </button>
            )}
          </div>

          {error && <p className="text-[#A32D2D] text-[13px] mb-3 bg-[#FCEBEB] rounded-lg px-3 py-2">{error}</p>}

          {adding && Form}

          {loading ? (
            <p className="text-[#8A8175] text-[14px]">جاري التحميل...</p>
          ) : products.length === 0 && !adding ? (
            <div className="py-14 text-center">
              <Package size={30} className="mx-auto mb-2 text-[#D8CFC0]" strokeWidth={1.3} />
              <p className="text-[#8A8175] text-[13.5px]">المطعم ده لسه مفيهوش منتجات.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-5">
                <p className="font-bold font-[Cairo] text-[13.5px] text-[#5C564C] mb-2">{section}</p>
                <div className="space-y-2">
                  {items.map((p) =>
                    editingId === p.id ? (
                      <div key={p.id}>{Form}</div>
                    ) : (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-white border border-[#EFE9E1] rounded-2xl p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="font-bold font-[Cairo] text-[13.5px] text-[#24201B] truncate">{p.name}</p>
                          <p className="text-[12px] text-[#8A8175] truncate">{p.description}</p>
                          <p className="text-[12.5px] font-bold font-[JetBrains_Mono] text-[#24201B] mt-0.5">
                            {Number(p.price).toLocaleString("ar-EG")} ج.م
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleAvailable(p)}
                            className={`px-2.5 h-7 rounded-full text-[11px] font-bold font-[Cairo] ${
                              p.is_available ? "bg-[#E9F5EE] text-[#166248]" : "bg-[#FCEBEB] text-[#A32D2D]"
                            }`}
                          >
                            {p.is_available ? "متاح" : "متوقف"}
                          </button>
                          <button onClick={() => startEdit(p)} className="text-[#8A8175] p-1.5" aria-label="تعديل">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => remove(p.id)} className="text-[#A32D2D] p-1.5" aria-label="حذف">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
