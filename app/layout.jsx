import { CartProvider } from "@/context/CartContext";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata = {
  title: "توصيل | Delivery App",
  description: "تطبيق توصيل الطعام",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800&family=Tajawal:wght@400;500;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Tajawal', sans-serif" }} className="bg-[#FFFBF6]">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
