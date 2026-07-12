export default function manifest() {
  return {
    name: "توصيل | Delivery App",
    short_name: "توصيل",
    description: "تطبيق توصيل الطعام",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF6",
    theme_color: "#FF6B35",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
