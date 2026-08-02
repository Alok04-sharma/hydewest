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

function GuestStatCard({
  label,
  value,
  icon,
  to,
  helper,
  index,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
    >
      <Link
        to={to}
        className="group relative block h-full overflow-hidden rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-[0_18px_55px_rgba(17,24,39,.1)]"
      >
        <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-violet-100/70 transition duration-300 group-hover:scale-125" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">
              {label}
            </p>

            <p className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              {value}
            </p>
          </div>

          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-xl text-violet-700">
            {icon}
          </span>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <span className="text-xs font-black text-violet-700">
            Open →
          </span>

          <span className="text-right text-xs font-medium text-gray-400">
            {helper}
          </span>
        </div>
      </Link>
    </motion.div>
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
          : "bg-gray-50 lg:pt-8"
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
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
          >
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
                ✦ Guest Travel Center
              </div>

              <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                Guest Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Search approved properties, manage bookings, save favourites and keep every trip update in one operational overview.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/guest/search"
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700"
              >
                Search Stays →
              </Link>

              <Link
                to="/guest/premium"
                className="rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-bold text-purple-700 shadow-sm transition hover:bg-purple-50"
              >
                👑 Premium Plans
              </Link>

              <UberRideButton />
            </div>
          </motion.header>
        )}

        {premiumActive ? (
          <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["All property", data?.counts?.approved || 0, "🏠", "/guest/search"],
              ["Featured", data?.counts?.featured || 0, "⭐", "/guest/search"],
              ["Available now", data?.counts?.available || 0, "🗓️", "/guest/search"],
              ["Reward points", loyalty.balance || 0, "🎁", "/guest/loyalty"],
            ].map(([label, value, icon, to], index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -5 }}>
                <Link to={to} className="block rounded-[26px] border border-amber-300/20 bg-white/[0.07] p-5 shadow-sm backdrop-blur transition">
                  <span className="text-2xl">{icon}</span>
                  <p className="mt-3 text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-bold text-amber-100/50">{label}</p>
                </Link>
              </motion.div>
            ))}
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["All Properties", data?.counts?.approved || 0, "🏠", "/guest/search", "Approved stays"],
              ["Featured Stays", data?.counts?.featured || 0, "⭐", "/guest/search", "Curated for guests"],
              ["Available Now", data?.counts?.available || 0, "🗓️", "/guest/search", "Ready to book"],
              ["Reward Points", loyalty.balance || 0, "🎁", "/guest/loyalty", "Loyalty balance"],
            ].map(([label, value, icon, to, helper], index) => (
              <GuestStatCard
                key={label}
                label={label}
                value={value}
                icon={icon}
                to={to}
                helper={helper}
                index={index}
              />
            ))}
          </section>
        )}

        {nextBooking && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-7 rounded-[30px] border p-5 shadow-sm backdrop-blur sm:p-6 ${premiumActive ? "border-amber-300/20 bg-white/[0.07]" : "border-gray-200 bg-white"}`}
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${premiumActive ? "text-amber-300" : "text-purple-700"}`}>Next stay</p>
                <h2 className={`mt-2 text-xl font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>{nextBooking.apartment?.title || "Upcoming hydewest booking"}</h2>
                <p className={`mt-1 text-sm ${premiumActive ? "text-white/55" : "text-slate-500"}`}>{new Date(nextBooking.checkIn).toLocaleDateString("en-IN")} → {new Date(nextBooking.checkOut).toLocaleDateString("en-IN")}</p>
              </div>
              <Link to={`/guest/bookings/${nextBooking._id}`} className={`w-fit rounded-2xl px-5 py-3 text-sm font-black ${premiumActive ? "bg-gradient-to-r from-amber-300 to-orange-300 text-slate-950" : "bg-gray-900 text-white hover:bg-purple-700"}`}>View booking →</Link>
            </div>
          </motion.section>
        )}

        <section className="mt-10">
          <div className="mb-5">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${premiumActive ? "text-amber-300" : "text-purple-700"}`}>{premiumActive ? "Premium control center" : "Guest shortcuts"}</p>
            <h2 className={`mt-1 text-2xl font-black ${premiumActive ? "text-amber-100" : "text-slate-950"}`}>Everything you need</h2>
            <p className={`mt-1 text-sm ${premiumActive ? "text-amber-100/55" : "text-slate-600"}`}>Your everyday booking, payment and account tools.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {freeActions.map(([label, to, icon, description], index) => (
              <motion.div key={`${label}-${to}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} whileHover={{ y: -4 }}>
                <Link to={to} className={`group flex h-full items-start gap-4 rounded-[24px] border p-4 shadow-sm backdrop-blur transition ${premiumActive ? "border-amber-300/15 bg-white/[0.06] hover:border-amber-300/35" : "border-gray-200 bg-white hover:border-violet-200 hover:shadow-[0_16px_45px_rgba(17,24,39,.08)]"}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${premiumActive ? "bg-amber-300/12" : "bg-violet-100"}`}>{icon}</span>
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
              <Link to="/guest/premium" className="flex flex-col justify-between gap-4 rounded-[28px] border border-violet-200 bg-gradient-to-r from-white via-violet-50 to-rose-50 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center">
                <div><p className="text-xs font-black uppercase tracking-[0.2em] text-purple-700">👑 Upgrade to Premium</p><h3 className="mt-2 text-xl font-black text-slate-950">Unlock premium travel tools without dashboard clutter.</h3><p className="mt-1 text-sm text-slate-600">Host chat, price alerts, coupons, exclusive stays, AI planning and more.</p></div>
                <span className="w-fit rounded-2xl bg-gray-900 px-5 py-3 text-sm font-black text-white">View Premium →</span>
              </Link>
            </motion.div>
          )}
        </section>

        {listingSections.map(([key, title, subtitle, icon]) => (
          <section key={key} className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${premiumActive ? "text-amber-300" : "text-purple-700"}`}>{icon} Curated for guests</p>
                <h2 className={`mt-1 text-2xl font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>{title}</h2>
                <p className={`mt-1 text-xs font-semibold ${premiumActive ? "text-white/45" : "text-slate-500"}`}>{subtitle}</p>
              </div>
              <Link to="/guest/search" className={`text-xs font-black ${premiumActive ? "text-amber-300" : "text-purple-700"}`}>View all →</Link>
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