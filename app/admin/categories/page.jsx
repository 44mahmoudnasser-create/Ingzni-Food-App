"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("restaurant_categories")
      .select("*")
      .order("sort_order");
    if (!err) setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startAdd = () => {
    setName("");
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (c) => {
    setName(c.name);
    setEditingId(c.id);
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setName("");
  };

  const save = async () => {
    if (!name.trim()) {
      setError("اسم التصنيف مطلوب.");
      return;
    }
    setError("");
    setSaving(true);

    if (editingId) {
      const { error: err } = await supabase
        .from("restaurant_categories")
        .update({ name: name.trim() })
        .eq("id", editingId);
      if (err) setError(err.message);
    } else {
      const nextOrder = categories.length
        ? Math.max(...categories.map((c) => c.sort_order || 0)) + 1
        : 1;
      const { error: err } = await supabase
        .from("restaurant_categories")
        .insert({ name: name.trim(), sort_order: nextOrder });
      if (err) setError(err.message);
    }

    setSaving(false);
    if (!error) {
      cancel();
      load();
    }
  };

  const remove = async (id) => {
    if (!confirm("متأكد إنك عايز تمسح التصنيف ده؟ المطاعم اللي عليه هتبقى من غير تصنيف.")) return;
    const { error: err } = await supabase.from("restaurant_categories").delete().eq("id", id);
    if (err) {
      alert("تعذر الحذف: " + err.message);
      return;
    }
    load();
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const a = categories[index];
    const b = categories[target];
    await Promise.all([
      supabase.from("restaurant_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("restaurant_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B]">التصنيفات</h1>
        {!adding && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo]"
          >
            <Plus size={15} />
            إضافة تصنيف
          </button>
        )}
      </div>

      <p className="text-[12.5px] text-[#8A8175] mb-4">
        التصنيفات دي هي اللي بتظهر كأزرار فلترة للعميل في الصفحة الرئيسية، وهي
        نفسها اللي تقدري تختاريها لأي مطعم من صفحة "المطاعم".
      </p>

      {error && <p className="text-[#A32D2D] text-[13px] mb-3 bg-[#FCEBEB] rounded-lg px-3 py-2">{error}</p>}

      {(adding || editingId) && (
        <div className="border-2 border-dashed border-[#EFE9E1] rounded-2xl p-4 mb-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم التصنيف (مثلاً: مشاوي)"
            className="flex-1 h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
            autoFocus
          />
          <button
            onClick={save}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo] disabled:opacity-60"
          >
            {saving ? "..." : "حفظ"}
          </button>
          <button onClick={cancel} className="h-10 px-4 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[13px] font-bold font-[Cairo]">
            إلغاء
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-[#8A8175] text-[14px]">جاري التحميل...</p>
      ) : categories.length === 0 ? (
        <div className="py-14 text-center">
          <Tag size={30} className="mx-auto mb-2 text-[#D8CFC0]" strokeWidth={1.3} />
          <p className="text-[#8A8175] text-[13.5px]">مفيش تصنيفات لسه.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between bg-white border border-[#EFE9E1] rounded-2xl p-3.5">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-[#B0A99C] disabled:opacity-30 text-[10px] leading-none">▲</button>
                  <button onClick={() => move(i, 1)} disabled={i === categories.length - 1} className="text-[#B0A99C] disabled:opacity-30 text-[10px] leading-none">▼</button>
                </div>
                <p className="font-bold font-[Cairo] text-[13.5px] text-[#24201B]">{c.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => startEdit(c)} className="text-[#8A8175] p-1.5" aria-label="تعديل">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(c.id)} className="text-[#A32D2D] p-1.5" aria-label="حذف">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
