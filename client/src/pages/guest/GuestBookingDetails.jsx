import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import bookingService from "../../services/booking.service";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const dateTime = (value) => new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function GuestBookingDetails() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const response = await bookingService.getMyBookingDetails(id); if (active) setBooking(response.data); }
      catch (requestError) { if (active) setError(requestError.response?.data?.message || "Booking details load nahi hui."); }
      finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; };
  }, [id]);

  if (loading) return <div className="grid min-h-[70vh] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" /></div>;
  if (error || !booking) return <div className="grid min-h-[70vh] place-items-center px-4"><div className="rounded-[28px] border border-red-200 bg-white p-8 text-center"><h1 className="text-xl font-black">Booking unavailable</h1><p className="mt-2 text-sm text-red-600">{error}</p><Link to="/guest/trips" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Back to trips</Link></div></div>;

  const image = booking.apartment?.images?.find((item) => item.isCover)?.url || booking.apartment?.images?.[0]?.url;
  const pricing = booking.pricing || {};
  return <div className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <GuestPageHeader eyebrow="Booking Details" title={booking.apartment?.title || "Your stay"} description={`Booking ID: ${booking._id}`} action={<Link to="/guest/trips" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black">← My Trips</Link>} />
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">{image && <img src={image} alt={booking.apartment?.title} className="h-72 w-full object-cover" />}<div className="p-6"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-[#FF385C]">{booking.status}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{booking.paymentStatus}</span>{booking.membershipSnapshot?.isPremium && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">👑 Premium Traveler</span>}</div><p className="mt-4 text-sm font-semibold text-slate-500">📍 {booking.apartment?.location?.address}, {booking.apartment?.location?.city}</p></div></motion.section>
        <section className="rounded-[28px] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Booking timeline</h2><div className="mt-5 space-y-4">{(booking.history || []).slice().reverse().map((item) => <div key={item._id} className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#FF385C]" /><div><p className="font-black text-slate-800">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.description}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{dateTime(item.changedAt)}</p></div></div>)}</div></section>
        <section className="rounded-[28px] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Host details</h2><div className="mt-4 flex items-center gap-4"><div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-slate-900 font-black text-white">{booking.host?.avatar ? <img src={booking.host.avatar} className="h-full w-full object-cover" /> : booking.host?.name?.[0] || "H"}</div><div><p className="font-black">{booking.host?.name || "StayNest Host"}</p><p className="text-sm text-slate-500">{booking.host?.email}</p><p className="text-sm text-slate-500">{booking.host?.phone}</p></div></div></section>
      </div>
      <aside className="h-fit rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24"><h2 className="text-xl font-black">Stay summary</h2><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black text-slate-400">CHECK-IN</p><p className="mt-1 text-sm font-black">{dateTime(booking.checkIn)}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black text-slate-400">CHECK-OUT</p><p className="mt-1 text-sm font-black">{dateTime(booking.checkOut)}</p></div></div><div className="mt-5 space-y-2 border-y border-slate-100 py-4 text-sm">{[["Base rent",pricing.subtotal],["Extra guest",pricing.extraGuestCharge],["Cleaning",pricing.cleaningFee],["Service",pricing.serviceFee],["Host coupon",-pricing.discountAmount],["Premium discount",-pricing.premiumDiscountAmount],["Loyalty discount",-pricing.loyaltyDiscountAmount]].map(([label,value]) => Number(value || 0) !== 0 && <div key={label} className="flex justify-between"><span className="text-slate-500">{label}</span><strong>{money(value)}</strong></div>)}</div><div className="mt-4 flex justify-between text-lg font-black"><span>Total paid</span><span>{money(pricing.totalAmount)}</span></div><p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">🎁 Expected loyalty reward: {booking.loyalty?.expectedPoints || 0} points</p></aside>
    </div>
  </div></div>;
}