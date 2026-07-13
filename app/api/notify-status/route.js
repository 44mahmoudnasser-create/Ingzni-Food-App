import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

webpush.setVapidDetails(
  "mailto:support@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// رسالة مناسبة لكل حالة (تقدري تعدّليها زي ما تحبي)
const STATUS_MESSAGES = {
  Pending: "طلبك قيد الانتظار، هيتم تجهيزه قريبًا.",
  Preparing: "جاري تحضير طلبك دلوقتي! 👨‍🍳",
  Delivered: "طلبك وصل! بالهنا والشفا 🎉",
  Cancelled: "للأسف تم إلغاء طلبك.",
};

// POST /api/notify-status
// body: { orderId: string, status: string }
export async function POST(request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId و status مطلوبين" }, { status: 400 });
    }

    // نجيب صاحب الأوردر باستخدام مفتاح الأدمن (بيتخطى RLS)
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "الأوردر مش موجود" }, { status: 404 });
    }

    const { data: subscriptions, error: subsErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", order.user_id);

    if (subsErr) {
      return NextResponse.json({ error: subsErr.message }, { status: 500 });
    }

    if (!subscriptions?.length) {
      // المستخدم مش مفعّل إشعارات، أو معندوش أي اشتراك متسجل — مفيش
      // حاجة نبعتها، بس ده مش خطأ
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({
      title: "توصيل",
      body: STATUS_MESSAGES[status] || `حالة طلبك اتغيرت إلى: ${status}`,
      url: "/orders",
    });

    let sent = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (err) {
          // 410/404 يعني الاشتراك بقى غير صالح (اتلغى الإذن أو اتمسح
          // التطبيق) — نمسحه من الداتابيز عشان منحاولش نبعتله تاني
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("push send failed:", err.message);
          }
        }
      })
    );

    return NextResponse.json({ sent });
  } catch (err) {
    console.error("notify-status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
