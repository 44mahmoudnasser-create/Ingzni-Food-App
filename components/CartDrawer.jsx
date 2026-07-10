"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { X, ShoppingBag, Trash2, Plus, Minus, Pencil, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function CartDrawer() {
  const router = useRouter();
  const {
    isCartOpen, closeCart, subOrders, incItem, decItem,
    removeSubOrder, updateNote, subtotal,
  } = useCart();

  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  const startEditNote = (restaurantId, product, note) => {
    setEditingNoteFor(`${restaurantId}:${product.id}`);
    setNoteDraft(note || "");
  };

  const saveNote = (restaurantId, productId) => {
    updateNote(restaurantId, productId, noteDraft.trim());
    setEditingNoteFor(null);
  };

  const deliveryFee = subOrders.length ? 25 : 0; // رقم تقريبي للعرض بس هنا، الحساب الفعلي في صفحة الـ checkout
  const total = subtotal + deliveryFee;

  const handleCheckout = async () => {
    const { data } = await supabase.auth.getUser();
    closeCart();
    if (!data.user) {
      router.push("/login");
      return;
    }
    router.push("/checkout");
  };

  return (
    <>
      {isCartOpen && (
  <div
    onClick={closeCart}
    data-cart-backdrop="true"
    className="fixed inset-0 bg-[#24201B]/40 z-40"
  />
)}
      <div
        className={`fixed z-50 bg-white flex flex-col
        inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl
        sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-0 sm:w-[420px] sm:max-h-none sm:rounded-none sm:rounded-l-3xl
        transition-transform duration-300 ease-out
        ${isCartOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-[Cairo] font-extrabold text-[17px] text-[#24201B]">سلة الطلبات</h2>
          <button onClick={closeCart} className="w-8 h-8 rounded-full bg-[#F4EFE6] flex items-center justify-center" aria-label="إغلاق السلة">
            <X size={16} className="text-[#5C564C]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {subOrders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag size={36} className="mx-auto mb-3 text-[#D8CFC0]" strokeWidth={1.3} />
              <p className="text-[#8A8175] text-[13.5px]">السلة فارغة، أضف وجبات لتظهر هنا.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subOrders.map((so) => (
                <div key={so.restaurant.id} className="border-2 border-dashed border-[#EFE9E1] rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold font-[Cairo] text-[13.5px] text-[#24201B]">{so.restaurant.name}</p>
                    <button onClick={() => removeSubOrder(so.restaurant.id)} aria-label="حذف طلب هذا المطعم">
                      <Trash2 size={14} className="text-[#B0A99C]" />
                    </button>
                  </div>
                  {so.items.map(({ product, qty, note }) => {
                    const editKey = `${so.restaurant.id}:${product.id}`;
                    const isEditing = editingNoteFor === editKey;
                    return (
                      <div key={product.id} className="py-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] text-[#5C564C]">{product.name}</p>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => startEditNote(so.restaurant.id, product, note)} className="text-[#B0A99C]" aria-label="ملاحظة على الصنف">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => incItem(so.restaurant.id, product.id)} className="w-7 h-7 rounded-full bg-[#F4EFE6] flex items-center justify-center">
                              <Plus size={12} strokeWidth={3} />
                            </button>
                            <span className="text-[12.5px] font-bold font-[JetBrains_Mono] min-w-[14px] text-center">{qty}</span>
                            <button onClick={() => decItem(so.restaurant.id, product.id)} className="w-7 h-7 rounded-full bg-[#F4EFE6] flex items-center justify-center">
                              <Minus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                        {note && !isEditing && <p className="text-[10.5px] text-[#8A5A0A] mt-0.5">ملاحظة: {note}</p>}
                        {isEditing && (
                          <div className="mt-1.5 flex gap-1.5">
                            <input
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="ملاحظة على الصنف..."
                              className="flex-1 h-8 rounded-lg border border-[#EFE9E1] px-2 text-[11.5px] outline-none focus:border-[#FF6B35]"
                            />
                            <button onClick={() => saveNote(so.restaurant.id, product.id)} className="px-2.5 h-8 rounded-lg bg-[#FF6B35] text-white text-[11px] font-bold">حفظ</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="text-left text-[12px] font-bold font-[JetBrains_Mono] text-[#24201B] mt-1.5 pt-1.5 border-t border-[#EFE9E1]">
                    {so.subtotal.toLocaleString("ar-EG")} ج.م
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {subOrders.length > 0 && (
          <div className="px-5 pb-6 pt-3 border-t border-dashed border-[#EFE9E1]">
            <div className="flex justify-between text-[#24201B] font-bold text-[15px] mb-4">
              <span>الإجمالي الفرعي</span><span className="font-[JetBrains_Mono]">{subtotal.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full h-[52px] rounded-2xl bg-[#FF6B35] hover:bg-[#E8551F] text-white font-bold font-[Cairo] text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              متابعة الطلب
              <ArrowRight size={17} className="rotate-180" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
