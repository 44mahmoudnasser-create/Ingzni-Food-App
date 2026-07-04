"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { MapPin, Banknote, Wallet, Smartphone, Loader2, Plus } from "lucide-react";

const PAYMENT_METHODS = [
  { id: "cash", label: "كاش عند الاستلام", icon: Banknote },
  { id: "wallet", label: "محفظة إلكترونية", icon: Wallet },
  { id: "instapay", label: "انستاباي", icon: Smartphone },
];

// -------------------------------------------------------------
// حساب المسافة بين نقطتين (خط مستقيم) بصيغة Haversine بالكيلومتر
// -------------------------------------------------------------
function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// -------------------------------------------------------------
// رسوم التوصيل: رسوم أساسية + سعر لكل كيلومتر بين المطعم والعنوان.
// دي مسافة خط مستقيم تقريبية (مش مسافة الطريق الفعلية)، وده كافي
// كبداية. لو حبيت دقة أكبر لاحقًا (تحسب الزحمة والطرق الفعلية)،
// استبدل الدالة دي بنداء Google Distance Matrix API أو ما شابه،
// بنفس الـ inputs (lat/lng المطعم و lat/lng العنوان).
// -------------------------------------------------------------
const BASE_FEE = 10; // ج.م
const FEE_PER_KM = 2.5; // ج.م لكل كيلومتر

function estimateDeliveryFee(restaurant, address) {
  if (!restaurant || !address) return 0;

  const hasRestaurantLocation = restaurant.latitude && restaurant.longitude;
  const hasAddressLocation = address.latitude && address.longitude;

  // لو لسه مفيش إحداثيات (مطعم أو عنوان قديم من غير موقع)، رجّع رسوم ثابتة احتياطية
  if (!hasRestaurantLocation || !hasAddressLocation) return 20;

  const km = distanceKm(
    Number(restaurant.latitude), Number(restaurant.longitude),
    Number(address.latitude), Number(address.longitude)
  );

  return Math.round(BASE_FEE + km * FEE_PER_KM);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { subOrders, subtotal, clearCart } = useCart();

  const [userId, setUserId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [payment, setPayment] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (subOrders.length === 0) {
      router.replace("/");
      return;
    }

    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: addressData, error: addrErr } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("is_default", { ascending: false });

      if (!addrErr) {
        setAddresses(addressData || []);
        const defaultAddr = addressData?.find((a) => a.is_default) || addressData?.[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const deliveryFee = subOrders.reduce(
    (sum, so) => sum + estimateDeliveryFee(so.restaurant, selectedAddress),
    0
  );
  const total = subtotal + deliveryFee;

  // -------------------------------------------------------------
  // تأكيد الطلب: بيتسجل في 3 جداول مرتبطة ببعض
  // Orders -> Sub_Orders (واحد لكل مطعم) -> Order_Items (منتجات كل مطعم)
  // -------------------------------------------------------------
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError("اختار عنوان التوصيل الأول.");
      return;
    }
    setError("");
    setPlacing(true);

    // 1) إنشاء الطلب الرئيسي
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        address_id: selectedAddressId,
        total_amount: total,
        delivery_fee: deliveryFee,
        payment_method: payment,
        status: "Pending",
      })
      .select()
      .single();

    if (orderErr) {
      setError("حصل خطأ أثناء إنشاء الطلب: " + orderErr.message);
      setPlacing(false);
      return;
    }

    // 2) إنشاء طلب فرعي لكل مطعم + عناصره
    for (const so of subOrders) {
      const { data: subOrder, error: subErr } = await supabase
        .from("sub_orders")
        .insert({
          order_id: order.id,
          restaurant_id: so.restaurant.id,
          status: "Pending",
        })
        .select()
        .single();

      if (subErr) {
        setError("حصل خطأ أثناء إنشاء طلب فرعي: " + subErr.message);
        setPlacing(false);
        return;
      }

      const orderItemsPayload = so.items.map(({ product, qty }) => ({
        sub_order_id: subOrder.id,
        product_id: product.id,
        quantity: qty,
        unit_price: product.price,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItemsPayload);

      if (itemsErr) {
        setError("حصل خطأ أثناء إضافة عناصر الطلب: " + itemsErr.message);
        setPlacing(false);
        return;
      }
    }

    clearCart();
    setPlacing(false);
    router.push("/orders");
  };

  if (loading) return <p className="text-center py-20 text-[#8A8175]">جاري التحميل...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <h1 className="font-[Cairo] font-extrabold text-[18px] text-[#24201B] mb-5">إتمام الطلب</h1>

      {/* العنوان */}
      <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4 mb-4">
        <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] mb-3">عنوان التوصيل</h3>
        {addresses.length === 0 ? (
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#FF6B35]"
          >
            <Plus size={14} />
            مفيش عناوين محفوظة، أضف عنوان من صفحة البروفايل
          </button>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => setSelectedAddressId(addr.id)}
                className={`w-full text-right flex items-start gap-2.5 p-3 rounded-xl border transition ${
                  selectedAddressId === addr.id
                    ? "border-[#FF6B35] bg-[#FFF1EB]"
                    : "border-[#EFE9E1] bg-white"
                }`}
              >
                <MapPin size={16} className={selectedAddressId === addr.id ? "text-[#FF6B35]" : "text-[#8A8175]"} />
                <span>
                  <span className="block text-[13.5px] font-bold font-[Cairo] text-[#24201B]">{addr.title}</span>
                  <span className="block text-[12px] text-[#8A8175]">{addr.detailed_address}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* طريقة الدفع */}
      <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4 mb-4">
        <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] mb-3">طريقة الدفع</h3>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPayment(p.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl border transition ${
                payment === p.id ? "border-[#FF6B35] bg-[#FFF1EB]" : "border-[#EFE9E1] bg-white"
              }`}
            >
              <span className="flex items-center gap-2.5 text-[13.5px] font-semibold font-[Cairo] text-[#24201B]">
                <p.icon size={16} className={payment === p.id ? "text-[#FF6B35]" : "text-[#8A8175]"} />
                {p.label}
              </span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment === p.id ? "border-[#FF6B35]" : "border-[#D8CFC0]"}`}>
                {payment === p.id && <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B35]" />}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ملخص الطلب مقسم بالمطاعم */}
      <section className="bg-white border-2 border-dashed border-[#EFE9E1] rounded-2xl p-4">
        <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] mb-3">ملخص الطلب</h3>
        {subOrders.map((so) => (
          <div key={so.restaurant.id} className="mb-3 last:mb-0">
            <p className="text-[12.5px] font-bold font-[Cairo] text-[#5C564C] mb-1">{so.restaurant.name}</p>
            {so.items.map(({ product, qty }) => (
              <div key={product.id} className="flex justify-between text-[12.5px] font-[JetBrains_Mono] text-[#8A8175]">
                <span className="font-sans">{product.name} × {qty}</span>
                <span>{(product.price * qty).toLocaleString("ar-EG")} ج.م</span>
              </div>
            ))}
          </div>
        ))}
        <div className="space-y-1.5 pt-3 border-t border-dashed border-[#EFE9E1] font-[JetBrains_Mono] text-[13px]">
          <div className="flex justify-between text-[#5C564C]"><span>الإجمالي الفرعي</span><span>{subtotal.toLocaleString("ar-EG")} ج.م</span></div>
          <div className="flex justify-between text-[#5C564C]"><span>رسوم التوصيل</span><span>{deliveryFee.toLocaleString("ar-EG")} ج.م</span></div>
          <div className="flex justify-between text-[#24201B] font-bold text-[15px] pt-1.5 border-t border-[#EFE9E1]"><span>الإجمالي</span><span>{total.toLocaleString("ar-EG")} ج.م</span></div>
        </div>
      </section>

      {error && <p className="text-[#A32D2D] text-[13px] mt-4">{error}</p>}

      <div className="fixed bottom-4 inset-x-0 px-4">
        <button
          onClick={handlePlaceOrder}
          disabled={placing || !selectedAddressId}
          className="max-w-2xl mx-auto w-full h-[52px] rounded-2xl bg-[#FF6B35] disabled:opacity-60 text-white font-bold font-[Cairo] text-[15px] flex items-center justify-center gap-2 transition"
        >
          {placing && <Loader2 size={18} className="animate-spin" />}
          تأكيد الطلب · {total.toLocaleString("ar-EG")} ج.م
        </button>
      </div>
    </div>
  );
}
