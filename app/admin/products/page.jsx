"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Pencil, Trash2, Package, ChevronDown, Layers } from "lucide-react";

const EMPTY_DRAFT = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  section: "",
  is_available: true,
};

const EMPTY_VARIANT = { name: "", price: "", is_available: true };

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

  // إدارة الأحجام: أي منتج مفتوح دلوقتي، ومسودة الحجم اللي بتتضاف/تتعدل
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [variantDraft, setVariantDraft] = useState(EMPTY_VARIANT);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [addingVariant, setAddingVariant] = useState(false);

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
      .select("*, product_variants(*)")
      .eq("restaurant_id", restaurantId)
      .order("section")
      .order("name");
    if (!err) {
      // نرتب الأحجام جوه كل منتج حسب sort_order
      const withSortedVariants = (data || []).map((p) => ({
        ...p,
        product_variants: [...(p.product_variants || [])].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        ),
      }));
      setProducts(withSortedVariants);
    }
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
    if (!confirm("متأكد إنك عايز تمسح المنتج ده؟ هيتمسح معاه كل أحجامه.")) return;
    const { error: err } = await supabase.from("products").delete().eq("id", id);
    if (err) {
      alert("تعذر الحذف: " + err.message);
      return;
    }
    loadProducts();
  };

  // -------------------------------------------------
  // إدارة الأحجام/الأنواع (Variants) لكل منتج
  // -------------------------------------------------
  const toggleExpand = (productId) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
    setAddingVariant(false);
    setEditingVariantId(null);
  };

  const startAddVariant = (productId) => {
    setExpandedProductId(productId);
    setVariantDraft(EMPTY_VARIANT);
    setAddingVariant(true);
    setEditingVariantId(null);
  };

  const startEditVariant = (v) => {
    setVariantDraft({ name: v.name, price: v.price, is_available: v.is_available });
    setEditingVariantId(v.id);
    setAddingVariant(false);
  };

  const cancelVariant = () => {
    setAddingVariant(false);
    setEditingVariantId(null);
    setVariantDraft(EMPTY_VARIANT);
  };

  const saveVariant = async (productId, currentVariantsCount) => {
    if (!variantDraft.name.trim() || variantDraft.price === "") {
      setError("اسم الحجم والسعر مطلوبين.");
      return;
    }
    setError("");

    if (editingVariantId) {
      const { error: err } = await supabase
        .from("product_variants")
        .update({
          name: variantDraft.name.trim(),
          price: Number(variantDraft.price),
          is_available: variantDraft.is_available,
        })
        .eq("id", editingVariantId);
      if (err) {
        setError(err.message);
        return;
      }
    } else {
      const { error: err } = await supabase.from("product_variants").insert({
        product_id: productId,
        name: variantDraft.name.trim(),
        price: Number(variantDraft.price),
        is_available: variantDraft.is_available,
        sort_order: currentVariantsCount,
      });
      if (err) {
        setError(err.message);
        return;
      }
    }

    cancelVariant();
    loadProducts();
  };

  const removeVariant = async (id) => {
    if (!confirm("متأكد إنك عايز تمسح الحجم ده؟")) return;
    const { error: err } = await supabase.from("product_variants").delete().eq("id", id);
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
        <div>
          <input
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            placeholder="السعر الأساسي (ج.م)"
            type="number"
            className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
          />
          <p className="text-[10.5px] text-[#B0A99C] mt-1">
            لو هتضيفي أحجام مختلفة بعد كده، السعر ده هيبقى بس احتياطي.
          </p>
        </div>
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

  const VariantForm = (
    <div className="flex flex-wrap items-center gap-2 bg-[#FFFBF6] border border-dashed border-[#EFE9E1] rounded-xl p-2.5">
      <input
        value={variantDraft.name}
        onChange={(e) => setVariantDraft((d) => ({ ...d, name: e.target.value }))}
        placeholder="اسم الحجم (صغير، كبير، 6 قطع...)"
        className="flex-1 min-w-[140px] h-9 rounded-lg border border-[#EFE9E1] px-2.5 text-[12.5px] outline-none focus:border-[#FF6B35]"
      />
      <input
        value={variantDraft.price}
        onChange={(e) => setVariantDraft((d) => ({ ...d, price: e.target.value }))}
        placeholder="السعر"
        type="number"
        className="w-24 h-9 rounded-lg border border-[#EFE9E1] px-2.5 text-[12.5px] outline-none focus:border-[#FF6B35]"
      />
      <label className="flex items-center gap-1 text-[11.5px] text-[#5C564C]">
        <input
          type="checkbox"
          checked={variantDraft.is_available}
          onChange={(e) => setVariantDraft((d) => ({ ...d, is_available: e.target.checked }))}
        />
        متاح
      </label>
      <div className="flex gap-1.5">
        <button
          onClick={() => saveVariant(expandedProductId, products.find((p) => p.id === expandedProductId)?.product_variants.length || 0)}
          className="h-9 px-3 rounded-lg bg-[#FF6B35] text-white text-[11.5px] font-bold font-[Cairo]"
        >
          حفظ
        </button>
        <button onClick={cancelVariant} className="h-9 px-3 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[11.5px] font-bold font-[Cairo]">
          إلغاء
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B] mb-4">المنتجات</h1>

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
                      <div key={p.id} className="bg-white border border-[#EFE9E1] rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-3.5">
                          <div className="min-w-0">
                            <p className="font-bold font-[Cairo] text-[13.5px] text-[#24201B] truncate">{p.name}</p>
                            <p className="text-[12px] text-[#8A8175] truncate">{p.description}</p>
                            <p className="text-[12.5px] font-bold font-[JetBrains_Mono] text-[#24201B] mt-0.5">
                              {p.product_variants?.length > 0
                                ? `من ${Math.min(...p.product_variants.map((v) => v.price)).toLocaleString("ar-EG")} ج.م`
                                : `${Number(p.price).toLocaleString("ar-EG")} ج.م`}
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

                        {/* زرار فتح/قفل قسم الأحجام */}
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="w-full flex items-center justify-between px-3.5 py-2 bg-[#FFFBF6] border-t border-[#EFE9E1] text-[11.5px] font-bold font-[Cairo] text-[#5C564C]"
                        >
                          <span className="flex items-center gap-1.5">
                            <Layers size={13} />
                            الأحجام / الأنواع ({p.product_variants?.length || 0})
                          </span>
                          <ChevronDown
                            size={14}
                            className={`transition ${expandedProductId === p.id ? "rotate-180" : ""}`}
                          />
                        </button>

                        {expandedProductId === p.id && (
                          <div className="px-3.5 pb-3.5 pt-1 space-y-1.5">
                            {p.product_variants?.map((v) =>
                              editingVariantId === v.id ? (
                                <div key={v.id}>{VariantForm}</div>
                              ) : (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between bg-[#FFFBF6] rounded-lg px-2.5 py-2"
                                >
                                  <span className="text-[12.5px] text-[#24201B]">
                                    {v.name} — <span className="font-bold font-[JetBrains_Mono]">{Number(v.price).toLocaleString("ar-EG")} ج.م</span>
                                    {!v.is_available && <span className="text-[#A32D2D] text-[11px] mr-1.5">(متوقف)</span>}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => startEditVariant(v)} className="text-[#8A8175] p-1" aria-label="تعديل الحجم">
                                      <Pencil size={13} />
                                    </button>
                                    <button onClick={() => removeVariant(v.id)} className="text-[#A32D2D] p-1" aria-label="حذف الحجم">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              )
                            )}

                            {addingVariant && expandedProductId === p.id ? (
                              VariantForm
                            ) : (
                              <button
                                onClick={() => startAddVariant(p.id)}
                                className="flex items-center gap-1.5 text-[12px] font-bold font-[Cairo] text-[#FF6B35] pt-1"
                              >
                                <Plus size={13} />
                                إضافة حجم/نوع
                              </button>
                            )}
                          </div>
                        )}
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
