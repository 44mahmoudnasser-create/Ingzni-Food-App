"use client";

import { createContext, useContext, useEffect, useState } from "react";

/*
  شكل الكارت:
  {
    [restaurantId]: {
      restaurant: { id, name, delivery_fee_estimate, ... },
      items: {
        [productId]: { product: {...}, qty: number }
      }
    }
  }
  كل مفتاح restaurantId هو "طلب فرعي" (Sub Order) قائم بذاته.
  لما نيجي نأكد الطلب، هنلف على كل مفتاح وننشئ Sub_Order مستقل له.
*/

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});
  const [hydrated, setHydrated] = useState(false);

  // تحميل الكارت المحفوظ محليًا (لو المستخدم قفل المتصفح وفتحه تاني)
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

  const addItem = (product, restaurant, note = "") => {
    setCart((prev) => {
      const restaurantEntry = prev[restaurant.id] || { restaurant, items: {} };
      const existingQty = restaurantEntry.items[product.id]?.qty || 0;
      const existingNote = restaurantEntry.items[product.id]?.note || "";
      return {
        ...prev,
        [restaurant.id]: {
          restaurant,
          items: {
            ...restaurantEntry.items,
            [product.id]: { product, qty: existingQty + 1, note: note || existingNote },
          },
        },
      };
    });
  };

  const updateNote = (restaurantId, productId, note) => {
    setCart((prev) => {
      const entry = prev[restaurantId];
      if (!entry) return prev;
      const item = entry.items[productId];
      if (!item) return prev;
      return {
        ...prev,
        [restaurantId]: {
          ...entry,
          items: { ...entry.items, [productId]: { ...item, note } },
        },
      };
    });
  };

  const incItem = (restaurantId, productId) => {
    setCart((prev) => {
      const entry = prev[restaurantId];
      if (!entry) return prev;
      const item = entry.items[productId];
      return {
        ...prev,
        [restaurantId]: {
          ...entry,
          items: { ...entry.items, [productId]: { ...item, qty: item.qty + 1 } },
        },
      };
    });
  };

  const decItem = (restaurantId, productId) => {
    setCart((prev) => {
      const entry = prev[restaurantId];
      if (!entry) return prev;
      const item = entry.items[productId];
      const nextItems = { ...entry.items };

      if (item.qty <= 1) {
        delete nextItems[productId];
      } else {
        nextItems[productId] = { ...item, qty: item.qty - 1 };
      }

      // لو المطعم بقى مفيهوش أي منتجات، امسح الـ sub order كله
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

  // مصفوفة الطلبات الفرعية جاهزة للعرض أو للإرسال لقاعدة البيانات
  const subOrders = Object.values(cart).map((entry) => {
    const items = Object.values(entry.items);
    const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.qty, 0);
    return { restaurant: entry.restaurant, items, subtotal };
  });

  const itemsCount = subOrders.reduce(
    (s, so) => s + so.items.reduce((s2, i) => s2 + i.qty, 0),
    0
  );

  const subtotal = subOrders.reduce((s, so) => s + so.subtotal, 0);

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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart لازم يتستخدم جوه CartProvider");
  return ctx;
}
