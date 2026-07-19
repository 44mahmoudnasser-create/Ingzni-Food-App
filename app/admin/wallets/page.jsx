"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Wallet, Plus, Minus, ChevronDown, Loader2 } from "lucide-react";

export default function AdminWalletsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [transactions, setTransactions] = useState({});
  const [loadingTx, setLoadingTx] = useState(false);

  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("users")
      .select("id, name, phone_number, wallet_balance")
      .order("name");
    if (!err) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleExpand = async (userId) => {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);
    if (transactions[userId]) return;

    setLoadingTx(true);
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransactions((prev) => ({ ...prev, [userId]: data || [] }));
    setLoadingTx(false);
  };

  const startAdjust = (userId, direction) => {
    setAdjustingId(`${userId}:${direction}`);
    setAdjustAmount("");
    setAdjustNote("");
  };

  const submitAdjust = async (userId, direction) => {
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) {
      setError("اكتبي مبلغ صحيح أكبر من صفر.");
      return;
    }
    setError("");
    setSaving(true);

    const { error: err } = await supabase.from("wallet_transactions").insert({
      user_id: userId,
      amount: direction === "add" ? amount : -amount,
      type: "admin_adjustment",
      description: adjustNote.trim() || (direction === "add" ? "شحن يدوي من الإدارة" : "خصم يدوي من الإدارة"),
    });

    setSaving(false);

    if (err) {
      setError(err.message);
      return;
    }

    setAdjustingId(null);
    setTransactions((prev) => {
      const next = { ...prev };
      delete next[userId]; // نجبرها تتحمل تاني عشان تبقى محدثة
      return next;
    });
    load();
  };

  if (loading) return <p className="text-center py-20 text-[#8A8175]">جاري التحميل...</p>;

  return (
    <div>
      <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B] mb-4">محافظ العملاء</h1>

      {error && <p className="text-[#A32D2D] text-[13px] mb-3 bg-[#FCEBEB] rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-2.5">
        {users.map((u) => {
          const expanded = expandedId === u.id;
          return (
            <div key={u.id} className="bg-white border border-[#EFE9E1] rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleExpand(u.id)}
                className="w-full flex items-center justify-between p-3.5"
              >
                <div className="text-right">
                  <p className="font-bold font-[Cairo] text-[13.5px] text-[#24201B]">{u.name || "بدون اسم"}</p>
                  <p className="text-[12px] text-[#8A8175]">{u.phone_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[14px] font-bold font-[JetBrains_Mono] text-[#FF6B35]">
                    <Wallet size={14} />
                    {Number(u.wallet_balance).toLocaleString("ar-EG")} ج.م
                  </span>
                  <ChevronDown size={15} className={`text-[#8A8175] transition ${expanded ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expanded && (
                <div className="px-3.5 pb-3.5 border-t border-dashed border-[#EFE9E1] pt-3">
                  {/* أزرار الشحن/الخصم اليدوي */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => startAdjust(u.id, "add")}
                      className="flex-1 h-9 rounded-lg bg-[#E9F5EE] text-[#166248] text-[12px] font-bold font-[Cairo] flex items-center justify-center gap-1"
                    >
                      <Plus size={13} /> شحن رصيد
                    </button>
                    <button
                      onClick={() => startAdjust(u.id, "deduct")}
                      className="flex-1 h-9 rounded-lg bg-[#FCEBEB] text-[#A32D2D] text-[12px] font-bold font-[Cairo] flex items-center justify-center gap-1"
                    >
                      <Minus size={13} /> خصم رصيد
                    </button>
                  </div>

                  {(adjustingId === `${u.id}:add` || adjustingId === `${u.id}:deduct`) && (
                    <div className="bg-[#FFFBF6] border border-dashed border-[#EFE9E1] rounded-xl p-2.5 mb-3 space-y-2">
                      <input
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        type="number"
                        placeholder="المبلغ (ج.م)"
                        className="w-full h-9 rounded-lg border border-[#EFE9E1] px-2.5 text-[12.5px] outline-none focus:border-[#FF6B35]"
                      />
                      <input
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder="سبب الحركة (اختياري)"
                        className="w-full h-9 rounded-lg border border-[#EFE9E1] px-2.5 text-[12.5px] outline-none focus:border-[#FF6B35]"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => submitAdjust(u.id, adjustingId.endsWith("add") ? "add" : "deduct")}
                          disabled={saving}
                          className="flex-1 h-9 rounded-lg bg-[#FF6B35] text-white text-[12px] font-bold font-[Cairo] flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {saving && <Loader2 size={13} className="animate-spin" />}
                          تأكيد
                        </button>
                        <button
                          onClick={() => setAdjustingId(null)}
                          className="flex-1 h-9 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[12px] font-bold font-[Cairo]"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* سجل الحركات */}
                  <p className="text-[11.5px] font-bold font-[Cairo] text-[#5C564C] mb-1.5">آخر الحركات</p>
                  {loadingTx && !transactions[u.id] ? (
                    <p className="text-[12px] text-[#8A8175]">جاري التحميل...</p>
                  ) : !transactions[u.id]?.length ? (
                    <p className="text-[12px] text-[#8A8175]">مفيش حركات لسه.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {transactions[u.id].map((t) => {
                        const positive = Number(t.amount) >= 0;
                        return (
                          <div key={t.id} className="flex items-center justify-between text-[11.5px]">
                            <div>
                              <span className="text-[#24201B]">{t.description || t.type}</span>
                              <span className="text-[#B0A99C] mr-1.5">
                                {new Date(t.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                            <span className={`font-bold font-[JetBrains_Mono] ${positive ? "text-[#166248]" : "text-[#A32D2D]"}`}>
                              {positive ? "+" : ""}{Number(t.amount).toLocaleString("ar-EG")} ج.م
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
