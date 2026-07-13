// Service Worker بتاع تطبيق "توصيل" — مسؤول عن استقبال إشعارات الـ Push
// وعرضها حتى لو التطبيق مقفول، والتعامل مع الدوس عليها.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "توصيل", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "توصيل";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    data: { url: data.url || "/orders" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// لما المستخدم يدوس على الإشعار: يفتح التطبيق (أو يركّز عليه لو مفتوح
// أصلاً) على صفحة الطلبات
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/orders";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
