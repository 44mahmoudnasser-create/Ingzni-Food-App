"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { buildGoogleMapsDirectionsUrl } from "@/lib/googleMaps";
import { MapPin, Banknote, Wallet, Smartphone, Loader2, Plus, Clock, StickyNote, Navigation } from "lucide-react";

const PAYMENT_METHODS = [
  { id: "cash", label: "كاش عند الاستلام", icon: Banknote },
  { id: "wallet", label: "محفظة إلكترونية", icon: Wallet },
  { id: "instapay", label: "انستاباي", icon: Smartphone },
];

const BASE_FEE = 10; // ج.م
const FEE_PER_KM = 2.5; // ج.م لكل كيلومتر
const PREP_TIME_MIN = 15; // وقت تجهيز تقريبي في المطعم (دقايق)
const FALLBACK_FEE = 20; // ج.م لو مفيش إحداثيات أو الـ API فشل
const FALLBACK_MINUTES = 35; // دقيقة احتياطية لو مفيش إحداثيات أو الـ API فشل

// -------------------------------------------------------------
// Fallback: خط مستقيم (Haversine) — بيتستخدم بس لو مسار جوجل فشل
// أو لو لسه فيه مطعم/عنوان من غير إحداثيات
// -------------------------------------------------------------
function distanceKmHaversine(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function fallbackDeliveryFee(subOrders, address) {
  return subOrders.reduce((sum, so) => {
    const r = so.restaurant;
    const hasR = r.latitude && r.longitude;
    const hasA = address?.latitude && address?.longitude;
    if (!hasR || !hasA) return sum + FALLBACK_FEE;
    const km = distanceKmHaversine(
      Number(r.latitude), Number(r.longitude),
      Number(address.latitude), Number(address.longitude)
    );
    return sum + Math.round(BASE_FEE + km * FEE_PER_KM);
  }, 0);
}

function fallbackDeliveryMinutes(subOrders, address) {
  if (!subOrders.length) return null;
  const AVG_SPEED_KMH = 25;
  const minutesPerRestaurant = subOrders.map((so) => {
    const r = so.restaurant;
    const hasR = r.latitude && r.longitude;
    const hasA = address?.latitude && address?.longitude;
    if (!hasR || !hasA) return FALLBACK_MINUTES;
    const km = distanceKmHaversine(
      Number(r.latitude), Number(r.longitude),
      Number(address.latitude), Number(address.longitude)
    );
    return Math.round(PREP_TIME_MIN + (km / AVG_SPEED_KMH) * 60);
  });
  return Math.max(...minutesPerRestaurant);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { subOrders, subtotal, clearCart } = useCart();

  const [userId, setUserId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [payment, setPayment] = useState("cash");
  const [orderNote, setOrderNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  // نتيجة مسار جوجل الحقيقي (المسافة والوقت مع ترتيب أفضل للمطاعم)
  const [route, setRoute] = useState(null); // { distanceKm, durationMins, restaurantOrder }
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (subOrders.length === 0) {
      router.replace("/");
      return;
    }

    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login?redirect=/checkout");
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

  // إحداثيات المطاعم (لو كل المطاعم في الأوردر عندها إحداثيات)
  const restaurantsCoords = subOrders
    .map((so) => so.restaurant)
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({ lat: Number(r.latitude), lng: Number(r.longitude) }));

  const hasAllCoords =
    restaurantsCoords.length === subOrders.length &&
    selectedAddress?.latitude &&
    selectedAddress?.longitude;

  // لينك جاهز يفتح خرائط جوجل برحلة واحدة: كل المطاعم بالترتيب الأمثل
  // ثم العميل. لو عندنا ترتيب أمثل من Google Directions
  // (route.restaurantOrder — شامل اختيار أفضل مطعم يبدأ منه المندوب)
  // بنستخدمه، غير كده اللينك بيمشي بالترتيب اللي المطاعم مضافة بيه
  // في السلة.
  const mapsUrl = hasAllCoords
    ? buildGoogleMapsDirectionsUrl(
        restaurantsCoords,
        { lat: Number(selectedAddress.latitude), lng: Number(selectedAddress.longitude) },
        route?.restaurantOrder
      )
    : null;

  // -------------------------------------------------------------
  // كل ما يتغير العنوان المختار، نطلب مسار التوصيل الحقيقي من جوجل
  // عن طريق الـ API route بتاعنا (/api/delivery-route)، مش من المتصفح
  // مباشرة، عشان مشكلة CORS ومفتاح الـ API السري.
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedAddress || subOrders.length === 0) {
      setRoute(null);
      return;
    }

    const restaurantsCoords = subOrders
      .map((so) => so.restaurant)
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({ lat: Number(r.latitude), lng: Number(r.longitude) }));

    // لو مطعم أو أكتر لسه من غير إحداثيات، منقدرش نحسب مسار حقيقي
    if (
      restaurantsCoords.length !== subOrders.length ||
      !selectedAddress.latitude ||
      !selectedAddress.longitude
    ) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    setLoadingRoute(true);

    fetch("/api/delivery-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurants: restaurantsCoords,
        customer: {
          lat: Number(selectedAddress.latitude),
          lng: Number(selectedAddress.longitude),
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          console.error("delivery-route:", data.error);
          setRoute(null);
        } else {
          setRoute(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("delivery-route fetch failed:", err);
          setRoute(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, subOrders.length]);

  // رسوم التوصيل: لو عندنا مسار حقيقي من جوجل بنستخدمه، غير كده بنرجع
  // لطريقة الخط المستقيم (fallback)
  const deliveryFee = route
    ? Math.round(BASE_FEE + Number(route.distanceKm) * FEE_PER_KM)
    : fallbackDeliveryFee(subOrders, selectedAddress);

  const total = subtotal + deliveryFee;

  // الوقت التقريبي للتوصيل: وقت التجهيز + وقت الانتقال الحقيقي من جوجل
  // (أو الـ fallback التقريبي لو المسار الحقيقي مش متاح)
  const estimatedMinutes = route
    ? PREP_TIME_MIN + route.durationMins
    : fallbackDeliveryMinutes(subOrders, selectedAddress);

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
        notes: orderNote.trim() || null,
        estimated_delivery_minutes: estimatedMinutes,
        // بيانات المسار الفعلي من جوجل (لو اتحسب)، عشان نحتفظ بيه مع
        // الأوردر ونقدر نعرضه بعدين (مسافة، خط المسار، ترتيب المطاعم)
        route_distance_km: route ? Number(route.distanceKm) : null,
        route_polyline: route?.overviewPolyline || null,
        route_waypoint_order: route?.restaurantOrder || null,
        route_legs: route?.legs || null,
        route_maps_url: mapsUrl,
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

      const orderItemsPayload = so.items.map(({ product, variant, qty, note, unitPrice }) => ({
        sub_order_id: subOrder.id,
        product_id: product.id,
        variant_id: variant?.id || null,
        variant_name: variant?.name || null,
        quantity: qty,
        unit_price: unitPrice,
        notes: note?.trim() || null,
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
      <section className="bg-white border-2 border-dashed border-[#EFE9E1] rounded-2xl p-4 mb-4">
        <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] mb-3">ملخص الطلب</h3>
        {subOrders.map((so) => (
          <div key={so.restaurant.id} className="mb-3 last:mb-0">
            <p className="text-[12.5px] font-bold font-[Cairo] text-[#5C564C] mb-1">{so.restaurant.name}</p>
            {so.items.map(({ itemKey, product, variant, qty, note, unitPrice }) => (
              <div key={itemKey} className="mb-1">
                <div className="flex justify-between text-[12.5px] font-[JetBrains_Mono] text-[#8A8175]">
                  <span className="font-sans">
                    {product.name}{variant && ` — ${variant.name}`} × {qty}
                  </span>
                  <span>{(unitPrice * qty).toLocaleString("ar-EG")} ج.م</span>
                </div>
                {note && (
                  <p className="text-[11px] text-[#8A5A0A] flex items-center gap-1">
                    <StickyNote size={10} /> {note}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
        <div className="space-y-1.5 pt-3 border-t border-dashed border-[#EFE9E1] font-[JetBrains_Mono] text-[13px]">
          <div className="flex justify-between text-[#5C564C]"><span>الإجمالي الفرعي</span><span>{subtotal.toLocaleString("ar-EG")} ج.م</span></div>
          <div className="flex justify-between text-[#5C564C]">
            <span>
              رسوم التوصيل
              {loadingRoute && <span className="text-[11px] text-[#B0A99C]"> (جاري حساب المسار...)</span>}
            </span>
            <span>{deliveryFee.toLocaleString("ar-EG")} ج.م</span>
          </div>
          {route && (
            <div className="flex justify-between text-[11px] text-[#B0A99C]">
              <span>مسافة التوصيل الفعلية</span>
              <span>{route.distanceKm} كم</span>
            </div>
          )}
          <div className="flex justify-between text-[#24201B] font-bold text-[15px] pt-1.5 border-t border-[#EFE9E1]"><span>الإجمالي</span><span>{total.toLocaleString("ar-EG")} ج.م</span></div>
        </div>
        {estimatedMinutes && (
          <div className="flex items-center gap-1.5 text-[12.5px] text-[#5C564C] mt-3 pt-3 border-t border-dashed border-[#EFE9E1]">
            <Clock size={14} className="text-[#FF6B35]" />
            الوقت التقريبي للتوصيل: <span className="font-bold font-[JetBrains_Mono] text-[#24201B]">{estimatedMinutes} دقيقة</span>
          </div>
        )}

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 mt-3 h-10 rounded-xl bg-[#F4EFE6] text-[#24201B] text-[12.5px] font-bold font-[Cairo]"
          >
            <Navigation size={14} className="text-[#FF6B35]" />
            افتح مسار التوصيل في خرائط جوجل
          </a>
        )}
      </section>

      {/* ملاحظة عامة على الطلب */}
      <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4 mb-4">
        <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] mb-3 flex items-center gap-1.5">
          <StickyNote size={15} className="text-[#8A8175]" />
          ملاحظة عامة على الطلب (اختياري)
        </h3>
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          rows={2}
          placeholder="مثلاً: اتصل بيا قبل ما توصل، أو اسيب الطلب عند البواب..."
          className="w-full rounded-xl bg-[#FFFBF6] border border-[#EFE9E1] p-3 text-[13px] text-[#24201B] placeholder:text-[#B0A99C] outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-[#FF6B35]/10 resize-none transition"
        />
      </section>

      {error && <p className="text-[#A32D2D] text-[13px] mt-4">{error}</p>}

      <div className="fixed bottom-20 inset-x-0 px-4">
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
