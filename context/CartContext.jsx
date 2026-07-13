"use client";

import { createContext, useContext, useEffect, useState } from "react";

/*
  شكل الكارت:
  {
    [restaurantId]: {
      restaurant: { id, name, ... },
      items: {
        [itemKey]: { product: {...}, variant: {...} | null, qty: number, note?: string }
      }
    }
  }
  itemKey = variant.id لو المنتج ليه حجم مختار، غير كده = product.id.
  ده بيخلي نفس المنتج بحجمين مختلفين (صغير/كبير) يتحسبوا كصفين منفصلين
  في السلة، بدل ما يتلخبطوا مع بعض.
*/

const CartContext = createContext(null);

function getItemKey(product, variant) {
  return variant?.id || product.id;
}

function getItemPrice(product, variant) {
  return Number(variant ? variant.price : product.price);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("تعذر قراءة الكارت المحفوظ", e);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, hydrated]);

  // variant: الحجم/النوع المختار (أو null لو المنتج بسيط بدون أحجام)
  const addItem = (product, restaurant, variant = null, note = "") => {
    const itemKey = getItemKey(product, variant);
    setCart((prev) => {
      const restaurantEntry = prev[restaurant.id] || { restaurant, items: {} };
      const existingQty = restaurantEntry.items[itemKey]?.qty || 0;
      const existingNote = restaurantEntry.items[itemKey]?.note || "";
      return {
        ...prev,
        [restaurant.id]: {
          restaurant,
          items: {
            ...restaurantEntry.items,
            [itemKey]: { product, variant, qty: existingQty + 1, note: note || existingNote },
          },
        },
      };
    });
  };

  const updateNote = (restaurantId, itemKey, note) => {
    setCart((prev) => {
      const entry = prev[restaurantId];
      if (!entry) return prev;
      const item = entry.items[itemKey];
      if (!item) return prev;
      return {
        ...prev,
        [restaurantId]: {
          ...entry,
          items: { ...entry.items, [itemKey]: { ...item, note } },
        },
      };
    });
  };

  const incItem = (restaurantId, itemKey) => {
    setCart((prev) => {
      const entry = prev[restaurantId];
      if (!entry) return prev;
      const item = entry.items[itemKey];
      return {
        ...prev,
        [restaurantId]: {
          ...entry,
          items: { ...entry.items, [itemKey]: { ...item, qty: item.qty + 1 } },
        },
      };
    });
  };

  const decItem = (restaurantId, itemKey) => {
    setCart((prev) => {
      const entry = prev[restaurantId];
      if (!entry) return prev;
      const item = entry.items[itemKey];
      const nextItems = { ...entry.items };

      if (item.qty <= 1) {
        delete nextItems[itemKey];
      } else {
        nextItems[itemKey] = { ...item, qty: item.qty - 1 };
      }

      if (Object.keys(nextItems).length === 0) {
        const next = { ...prev };
        delete next[restaurantId];
        return next;
      }

      return { ...prev, [restaurantId]: { ...entry, items: nextItems } };
    });
  };

  const removeSubOrder = (restaurantId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[restaurantId];
      return next;
    });
  };

  const clearCart = () => setCart({});

  // مصفوفة الطلبات الفرعية جاهزة للعرض أو للإرسال لقاعدة البيانات.
  // كل عنصر فيه itemKey (مفيد كـ key في React وللتعديل)، والسعر
  // بيتحسب من الـ variant لو موجود غير كده من المنتج نفسه
  const subOrders = Object.values(cart).map((entry) => {
    const items = Object.entries(entry.items).map(([itemKey, item]) => ({
      itemKey,
      ...item,
      unitPrice: getItemPrice(item.product, item.variant),
    }));
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    return { restaurant: entry.restaurant, items, subtotal };
  });

  const itemsCount = subOrders.reduce(
    (s, so) => s + so.items.reduce((s2, i) => s2 + i.qty, 0),
    0
  );

  const subtotal = subOrders.reduce((s, so) => s + so.subtotal, 0);

  // بيرجع الكمية الحالية لعنصر معين (منتج + حجم) في مطعم معين — مفيد
  // لعرض عداد +/- في مودال المنيو
  const getQty = (restaurantId, product, variant = null) => {
    const itemKey = getItemKey(product, variant);
    return cart[restaurantId]?.items[itemKey]?.qty || 0;
  };

  const value = {
    cart,
    subOrders,
    itemsCount,
    subtotal,
    addItem,
    incItem,
    decItem,
    updateNote,
    removeSubOrder,
    clearCart,
    getQty,
    getItemKey,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart لازم يتستخدم جوه CartProvider");
  return ctx;
}
