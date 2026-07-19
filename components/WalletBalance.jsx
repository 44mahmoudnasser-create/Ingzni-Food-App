"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Wallet, ChevronDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const TYPE_LABELS = {
  topup: "شحن رصيد",
  refund_change: "فرق مسترجع",
  order_payment: "دفع طلب",
  admin_adjustment: "تعديل من الإدارة",
};

/*
  حطي الكومبوننت ده في صفحة البروفايل وابعتيله userId:

    import WalletBalance from "@/components/WalletBalance";
    ...
    <WalletBalance userId={userId} />
*/
export default function WalletBalance({ userId }) {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const loadBalance = async () => {
      const { data } = await supabase
        .from("users")
        .select("wallet_balance")
        .eq("id", userId)
        .single();
      setBalance(data?.wallet_balance ?? 0);
    };
    loadBalance();
  }, [userId]);

  const loadHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (transactions.length > 0) return;

    setLoadingHistory(true);
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransactions(data || []);
    setLoadingHistory(false);
  };

  if (balance === null) return null;

  return (
    <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] flex items-center gap-1.5">
          <Wallet size={15} className="text-[#8A8175]" />
          محفظتي
        </h3>
        <p className="text-[18px] font-bold font-[JetBrains_Mono] text-[#FF6B35]">
          {Number(balance).toLocaleString("ar-EG")} ج.م
        </p>
      </div>

      <button
        onClick={loadHistory}
        className="flex items-center gap-1 text-[12px] font-semibold text-[#8A8175] mt-2"
      >
        سجل الحركات
        <ChevronDown size={13} className={`transition ${showHistory ? "rotate-180" : ""}`} />
      </button>

      {showHistory && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#EFE9E1] space-y-2">
          {loadingHistory ? (
            <p className="text-[12px] text-[#8A8175]">جاري التحميل...</p>
          ) : transactions.length === 0 ? (
            <p className="text-[12px] text-[#8A8175]">مفيش حركات على المحفظة لسه.</p>
          ) : (
            transactions.map((t) => {
              const positive = Number(t.amount) >= 0;
              return (
                <div key={t.id} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5">
                    {positive ? (
                      <ArrowUpCircle size={14} className="text-[#166248]" />
                    ) : (
                      <ArrowDownCircle size={14} className="text-[#A32D2D]" />
                    )}
                    <div>
                      <p className="text-[#24201B]">{TYPE_LABELS[t.type] || t.type}</p>
                      {t.description && <p className="text-[#B0A99C] text-[11px]">{t.description}</p>}
                    </div>
                  </div>
                  <span className={`font-bold font-[JetBrains_Mono] ${positive ? "text-[#166248]" : "text-[#A32D2D]"}`}>
                    {positive ? "+" : ""}{Number(t.amount).toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
