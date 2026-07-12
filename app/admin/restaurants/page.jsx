"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LocationPicker from "@/components/LocationPicker";
import { Plus, Pencil, Trash2, Check, X, UtensilsCrossed } from "lucide-react";

const EMPTY_DRAFT = {
  name: "",
  category_id: "",
  address: "",
  image_url: "",
  latitude: null,
  longitude: null,
  is_active: true,
};

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [restaurantsRes, categoriesRes] = await Promise.all([
      supabase.from("restaurants").select("*").order("name"),
      supabase.from("restaurant_categories").select("*").order("sort_order"),
    ]);
    if (!restaurantsRes.error) setRestaurants(restaurantsRes.data || []);
    if (!categoriesRes.error) setCategories(categoriesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || "بدون تصنيف";

  const startAdd = () => {
    setDraft(EMPTY_DRAFT);
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (r) => {
    setDraft({
      name: r.name || "",
      category_id: r.category_id || "",
      address: r.address || "",
      image_url: r.image_url || "",
      latitude: r.latitude,
      longitude: r.longitude,
      is_active: r.is_active,
    });
    setEditingId(r.id);
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      setError("اسم المطعم مطلوب.");
      return;
    }
    setError("");
    setSaving(true);

    const payload = { ...draft, category_id: draft.category_id || null };

    if (editingId) {
      const { error: err } = await supabase
        .from("restaurants")
        .update(payload)
        .eq("id", editingId);
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase.from("restaurants").insert(payload);
      if (err) setError(err.message);
    }

    setSaving(false);
    if (!error) {
      cancel();
      load();
    }
  };

  const toggleActive = async (r) => {
    await supabase.from("restaurants").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  const remove = async (id) => {
    if (!confirm("متأكد إنك عايز تمسح المطعم ده؟ هيتمسح معاه كل منتجاته.")) return;
    const { error: err } = await supabase.from("restaurants").delete().eq("id", id);
    if (err) {
      alert("تعذر الحذف: " + err.message);
      return;
    }
    load();
  };

  const Form = (
    <div className="border-2 border-dashed border-[#EFE9E1] rounded-2xl p-4 mb-4 space-y-2.5">
      <input
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        placeholder="اسم المطعم"
        className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
      />
      <select
        value={draft.category_id}
        onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value }))}
        className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35] bg-white"
      >
        <option value="">بدون تصنيف</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {categories.length === 0 && (
        <p className="text-[11.5px] text-[#8A5A0A]">
          مفيش تصنيفات لسه — ضيفي واحد من صفحة "التصنيفات" الأول.
        </p>
      )}
      <textarea
        value={draft.address}
        onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
        placeholder="العنوان بالتفصيل"
        rows={2}
        className="w-full rounded-lg border border-[#EFE9E1] p-3 text-[13px] outline-none focus:border-[#FF6B35] resize-none"
      />
      <input
        value={draft.image_url}
        onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
        placeholder="رابط صورة المطعم (اختياري)"
        className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
      />
      <LocationPicker
        lat={draft.latitude}
        lng={draft.longitude}
        onChange={(lat, lng) => setDraft((d) => ({ ...d, latitude: lat, longitude: lng }))}
      />
      <label className="flex items-center gap-2 text-[13px] text-[#5C564C]">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
        />
        المطعم نشط (ظاهر للعملاء)
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
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B]">المطاعم</h1>
        {!adding && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo]"
          >
            <Plus size={15} />
            إضافة مطعم
          </button>
        )}
      </div>

      {error && <p className="text-[#A32D2D] text-[13px] mb-3 bg-[#FCEBEB] rounded-lg px-3 py-2">{error}</p>}

      {adding && Form}

      {loading ? (
        <p className="text-[#8A8175] text-[14px]">جاري التحميل...</p>
      ) : (
        <div className="space-y-2.5">
          {restaurants.map((r) =>
            editingId === r.id ? (
              <div key={r.id}>{Form}</div>
            ) : (
              <div
                key={r.id}
                className="flex items-center justify-between bg-white border border-[#EFE9E1] rounded-2xl p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#FFF1EB] flex items-center justify-center shrink-0 overflow-hidden">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed size={18} className="text-[#B23E12]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold font-[Cairo] text-[14px] text-[#24201B] truncate">{r.name}</p>
                    <p className="text-[12px] text-[#8A8175] truncate">{categoryName(r.category_id)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`px-2.5 h-7 rounded-full text-[11px] font-bold font-[Cairo] ${
                      r.is_active ? "bg-[#E9F5EE] text-[#166248]" : "bg-[#FCEBEB] text-[#A32D2D]"
                    }`}
                  >
                    {r.is_active ? "نشط" : "متوقف"}
                  </button>
                  <button onClick={() => startEdit(r)} className="text-[#8A8175] p-1.5" aria-label="تعديل">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(r.id)} className="text-[#A32D2D] p-1.5" aria-label="حذف">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          )}
          {restaurants.length === 0 && !adding && (
            <p className="text-[#8A8175] text-[13.5px] text-center py-10">مفيش مطاعم لسه.</p>
          )}
        </div>
      )}
    </div>
  );
}
