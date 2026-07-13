"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/pushClient";

/*
  حطي الكومبوننت ده في صفحة البروفايل (أو أي مكان تاني) وابعتيله userId:

    import NotificationToggle from "@/components/NotificationToggle";
    ...
    <NotificationToggle userId={userId} />
*/
export default function NotificationToggle({ userId }) {
  const [status, setStatus] = useState("checking"); // checking | granted | denied | default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setStatus(Notification.permission); // "granted" | "denied" | "default"
    } else {
      setStatus("unsupported");
    }
  }, []);

  const enable = async () => {
    setError("");
    setLoading(true);
    try {
      await subscribeToPush(userId);
      setStatus("granted");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const disable = async () => {
    setLoading(true);
    await unsubscribeFromPush();
    setLoading(false);
    setStatus("default");
  };

  if (status === "unsupported") return null;

  return (
    <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4 mb-4">
      <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B] mb-2 flex items-center gap-1.5">
        <Bell size={15} className="text-[#8A8175]" />
        إشعارات الطلبات
      </h3>
      <p className="text-[12.5px] text-[#8A8175] mb-3">
        فعّليها عشان توصلك رسالة فورية كل ما حالة طلبك تتغيّر (جاري التحضير،
        تم التوصيل...).
      </p>

      {error && <p className="text-[#A32D2D] text-[12.5px] mb-2">{error}</p>}

      {status === "granted" ? (
        <button
          onClick={disable}
          disabled={loading}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#F4EFE6] text-[#5C564C] text-[13px] font-bold font-[Cairo] disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <BellOff size={15} />}
          إيقاف الإشعارات
        </button>
      ) : status === "denied" ? (
        <p className="text-[12.5px] text-[#A32D2D]">
          الإشعارات متمنوعة من إعدادات المتصفح. فعّليها يدويًا من إعدادات
          الموقع في المتصفح عشان تقدري تستخدمي الميزة دي.
        </p>
      ) : (
        <button
          onClick={enable}
          disabled={loading}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo] disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
          تفعيل الإشعارات
        </button>
      )}
    </section>
  );
}
