"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronRight, User, Phone, MapPin, Plus, Pencil, Trash2, LogOut, Check, X } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import NotificationToggle from "@/components/NotificationToggle";
   // ... جوه الصفحة، وانتي عندك userId already:
   <NotificationToggle userId={userId} />
export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone_number: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: "", phone_number: "" });

  const [addresses, setAddresses] = useState([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressDraft, setAddressDraft] = useState({
    title: "", detailed_address: "", is_default: false, latitude: null, longitude: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: userRow } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (userRow) {
        setProfile(userRow);
        setProfileDraft({ name: userRow.name, phone_number: userRow.phone_number });
      }

      const { data: addressRows } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("is_default", { ascending: false });

      setAddresses(addressRows || []);
      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------
  // تعديل بيانات البروفايل (الاسم ورقم الموبايل)
  // -------------------------------------------------
  const saveProfile = async () => {
    setError("");
    const { error: updateErr } = await supabase
      .from("users")
      .update({ name: profileDraft.name, phone_number: profileDraft.phone_number })
      .eq("id", userId);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setProfile(profileDraft);
    setEditingProfile(false);
  };

  // -------------------------------------------------
  // إضافة عنوان جديد
  // -------------------------------------------------
  const addAddress = async () => {
    if (!addressDraft.title.trim() || !addressDraft.detailed_address.trim()) return;

    const { data, error: insertErr } = await supabase
      .from("addresses")
      .insert({ ...addressDraft, user_id: userId })
      .select()
      .single();

    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setAddresses((prev) => [...prev, data]);
    setAddingAddress(false);
    setAddressDraft({ title: "", detailed_address: "", is_default: false, latitude: null, longitude: null });
  };

  // -------------------------------------------------
  // تعديل عنوان موجود
  // -------------------------------------------------
  const saveAddressEdit = async (id) => {
    const { error: updateErr } = await supabase
      .from("addresses")
      .update({
        title: addressDraft.title,
        detailed_address: addressDraft.detailed_address,
        is_default: addressDraft.is_default,
        latitude: addressDraft.latitude,
        longitude: addressDraft.longitude,
      })
      .eq("id", id);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...addressDraft } : a)));
    setEditingAddressId(null);
  };

  // -------------------------------------------------
  // حذف عنوان
  // -------------------------------------------------
  const deleteAddress = async (id) => {
    const { error: deleteErr } = await supabase.from("addresses").delete().eq("id", id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="text-center py-20 text-[#8A8175]">جاري التحميل...</p>;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-[#24201B] font-semibold">
          <ChevronRight size={20} />
          <span className="font-[Cairo] text-[15px]">الملف الشخصي</span>
        </button>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-[#A32D2D] text-[13px] font-semibold">
          <LogOut size={15} />
          تسجيل الخروج
        </button>
      </div>

      {error && <p className="mb-3 text-[13px] text-[#A32D2D] bg-[#FCEBEB] rounded-xl px-3 py-2">{error}</p>}

      {/* بيانات المستخدم */}
      <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B]">بياناتي</h3>
          {!editingProfile && (
            <button onClick={() => setEditingProfile(true)} className="text-[#FF6B35]" aria-label="تعديل البيانات">
              <Pencil size={15} />
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="space-y-2.5">
            <LabeledInput icon={User} value={profileDraft.name} onChange={(v) => setProfileDraft((p) => ({ ...p, name: v }))} placeholder="الاسم" />
            <LabeledInput icon={Phone} value={profileDraft.phone_number} onChange={(v) => setProfileDraft((p) => ({ ...p, phone_number: v }))} placeholder="رقم الموبايل" />
            <div className="flex gap-2 pt-1">
              <button onClick={saveProfile} className="flex-1 h-10 rounded-xl bg-[#FF6B35] text-white text-[13px] font-bold font-[Cairo]">حفظ</button>
              <button onClick={() => { setEditingProfile(false); setProfileDraft(profile); }} className="flex-1 h-10 rounded-xl bg-[#F4EFE6] text-[#5C564C] text-[13px] font-bold font-[Cairo]">إلغاء</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-[13.5px] text-[#24201B]">
            <p className="flex items-center gap-2"><User size={15} className="text-[#8A8175]" />{profile.name}</p>
            <p className="flex items-center gap-2"><Phone size={15} className="text-[#8A8175]" />{profile.phone_number}</p>
          </div>
        )}
      </section>

      {/* العناوين */}
      <section className="bg-white border border-[#EFE9E1] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-[Cairo] font-bold text-[14px] text-[#24201B]">عناويني</h3>
          <button
            onClick={() => { setAddingAddress(true); setAddressDraft({ title: "", detailed_address: "", is_default: false, latitude: null, longitude: null }); }}
            className="flex items-center gap-1 text-[#FF6B35] text-[12.5px] font-bold font-[Cairo]"
          >
            <Plus size={14} />
            إضافة عنوان
          </button>
        </div>

        <div className="space-y-2.5">
          {addresses.map((addr) =>
            editingAddressId === addr.id ? (
              <div key={addr.id} className="border border-[#EFE9E1] rounded-xl p-3 space-y-2">
                <input
                  value={addressDraft.title}
                  onChange={(e) => setAddressDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="اسم العنوان (المنزل، العمل...)"
                  className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
                />
                <textarea
                  value={addressDraft.detailed_address}
                  onChange={(e) => setAddressDraft((d) => ({ ...d, detailed_address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-[#EFE9E1] p-3 text-[13px] outline-none focus:border-[#FF6B35] resize-none"
                />
                <LocationPicker
                  lat={addressDraft.latitude}
                  lng={addressDraft.longitude}
                  onChange={(lat, lng) => setAddressDraft((d) => ({ ...d, latitude: lat, longitude: lng }))}
                />
                <div className="flex gap-2">
                  <button onClick={() => saveAddressEdit(addr.id)} className="flex-1 h-9 rounded-lg bg-[#FF6B35] text-white text-[12.5px] font-bold flex items-center justify-center gap-1">
                    <Check size={14} /> حفظ
                  </button>
                  <button onClick={() => setEditingAddressId(null)} className="flex-1 h-9 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[12.5px] font-bold flex items-center justify-center gap-1">
                    <X size={14} /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div key={addr.id} className="flex items-start justify-between border border-[#EFE9E1] rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-[#8A8175] mt-0.5" />
                  <div>
                    <p className="text-[13.5px] font-bold font-[Cairo] text-[#24201B]">
                      {addr.title} {addr.is_default && <span className="text-[10px] font-normal text-[#FF6B35]">(افتراضي)</span>}
                    </p>
                    <p className="text-[12px] text-[#8A8175]">{addr.detailed_address}</p>
                    <p className="text-[11px] text-[#B0A99C] mt-0.5">
                      {addr.latitude && addr.longitude ? "الموقع محدد على الخريطة" : "لم يتم تحديد الموقع بعد"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingAddressId(addr.id); setAddressDraft(addr); }}
                    className="text-[#8A8175]"
                    aria-label="تعديل العنوان"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteAddress(addr.id)} className="text-[#A32D2D]" aria-label="حذف العنوان">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}

          {addingAddress && (
            <div className="border-2 border-dashed border-[#EFE9E1] rounded-xl p-3 space-y-2">
              <input
                value={addressDraft.title}
                onChange={(e) => setAddressDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="اسم العنوان (المنزل، العمل...)"
                className="w-full h-10 rounded-lg border border-[#EFE9E1] px-3 text-[13px] outline-none focus:border-[#FF6B35]"
              />
              <textarea
                value={addressDraft.detailed_address}
                onChange={(e) => setAddressDraft((d) => ({ ...d, detailed_address: e.target.value }))}
                rows={2}
                placeholder="تفاصيل العنوان بالكامل"
                className="w-full rounded-lg border border-[#EFE9E1] p-3 text-[13px] outline-none focus:border-[#FF6B35] resize-none"
              />
              <LocationPicker
                lat={addressDraft.latitude}
                lng={addressDraft.longitude}
                onChange={(lat, lng) => setAddressDraft((d) => ({ ...d, latitude: lat, longitude: lng }))}
              />
              <div className="flex gap-2">
                <button onClick={addAddress} className="flex-1 h-9 rounded-lg bg-[#FF6B35] text-white text-[12.5px] font-bold">إضافة</button>
                <button onClick={() => setAddingAddress(false)} className="flex-1 h-9 rounded-lg bg-[#F4EFE6] text-[#5C564C] text-[12.5px] font-bold">إلغاء</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function LabeledInput({ icon: Icon, value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Icon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8175]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-lg bg-[#FFFBF6] border border-[#EFE9E1] pr-9 pl-3 text-[13px] outline-none focus:border-[#FF6B35]"
      />
    </div>
  );
}
