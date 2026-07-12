"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { UtensilsCrossed, Package, ClipboardList, Users } from "lucide-react";

export default function AdminDashboard() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [restaurants, products, orders, users] = await Promise.all([
        supabase.from("restaurants").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ]);

      setCounts({
        restaurants: restaurants.count || 0,
        products: products.count || 0,
        orders: orders.count || 0,
        users: users.count || 0,
      });
    };
    load();
  }, []);

  const CARDS = [
    { key: "restaurants", label: "المطاعم", icon: UtensilsCrossed, href: "/admin/restaurants" },
    { key: "products", label: "المنتجات", icon: Package, href: "/admin/products" },
    { key: "orders", label: "الطلبات", icon: ClipboardList, href: "/admin/orders" },
    { key: "users", label: "المستخدمين", icon: Users, href: "/admin/users" },
  ];

  return (
    <div>
      <h1 className="font-[Cairo] font-extrabold text-[19px] text-[#24201B] mb-5">نظرة عامة</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="bg-white border border-[#EFE9E1] rounded-2xl p-4 hover:border-[#E3D9CB] transition"
          >
            <c.icon size={20} className="text-[#FF6B35] mb-2" />
            <p className="text-[22px] font-bold font-[JetBrains_Mono] text-[#24201B]">
              {counts ? counts[c.key] : "…"}
            </p>
            <p className="text-[12.5px] text-[#8A8175]">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
