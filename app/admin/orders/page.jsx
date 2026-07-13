"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Package, Clock, CheckCircle2, XCircle, StickyNote, Navigation, ChevronDown } from "lucide-react";

const ORDER_STATUSES = ["Pending", "Preparing", "Delivered", "Cancelled"];
const STATUS_STYLES = {
  Pending: { label: "قيد الانتظار", bg: "bg-[#FEF3E2]", text: "text-[#8A5A0A]", icon: Clock },
  Preparing: { label: "جاري التحضير", bg: "bg-[#E6F1FB]", text: "text-[#185FA5]", icon: Package },
  Delivered: { label: "تم التوصيل", bg: "bg-[#E9F5EE]", text: "text-[#166248]", icon: CheckCircle2 },
  Cancelled: { label: "ملغي", bg: "bg-[#FCEBEB]", text: "text-[#A32D2D]", icon: XCircle },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, total_amount, delivery_fee, payment_method, status, created_at,
        notes, estimated_delivery_minutes, rating, rating_comment,
        route_distance_km, route_maps_url,
        users ( name, phone_number ),
        addresses ( title, detailed_address ),
        sub_orders (
          id, status,
          restaurants ( name ),
          order_items ( id, quantity, unit_price, notes, variant_name, products ( name ) )
        )
      `)
      .order("created_at", { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateOrderStatus = async (orderId, status) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", orderId);

    // نبلّغ العميل بإشعار push إن حالة الأوردر اتغيرت
    fetch("/api/notify-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    }).catch((err) => console.error("notify-status failed:", err));
  };

  const updateSubOrderStatus = async (orderId, subOrderId, status) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, sub_orders: o.sub_orders.map((so) => (so.id === subOrderId ? { ...so, status } : so)) }
          : o
      )
    );
    await supabase.from("sub_orders").update({ status }).eq("id", subOrderId);
  };

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  if (loading) return <p className="text-center py-20 text-[#8A8175]">جاري التحميل...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B]">الطلبات</h1>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {["all", ...ORDER_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-bold font-[Cairo] ${
                statusFilter === s ? "bg-[#24201B] text-white" : "bg-[#F4EFE6] text-[#5C564C]"
              }`}
            >
              {s === "all" ? "الكل" : STATUS_STYLES[s].label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-[#8A8175] text-[13.5px] text-center py-14">مفيش طلبات مطابقة.</p>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => {
            const status = STATUS_STYLES[order.status] || STATUS_STYLES.Pending;
            const StatusIcon = status.icon;
            const expanded = expandedId === order.id;

            return (
              <div key={order.id} className="bg-white border border-[#EFE9E1] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="text-right min-w-0">
                    <p className="font-bold font-[Cairo] text-[14px] text-[#24201B]">
                      #{order.id.slice(0, 8)} · {order.users?.name || "مستخدم"}
                    </p>
                    <p className="text-[12px] text-[#8A8175] truncate">
                      {order.users?.phone_number} ·{" "}
                      {new Date(order.created_at).toLocaleDateString("ar-EG", {
                        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold font-[Cairo] ${status.bg} ${status.text}`}>
                      <StatusIcon size={13} />
                      {status.label}
                    </span>
                    <ChevronDown size={16} className={`text-[#8A8175] transition ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-dashed border-[#EFE9E1] pt-3">
                    {/* تغيير حالة الأوردر بالكامل */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[12px] text-[#5C564C] font-bold font-[Cairo]">حالة الطلب:</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="h-8 rounded-lg border border-[#EFE9E1] px-2 text-[12px] font-bold font-[Cairo] outline-none focus:border-[#FF6B35]"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
                        ))}
                      </select>
                    </div>

                    {order.addresses && (
                      <p className="text-[12px] text-[#5C564C] mb-2">
                        <span className="font-bold">التوصيل لـ:</span> {order.addresses.title} — {order.addresses.detailed_address}
                      </p>
                    )}

                    {order.estimated_delivery_minutes && (
                      <p className="flex items-center gap-1.5 text-[12px] text-[#5C564C] mb-2.5">
                        <Clock size={13} className="text-[#FF6B35]" />
                        الوقت التقريبي:
                        <span className="font-bold font-[JetBrains_Mono] text-[#24201B]">
                          {order.estimated_delivery_minutes} دقيقة
                        </span>
                      </p>
                    )}

                    {order.sub_orders?.map((so) => (
                      <div key={so.id} className="mb-3 last:mb-0 bg-[#FFFBF6] rounded-xl p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[12.5px] font-bold font-[Cairo] text-[#5C564C]">
                            {so.restaurants?.name}
                          </p>
                          <select
                            value={so.status}
                            onChange={(e) => updateSubOrderStatus(order.id, so.id, e.target.value)}
                            className="h-7 rounded-lg border border-[#EFE9E1] px-2 text-[11px] font-bold font-[Cairo] outline-none focus:border-[#FF6B35]"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_STYLES[s].label}</option>
                            ))}
                          </select>
                        </div>
                        {so.order_items?.map((oi) => (
                          <div key={oi.id} className="mb-1">
                            <div className="flex justify-between text-[12px] font-[JetBrains_Mono] text-[#8A8175]">
                              <span className="font-sans">
                                {oi.products?.name}{oi.variant_name && ` — ${oi.variant_name}`} × {oi.quantity}
                              </span>
                              <span>{(oi.unit_price * oi.quantity).toLocaleString("ar-EG")} ج.م</span>
                            </div>
                            {oi.notes && (
                              <p className="text-[10.5px] text-[#8A5A0A] flex items-center gap-1">
                                <StickyNote size={9} /> {oi.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}

                    {order.notes && (
                      <p className="text-[12px] text-[#8A5A0A] bg-[#FEF3E2] rounded-lg px-3 py-2 flex items-start gap-1.5 mb-2 mt-2">
                        <StickyNote size={12} className="mt-0.5 shrink-0" />
                        {order.notes}
                      </p>
                    )}

                    <div className="flex justify-between text-[13px] font-bold text-[#24201B] pt-2 border-t border-[#EFE9E1] font-[JetBrains_Mono] mb-2 mt-2">
                      <span>الإجمالي</span>
                      <span>{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</span>
                    </div>

                    {order.rating && (
                      <p className="text-[12px] text-[#8A8175] mb-2">
                        تقييم العميل: <span className="font-bold text-[#F5A623]">{"★".repeat(order.rating)}</span>
                        {order.rating_comment && <span className="text-[#5C564C]"> — {order.rating_comment}</span>}
                      </p>
                    )}

                    {order.route_maps_url && (
                      <a
                        href={order.route_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#F4EFE6] text-[#24201B] text-[12px] font-bold font-[Cairo]"
                      >
                        <Navigation size={13} className="text-[#FF6B35]" />
                        افتح مسار التوصيل في خرائط جوجل
                        {order.route_distance_km && <span className="text-[#8A8175] font-normal">({order.route_distance_km} كم)</span>}
                      </a>
                    )}
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
