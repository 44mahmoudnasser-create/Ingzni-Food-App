"use client";

import { supabase } from "@/lib/supabaseClient";

// بتحوّل مفتاح الـ VAPID العام من صيغة base64url (نص) لصيغة بايتات
// (Uint8Array) اللي الـ PushManager محتاجها
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * بتطلب إذن الإشعارات من المستخدم، تسجّل الـ Service Worker، تشترك في
 * الـ Push، وتحفظ بيانات الاشتراك في Supabase مربوطة بالمستخدم الحالي.
 *
 * @param {string} userId - id بتاع المستخدم المسجل دخول (auth.uid())
 */
export async function subscribeToPush(userId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("المتصفح ده مش بيدعم الإشعارات.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("لازم توافق على إذن الإشعارات عشان الميزة دي تشتغل.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw error;
  return subscription;
}

/**
 * بتلغي الاشتراك في الإشعارات (لو المستخدم عايز يوقفها)
 */
export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
}
