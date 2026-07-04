"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronRight, Package, Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUS_STYLES = {
  Pending: { label: "قيد الانتظار", bg: "bg-[#FEF3E2]", text: "text-[#8A5A0A]", icon: Clock },
  Preparing: { label: "جاري التحضير", bg: "bg-[#E6F1FB]", text: "text-[#185FA5]", icon: Package },
  Delivered: { label: "تم التوصيل", bg: "bg-[#E9F5EE]", text: "text-[#166248]", icon: CheckCircle2 },
  Cancelled: { label: "ملغي", bg: "bg-[#FCEBEB]", text: "text-[#A32D2D]", icon: XCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      // نجيب الطلب مع الطلبات الفرعية والمنتجات في استعلام واحد
      // معتمدين على الـ foreign keys المعرّفة في الـ schema
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, total_amount, delivery_fee, payment_method, status, created_at,
          sub_orders (
            id, status,
            restaurants ( name ),
            order_items ( id, quantity, unit_price, products ( name ) )
          )
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (!error) setOrders(data || []);
      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-center py-20 text-[#8A8175]">جاري التحميل...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-[#24201B] font-semibold mb-4">
        <ChevronRight size={20} />
        <span className="font-[Cairo] text-[15px]">طلباتي</span>
      </button>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <Package size={36} className="mx-auto mb-3 text-[#D8CFC0]" strokeWidth={1.3} />
          <p className="text-[#8A8175] text-[13.5px]">لسه معملتش أي طلب.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = STATUS_STYLES[order.status] || STATUS_STYLES.Pending;
            const StatusIcon = status.icon;
            const expanded = expandedId === order.id;

            return (
              <div key={order.id} className="bg-white border border-[#EFE9E1] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="text-right">
                    <p className="font-bold font-[Cairo] text-[14px] text-[#24201B]">
                      طلب #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-[12px] text-[#8A8175]">
                      {new Date(order.created_at).toLocaleDateString("ar-EG", {
                        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold font-[Cairo] ${status.bg} ${status.text}`}>
                    <StatusIcon size={13} />
                    {status.label}
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-dashed border-[#EFE9E1] pt-3">
                    {order.sub_orders?.map((so) => (
                      <div key={so.id} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12.5px] font-bold font-[Cairo] text-[#5C564C]">
                            {so.restaurants?.name}
                          </p>
                          <span className="text-[11px] text-[#8A8175]">{so.status}</span>
                        </div>
                        {so.order_items?.map((oi) => (
                          <div key={oi.id} className="flex justify-between text-[12px] font-[JetBrains_Mono] text-[#8A8175]">
                            <span className="font-sans">{oi.products?.name} × {oi.quantity}</span>
                            <span>{(oi.unit_price * oi.quantity).toLocaleString("ar-EG")} ج.م</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex justify-between text-[13px] font-bold text-[#24201B] pt-2 border-t border-[#EFE9E1] font-[JetBrains_Mono]">
                      <span>الإجمالي</span>
                      <span>{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
