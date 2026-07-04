"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";

const CAIRO_CENTER = { lat: 30.0444, lng: 31.2357 };

/*
  مكوّن اختيار موقع على خريطة (Leaflet + OpenStreetMap، مجاني بدون API key).
  props:
    lat, lng   -> الإحداثيات الحالية (لو موجودة)
    onChange   -> بترجع (lat, lng) لما المستخدم يدوس على الخريطة أو يسحب الدبوس
*/
export default function LocationPicker({ lat, lng, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let map;

    import("leaflet").then((L) => {
      // إصلاح مشكلة شائعة في Leaflet مع Webpack/Next.js: أيقونة الدبوس الافتراضية
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const startLat = lat || CAIRO_CENTER.lat;
      const startLng = lng || CAIRO_CENTER.lng;

      map = L.map(containerRef.current).setView([startLat, startLng], 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChange(e.latlng.lat, e.latlng.lng);
      });

      setReady(true);
    });

    return () => {
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        onChange(latitude, longitude);
      },
      () => alert("تعذر الوصول لموقعك، تأكد إنك مفعّل صلاحية الموقع في المتصفح.")
    );
  };

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height: 220 }}
        className="rounded-xl border border-[#EFE9E1] mb-2 overflow-hidden bg-[#F4EFE6]"
      />
      <button
        type="button"
        onClick={useCurrentLocation}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#FF6B35]"
      >
        <LocateFixed size={14} />
        استخدام موقعي الحالي
      </button>
      {!ready && <p className="text-[11px] text-[#B0A99C] mt-1">جاري تحميل الخريطة...</p>}
    </div>
  );
}
