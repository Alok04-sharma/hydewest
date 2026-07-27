import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import hostService from "../../services/host.service";

const TABS = [
  ["all", "All"],
  ["requests", "Requests"],
  ["upcoming", "Upcoming"],
  ["ongoing", "Ongoing"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

const VALID_TABS = new Set(TABS.map(([key]) => key));

const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const resolveTab = (value) => (VALID_TABS.has(value) ? value : "all");

export default function HostBookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = resolveTab(searchParams.get("tab"));

  const [tab, setTab] = useState(requestedTab);
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ bookings: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(requestedTab);
  }, [requestedTab]);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);

      const response = await hostService.getBookings({
        category: tab,
        search,
      });

      setData(response?.data || { bookings: [], summary: {} });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Bookings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [search, tab]);

  useEffect(() => {
    const timer = window.setTimeout(loadBookings, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadBookings]);

  const selectTab = (nextTab) => {
    const resolved = resolveTab(nextTab);
    setTab(resolved);

    const nextParams = new URLSearchParams(searchParams);
    if (resolved === "all") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", resolved);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await hostService.updateBookingStatus(bookingId, { status });
      toast.success(`Booking marked as ${status}.`);
      await loadBookings();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "The booking action failed."
      );
    }
  };

  const bookings = useMemo(
    () => (Array.isArray(data?.bookings) ? data.bookings : []),
    [data]
  );

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-7 text-white shadow-2xl"
        >
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-300">
            Booking management
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black sm:text-4xl">
                Every stay, under control.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Approve requests, prepare for upcoming arrivals, monitor active
                stays, and review completed or cancelled bookings.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Guest or property"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 lg:w-80"
            />
          </div>
        </motion.section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => selectTab(key)}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                tab === key
                  ? "bg-[#FF385C] text-white shadow-lg"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50"
              }`}
            >
              {label}
              <span className="ml-1 opacity-70">{data.summary?.[key] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-white" />
            <div className="h-64 animate-pulse rounded-3xl bg-white" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-5 lg:grid-cols-2">
              {bookings.map((booking) => (
                <motion.article
                  layout
                  key={booking._id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.992 }}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/host/bookings/${booking._id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/host/bookings/${booking._id}`);
                    }
                  }}
                  className="group cursor-pointer overflow-hidden rounded-[28px] border border-[#d9caa5] bg-gradient-to-br from-[#fffdf8] via-[#fffaf0] to-[#eef4ff] shadow-[0_16px_45px_rgba(62,48,24,0.10)] outline-none transition focus-visible:ring-4 focus-visible:ring-amber-200 hover:shadow-xl"
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                    <img
                      src={
                        booking.apartment?.images?.[0]?.url ||
                        booking.apartment?.images?.[0] ||
                        "https://placehold.co/240x180?text=Property"
                      }
                      alt={booking.apartment?.title || "Property"}
                      className="h-48 w-full rounded-2xl object-cover sm:h-28 sm:w-32"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-slate-900">
                            {booking.apartment?.title || "Property"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {booking.guest?.name || "Guest"}
                          </p>
                        </div>

                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black capitalize text-amber-800">
                          {booking.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-emerald-50 p-2.5">
                          <b className="text-emerald-700">Check-in</b>
                          <p>{formatDate(booking.checkIn)}</p>
                        </div>
                        <div className="rounded-xl bg-rose-50 p-2.5">
                          <b className="text-rose-700">Check-out</b>
                          <p>{formatDate(booking.checkOut)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7dcc4] bg-[#fffaf0]/80 px-5 py-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        {booking.guestsCount} Guest
                        {Number(booking.guestsCount || 0) === 1 ? "" : "s"}
                      </p>
                      <p className="font-black text-slate-900">
                        {money(booking.pricing?.totalAmount)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        to={`/host/bookings/${booking._id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-xl border border-[#d9caa5] bg-white px-3 py-2 text-xs font-black text-slate-800"
                      >
                        Details
                      </Link>

                      {booking.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateBookingStatus(booking._id, "cancelled");
                            }}
                            className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-black"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateBookingStatus(booking._id, "confirmed");
                            }}
                            className="rounded-xl bg-[#FF385C] px-3 py-2 text-xs font-black text-white"
                          >
                            Confirm
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </AnimatePresence>
        )}

        {!loading && bookings.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <div className="text-5xl">📅</div>
            <h2 className="mt-4 text-xl font-black text-slate-900">
              No bookings in this view
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              New reservations will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}