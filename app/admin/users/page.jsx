"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Phone, ShieldCheck } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("users")
      .select("*")
      .order("name");
    if (!err) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (u) => {
    setError("");
    const { error: err } = await supabase
      .from("users")
      .update({ is_admin: !u.is_admin })
      .eq("id", u.id);

    if (err) {
      setError("تعذر التعديل: " + err.message);
      return;
    }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !u.is_admin } : x)));
  };

  if (loading) return <p className="text-center py-20 text-[#8A8175]">جاري التحميل...</p>;

  return (
    <div>
      <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B] mb-4">المستخدمين</h1>

      {error && <p className="text-[#A32D2D] text-[13px] mb-3 bg-[#FCEBEB] rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-2.5">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between bg-white border border-[#EFE9E1] rounded-2xl p-3.5">
            <div className="min-w-0">
              <p className="font-bold font-[Cairo] text-[13.5px] text-[#24201B] flex items-center gap-1.5">
                <User size={14} className="text-[#8A8175]" />
                {u.name || "بدون اسم"}
                {u.is_admin && (
                  <span className="flex items-center gap-1 text-[10px] text-[#FF6B35] bg-[#FFF1EB] px-2 py-0.5 rounded-full font-bold">
                    <ShieldCheck size={11} /> أدمن
                  </span>
                )}
              </p>
              <p className="text-[12px] text-[#8A8175] flex items-center gap-1.5 mt-0.5">
                <Phone size={12} />
                {u.phone_number || "—"}
              </p>
            </div>
            <button
              onClick={() => toggleAdmin(u)}
              className={`shrink-0 px-3 h-8 rounded-full text-[11.5px] font-bold font-[Cairo] ${
                u.is_admin ? "bg-[#FCEBEB] text-[#A32D2D]" : "bg-[#F4EFE6] text-[#5C564C]"
              }`}
            >
              {u.is_admin ? "شيل صلاحية الأدمن" : "خليه أدمن"}
            </button>
          </div>
        ))}
        {users.length === 0 && <p className="text-[#8A8175] text-[13.5px] text-center py-10">مفيش مستخدمين لسه.</p>}
      </div>
    </div>
  );
}
