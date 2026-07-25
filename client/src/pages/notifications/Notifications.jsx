import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import notificationService from "../../services/notification.service";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

const date = (value) => new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const icons = { booking_confirmed: "✅", payment_successful: "💳", checkin_reminder: "🧳", checkout_reminder: "⏰", booking_completed: "⭐", booking_cancelled: "❌", new_chat_message: "💬", price_drop_alert: "📉", loyalty_points_credited: "🎁", loyalty_points_redeemed: "💸", guest_membership_payment_pending: "💳", guest_membership_activated: "👑", guest_membership_expired: "⌛", subscription_payment_reminder: "⏳" };

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const unread = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const load = async () => { try { setLoading(true); const response = await notificationService.getNotifications({ limit: 100 }); setItems(response.data?.notifications || response.data || []); } catch (requestError) { setError(requestError.response?.data?.message || "Notifications load nahi hui."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const open = async (item) => { try { if (!item.isRead) await notificationService.markRead(item._id); setItems((current) => current.map((value) => value._id === item._id ? { ...value, isRead: true } : value)); if (item.actionUrl) navigate(item.actionUrl); } catch { if (item.actionUrl) navigate(item.actionUrl); } };
  const markAll = async () => { await notificationService.markAllRead(); setItems((current) => current.map((item) => ({ ...item, isRead: true }))); };
  const remove = async (id) => { await notificationService.remove(id); setItems((current) => current.filter((item) => item._id !== id)); };
  return <div className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><GuestPageHeader eyebrow="Notifications" title="Your StayNest updates" description="Bookings, payments, reminders, loyalty, chat aur Premium activity ek jagah." action={unread>0?<button onClick={markAll} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Mark all read</button>:null} />{error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}{loading ? <div className="grid min-h-72 place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" /></div> : <div className="mt-6 space-y-3">{items.map((item,index)=><motion.article key={item._id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.025}} className={`flex gap-4 rounded-[24px] border p-4 shadow-sm ${item.isRead?"border-slate-200 bg-white":"border-rose-200 bg-rose-50/60"}`}><button onClick={()=>open(item)} className="flex min-w-0 flex-1 gap-4 text-left"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">{icons[item.type]||"🔔"}</span><span className="min-w-0"><span className="block font-black text-slate-900">{item.title}</span><span className="mt-1 block text-sm leading-6 text-slate-500">{item.message}</span><span className="mt-2 block text-[10px] font-bold text-slate-400">{date(item.createdAt)}</span></span></button><button onClick={()=>remove(item._id)} className="h-9 w-9 shrink-0 rounded-xl bg-white text-slate-400 hover:text-red-600">×</button></motion.article>)}{!items.length && <div className="rounded-[30px] border border-dashed border-slate-300 bg-white py-20 text-center"><div className="text-5xl">🔔</div><h2 className="mt-4 text-lg font-black">No notifications yet</h2></div>}</div>}</div></div>;
}