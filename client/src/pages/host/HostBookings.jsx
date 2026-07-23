import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import hostService from "../../services/host.service";

const tabs = [
  ["all", "All"], ["requests", "Requests"], ["upcoming", "Upcoming"],
  ["ongoing", "Ongoing"], ["completed", "Completed"], ["cancelled", "Cancelled"],
];
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const date = (value) => new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function HostBookings() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ bookings: [], summary: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await hostService.getBookings({ category: tab, search });
      setData(response.data || { bookings: [], summary: {} });
    } catch (error) { toast.error(error.response?.data?.message || "Bookings load nahi hui."); }
    finally { setLoading(false); }
  }, [tab, search]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);

  const action = async (id, status) => {
    try { await hostService.updateBookingStatus(id, { status }); toast.success(`Booking ${status}.`); load(); }
    catch (error) { toast.error(error.response?.data?.message || "Action failed."); }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-7 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[.28em] text-rose-300">Booking management</p>
          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div><h1 className="text-3xl font-black sm:text-4xl">Every stay, under control.</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Requests approve karo, upcoming arrivals prepare karo aur completed stays monitor karo.</p></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest or property" className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-slate-400 lg:w-80" />
          </div>
        </motion.section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-black transition ${tab === key ? "bg-[#FF385C] text-white shadow-lg" : "border border-slate-200 bg-white text-slate-600 hover:border-rose-200"}`}>{label} <span className="ml-1 opacity-70">{data.summary?.[key] || 0}</span></button>)}
        </div>

        {loading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-64 animate-pulse rounded-3xl bg-white"/><div className="h-64 animate-pulse rounded-3xl bg-white"/></div> : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-5 lg:grid-cols-2">
              {data.bookings.map((item) => (
                <motion.article layout key={item._id} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                    <img src={item.apartment?.images?.[0]?.url || item.apartment?.images?.[0] || "https://placehold.co/240x180"} alt="" className="h-48 w-full rounded-2xl object-cover sm:h-28 sm:w-32" />
                    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate text-lg font-black text-slate-900">{item.apartment?.title}</p><p className="mt-1 text-sm font-semibold text-slate-500">{item.guest?.name || "Guest"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-700">{item.status}</span></div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-emerald-50 p-2.5"><b className="text-emerald-700">Check-in</b><p>{date(item.checkIn)}</p></div><div className="rounded-xl bg-rose-50 p-2.5"><b className="text-rose-700">Check-out</b><p>{date(item.checkOut)}</p></div></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4"><div><p className="text-xs text-slate-500">{item.guestsCount} guests</p><p className="font-black text-slate-900">{money(item.pricing?.totalAmount)}</p></div><div className="flex gap-2"><Link to={`/host/bookings/${item._id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black">Details</Link>{item.status === "pending" && <><button onClick={() => action(item._id, "cancelled")} className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-black">Decline</button><button onClick={() => action(item._id, "confirmed")} className="rounded-xl bg-[#FF385C] px-3 py-2 text-xs font-black text-white">Confirm</button></>}</div></div>
                </motion.article>
              ))}
            </div>
          </AnimatePresence>
        )}
        {!loading && !data.bookings.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center"><div className="text-5xl">📅</div><h2 className="mt-4 text-xl font-black">No bookings in this view</h2><p className="mt-2 text-sm text-slate-500">New reservations automatically yahan appear hongi.</p></div>}
      </div>
    </div>
  );
}