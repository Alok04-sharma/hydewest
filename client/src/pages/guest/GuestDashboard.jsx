import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";

import guestService from "../../services/guest.service";
import bookingService from "../../services/booking.service";
import ListingCard from "../../components/listing/ListingCard";
import UberRideButton from "../../components/common/UberRideButton";

const freeActions = [
  ["Search Stays", "/guest/search", "🔍", "Find properties by city, dates and budget"],
  ["Wishlist", "/guest/wishlist", "❤️", "Open your saved properties"],
  ["My Bookings", "/guest/trips?tab=upcoming", "📅", "Upcoming, current and past stays"],
  ["Payments", "/guest/payments", "💳", "Receipts and payment history"],
  ["Notifications", "/notifications", "🔔", "Booking and payment updates"],
  ["My Profile", "/profile", "👤", "Personal details and account security"],
];

const premiumActions = [
  ["Host Messages", "/guest/messages", "💬", "Chat directly with Hosts"],
  ["Wallet & Cashback", "/guest/hub/wallet", "💰", "Rewards and booking credits"],
  ["Premium Coupons", "/guest/hub/coupons", "🎟️", "Members-only offers"],
  ["Price Drop Alerts", "/guest/price-alerts", "📉", "Track saved-property prices"],
  ["Price History", "/guest/hub/history", "📊", "Compare price movement"],
  ["Exclusive Listings", "/guest/hub/exclusive", "🏡", "Premium-only luxury stays"],
  ["Recommendations", "/guest/premium-tools?view=recommendations", "🎯", "Personalized ideas"],
  ["AI Trip Planner", "/guest/premium-tools?view=planner", "🤖", "Plan by budget and days"],
  ["Reward Points", "/guest/loyalty", "🎁", "Earn faster and redeem"],
  ["Referral Rewards", "/guest/hub/referrals", "🎉", "Invite friends and earn"],
  ["Priority Support", "/guest/hub/support", "📞", "Faster member assistance"],
  ["Premium Membership", "/guest/premium", "👑", "Manage your membership"],
];

const listingSections = [
  ["available", "Available Properties", "Properties available for your next stay", "✅"],
  ["approved", "All Property", "Browse every approved property on hydewest", "🏡"],
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

function LoadingDashboard() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="skeleton-shimmer h-64 rounded-[34px]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer h-32 rounded-[26px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GuestDashboard() {
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [premiumToolsOpen, setPremiumToolsOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [dashboardResult, bookingResult] = await Promise.allSettled([
          guestService.getDashboard(),
          bookingService.getMyBookings(),
        ]);

        if (!active) return;

        if (dashboardResult.status === "fulfilled") {
          setData(dashboardResult.value.data || null);
        } else {
          throw dashboardResult.reason;
        }

        if (bookingResult.status === "fulfilled") {
          setBookings(bookingResult.value.data || null);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || "Guest dashboard load nahi hua.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const premiumActive = Boolean(data?.membership?.isActive);
  const loyalty = data?.loyalty?.account || {};
  const membership = data?.membership?.membership || {};
  const nextBooking = useMemo(
    () => bookings?.upcoming?.[0] || bookings?.current?.[0] || null,
    [bookings]
  );
  const premiumDiscount = Number(membership?.discountPercent || 12);
  const cashbackValue = Math.floor(Number(loyalty.balance || 0) / 10);

  if (loading) return <LoadingDashboard />;

  return (
    <div
      className={`guest-page min-h-screen px-4 pb-12 pt-16 sm:px-6 lg:px-8 ${
        premiumActive
          ? "bg-[radial-gradient(circle_at_8%_0%,rgba(251,191,36,.16),transparent_26rem),radial-gradient(circle_at_92%_4%,rgba(244,63,94,.13),transparent_28rem),linear-gradient(180deg,#090d1a_0%,#111827_32%,#151b2b_100%)]"
          : "bg-[radial-gradient(circle_at_10%_0%,rgba(255,56,92,.11),transparent_28rem),linear-gradient(180deg,#fff1f3_0%,#f7eef1_30%,#eef2f7_100%)]"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200/70 bg-red-100/75 p-4 text-sm font-bold text-red-800 backdrop-blur">
            {error}
          </div>
        )}

        {premiumActive ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[36px] border border-amber-300/20 bg-gradient-to-br from-slate-950 via-[#15172b] to-rose-950 p-6 text-white shadow-[0_35px_90px_rgba(15,23,42,.45)] sm:p-9"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-amber-300/15 bg-amber-300/5"
            />
            <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                    👑 Premium Traveller
                  </span>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                    {data?.membership?.remainingDays || 0} days remaining
                  </span>
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                  Welcome to your premium hydewest.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  Member pricing, Host chat, exclusive stays, price alerts, flexible cancellation and faster rewards are active.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/guest/search" className="rounded-2xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20">
                    Explore Premium Stays →
                  </Link>
                  <UberRideButton />
                  <button
                    type="button"
                    onClick={() => setPremiumToolsOpen((current) => !current)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur"
                  >
                    {premiumToolsOpen ? "Close Premium Toolkit" : "Open Premium Toolkit"} {premiumToolsOpen ? "↑" : "↓"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px] lg:grid-cols-2">
                {[
                  ["Member saving", `${premiumDiscount}%`, "💎"],
                  ["Wallet value", money(cashbackValue), "💰"],
                  ["Reward points", loyalty.balance || 0, "🎁"],
                  ["Bookings", bookings?.all?.length || 0, "📅"],
                ].map(([label, value, icon], index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 * index }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="rounded-[24px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl"
                  >
                    <span className="text-2xl">{icon}</span>
                    <p className="mt-3 text-2xl font-black text-amber-100">{value}</p>
                    <p className="mt-1 text-[11px] font-bold text-white/45">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[34px] border border-rose-200/60 bg-gradient-to-br from-[#fff8f8]/90 via-rose-50/80 to-violet-50/75 p-6 shadow-[0_25px_70px_rgba(74,18,36,.10)] backdrop-blur sm:p-9"
          >
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#bd123f]">hydewest Guest Dashboard</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Find a stay that fits your trip.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Search approved properties, manage bookings, save favourites and discover Host offers from one clean dashboard.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/guest/search" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#bd123f]">Search Stays →</Link>
                  <Link to="/guest/premium" className="rounded-2xl border border-amber-300/70 bg-amber-100/75 px-5 py-3 text-sm font-black text-amber-900">👑 Upgrade to Premium</Link>
                  <UberRideButton />
                </div>
              </div>

              <div className="rounded-[30px] bg-gradient-to-br from-rose-700 via-[#d3134c] to-orange-500 p-6 text-white shadow-xl lg:max-w-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Premium preview</p>
                <h2 className="mt-2 text-2xl font-black">Pay less and unlock more.</h2>
                <p className="mt-3 text-sm leading-6 text-white/80">Host chat, member discounts, exclusive listings, unlimited wishlist, price alerts and 48-hour flexible cancellation.</p>
                <Link to="/guest/premium" className="mt-5 inline-flex rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-black text-[#a70836]">Compare plans</Link>
              </div>
            </div>
          </motion.section>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["All property", data?.counts?.approved || 0, "🏠", "/guest/search"],
            ["Featured", data?.counts?.featured || 0, "⭐", "/guest/search"],
            ["Available now", data?.counts?.available || 0, "🗓️", "/guest/search"],
            ["Reward points", loyalty.balance || 0, "🎁", "/guest/loyalty"],
          ].map(([label, value, icon, to], index) => (
            <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }}>
              <Link to={to} className={`block rounded-[26px] border p-5 shadow-sm backdrop-blur transition ${premiumActive ? "border-amber-300/20 bg-white/[0.07]" : "border-rose-200/60 bg-[#fff8f8]/75"}`}>
                <span className="text-2xl">{icon}</span>
                <p className={`mt-3 text-2xl font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>{value}</p>
                <p className={`mt-1 text-xs font-bold ${premiumActive ? "text-amber-100/50" : "text-slate-500"}`}>{label}</p>
              </Link>
            </motion.div>
          ))}
        </section>

        {nextBooking && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-7 rounded-[30px] border p-5 shadow-sm backdrop-blur sm:p-6 ${premiumActive ? "border-amber-300/20 bg-white/[0.07]" : "border-rose-200/60 bg-[#fff8f8]/80"}`}
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>Next stay</p>
                <h2 className={`mt-2 text-xl font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>{nextBooking.apartment?.title || "Upcoming hydewest booking"}</h2>
                <p className={`mt-1 text-sm ${premiumActive ? "text-white/55" : "text-slate-500"}`}>{new Date(nextBooking.checkIn).toLocaleDateString("en-IN")} → {new Date(nextBooking.checkOut).toLocaleDateString("en-IN")}</p>
              </div>
              <Link to={`/guest/bookings/${nextBooking._id}`} className={`w-fit rounded-2xl px-5 py-3 text-sm font-black ${premiumActive ? "bg-gradient-to-r from-amber-300 to-orange-300 text-slate-950" : "bg-slate-950 text-white"}`}>View booking →</Link>
            </div>
          </motion.section>
        )}

        <section className="mt-10">
          <div className="mb-5">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>{premiumActive ? "Premium control center" : "Guest shortcuts"}</p>
            <h2 className={`mt-1 text-2xl font-black ${premiumActive ? "text-amber-100" : "text-slate-950"}`}>Everything you need</h2>
            <p className={`mt-1 text-sm ${premiumActive ? "text-amber-100/55" : "text-slate-600"}`}>Your everyday booking, payment and account tools.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {freeActions.map(([label, to, icon, description], index) => (
              <motion.div key={`${label}-${to}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} whileHover={{ y: -4 }}>
                <Link to={to} className={`group flex h-full items-start gap-4 rounded-[24px] border p-4 shadow-sm backdrop-blur transition ${premiumActive ? "border-amber-300/15 bg-white/[0.06] hover:border-amber-300/35" : "border-rose-200/60 bg-[#fff8f8]/76 hover:border-rose-300"}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${premiumActive ? "bg-amber-300/12" : "bg-rose-100/80"}`}>{icon}</span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>{label}</span>
                    <span className={`mt-1 block text-xs leading-5 ${premiumActive ? "text-white/45" : "text-slate-500"}`}>{description}</span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          {premiumActive ? (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-amber-300/20 bg-white/[0.05] backdrop-blur">
              <button type="button" onClick={() => setPremiumToolsOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
                <span>
                  <span className="block text-sm font-black uppercase tracking-[0.16em] text-amber-300">👑 Premium Toolkit</span>
                  <span className="mt-1 block text-xs text-white/50">Open all member-only travel tools when you need them.</span>
                </span>
                <motion.span animate={{ rotate: premiumToolsOpen ? 180 : 0 }} className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-300/10 text-amber-200">⌄</motion.span>
              </button>

              <AnimatePresence initial={false}>
                {premiumToolsOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid gap-3 border-t border-amber-300/15 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-6">
                      {premiumActions.map(([label, to, icon, description], index) => (
                        <motion.div key={`${label}-${to}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.25) }}>
                          <Link to={to} className="flex h-full items-start gap-3 rounded-2xl border border-amber-300/15 bg-[#151827]/80 p-4 transition hover:border-amber-300/45 hover:bg-amber-300/10">
                            <span className="text-xl">{icon}</span>
                            <span><span className="block text-sm font-black text-white">{label}</span><span className="mt-1 block text-[11px] leading-5 text-white/42">{description}</span></span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div whileHover={{ y: -4 }} className="mt-5">
              <Link to="/guest/premium" className="flex flex-col justify-between gap-4 rounded-[28px] border border-amber-300/60 bg-gradient-to-r from-amber-100/80 via-rose-50/80 to-violet-100/65 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center">
                <div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-800">👑 Upgrade to Premium</p><h3 className="mt-2 text-xl font-black text-slate-950">Unlock premium travel tools without dashboard clutter.</h3><p className="mt-1 text-sm text-slate-600">Host chat, price alerts, coupons, exclusive stays, AI planning and more.</p></div>
                <span className="w-fit rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">View Premium →</span>
              </Link>
            </motion.div>
          )}
        </section>

        {listingSections.map(([key, title, subtitle, icon]) => (
          <section key={key} className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>{icon} Curated for guests</p>
                <h2 className={`mt-1 text-2xl font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>{title}</h2>
                <p className={`mt-1 text-xs font-semibold ${premiumActive ? "text-white/45" : "text-slate-500"}`}>{subtitle}</p>
              </div>
              <Link to="/guest/search" className={`text-xs font-black ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>View all →</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(data?.sections?.[key] || []).slice(0, 8).map((apartment, index) => (
                <ListingCard key={apartment._id} apartment={apartment} index={index} membership={data?.membership} compact />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}