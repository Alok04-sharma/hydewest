import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import bookingService from "../../services/booking.service";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

const TABS = [
  { value: "upcoming", label: "Upcoming", icon: "🛫" },
  { value: "current", label: "Current Stay", icon: "🛎️" },
  { value: "completed", label: "Booking History", icon: "🕒" },
  { value: "cancelled", label: "Cancelled", icon: "↩️" },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getImage = (booking) =>
  booking.apartment?.images?.find((item) => item.isCover)?.url ||
  booking.apartment?.images?.[0]?.url ||
  "";

export default function Trips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = TABS.some((item) => item.value === requestedTab)
    ? requestedTab
    : "upcoming";

  const [data, setData] = useState({
    upcoming: [],
    current: [],
    completed: [],
    cancelled: [],
  });
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await bookingService.getMyBookings();
      setData(
        response.data || {
          upcoming: [],
          current: [],
          completed: [],
          cancelled: [],
        }
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Bookings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (TABS.some((item) => item.value === nextTab)) {
      setTab(nextTab);
    }
  }, [searchParams]);

  const items = useMemo(() => data?.[tab] || [], [data, tab]);
  const activeTabMeta =
    TABS.find((item) => item.value === tab) || TABS[0];

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const cancelBooking = async (booking) => {
    const reason = window.prompt(
      "Cancellation reason likhein:",
      "Plans changed"
    );

    if (reason === null) return;

    try {
      setError("");
      await bookingService.cancelBooking(booking._id, reason.trim());
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "The booking could not be cancelled."
      );
    }
  };

  return (
    <div className="guest-page min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <GuestPageHeader
          eyebrow="My Bookings"
          title="Your StayNest trips"
          description="Manage upcoming stays, current bookings, completed history, and cancellations in one place."
          action={
            <Link
              to="/guest/search"
              className="rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:bg-[#FF385C]"
            >
              Explore stays
            </Link>
          }
        />

        <section className="guest-card mt-6 rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeTab(item.value)}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition ${
                  tab === item.value
                    ? "bg-[#FF385C] text-white shadow-lg shadow-rose-200"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="mr-1.5" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label} ({data?.[item.value]?.length || 0})
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {items.map((booking, index) => {
              const image = getImage(booking);
              const unit = booking.pricing?.bookingUnit || "night";

              return (
                <motion.article
                  key={booking._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="guest-card overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="grid sm:grid-cols-[190px_1fr]">
                    <div className="relative min-h-48 bg-slate-200">
                      {image ? (
                        <img
                          src={image}
                          alt={booking.apartment?.title || "Booked property"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full min-h-48 place-items-center text-4xl">
                          🏠
                        </div>
                      )}

                      {booking.membershipSnapshot?.isPremium && (
                        <span className="absolute left-3 top-3 rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-950 shadow-lg">
                          👑 Premium booking
                        </span>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FF385C]">
                            {activeTabMeta.label}
                          </p>
                          <h2 className="mt-1 truncate text-lg font-black text-slate-950">
                            {booking.apartment?.title || "Property booking"}
                          </h2>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                            {[booking.apartment?.location?.city, booking.apartment?.location?.state]
                              .filter(Boolean)
                              .join(", ") || "Location unavailable"}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase text-slate-600">
                          {booking.paymentStatus}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="font-bold text-slate-400">Check-in</p>
                          <p className="mt-1 font-black text-slate-800">
                            {formatDate(booking.checkIn)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="font-bold text-slate-400">Check-out</p>
                          <p className="mt-1 font-black text-slate-800">
                            {formatDate(booking.checkOut)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {booking.guestsCount || 1} guest(s)
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {booking.pricing?.unitCount || 1} × {unit}
                        </span>
                        {booking.pricing?.couponCode && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                            {booking.pricing.couponCode}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg font-black text-slate-950">
                          {money(booking.pricing?.totalAmount)}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/guest/bookings/${booking._id}`}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                          >
                            Details
                          </Link>

                          {["upcoming", "current"].includes(tab) &&
                            booking.status !== "cancelled" && (
                              <button
                                type="button"
                                onClick={() => cancelBooking(booking)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600"
                              >
                                Cancel
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}

            {!items.length && (
              <div className="guest-card col-span-full rounded-[30px] border border-dashed border-slate-300 bg-white py-20 text-center">
                <div className="text-5xl">{activeTabMeta.icon}</div>
                <h2 className="mt-4 text-lg font-black text-slate-950">
                  No {activeTabMeta.label.toLowerCase()} bookings
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  No booking is currently available in this category.
                </p>
                <Link
                  to="/guest/search"
                  className="mt-5 inline-flex rounded-2xl bg-[#FF385C] px-5 py-3 text-sm font-black text-white"
                >
                  Explore stays
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}