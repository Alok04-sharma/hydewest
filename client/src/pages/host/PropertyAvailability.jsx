import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import hostService from "../../services/host.service";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toInputDate = (date) => date.toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getImageUrl = (property) => {
  const image = property?.images?.[0];

  if (typeof image === "string") {
    return image;
  }

  return image?.url || "https://placehold.co/800x520?text=StayNest";
};

const getStatusStyles = (status) => {
  if (status === "booked") {
    return {
      pill: "bg-rose-100 text-rose-700",
      dot: "bg-rose-500",
      label: "Currently booked",
    };
  }

  return {
    pill: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    label: "Available now",
  };
};

function SummaryCard({ title, value, helper, tone, symbol }) {
  const toneClasses = {
    emerald:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 text-emerald-700",
    rose:
      "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 text-rose-700",
    slate:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-violet-50 text-slate-700",
  };

  return (
    <motion.article
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`relative overflow-hidden rounded-[28px] border p-5 shadow-sm ${toneClasses[tone]}`}
    >
      <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-current opacity-[0.06]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
            {title}
          </p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p>
        </div>

        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">
          {symbol}
        </span>
      </div>
    </motion.article>
  );
}

function PropertyCard({ property, index }) {
  const status = getStatusStyles(property.availabilityStatus);
  const bookings = Array.isArray(property.bookings) ? property.bookings : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.35) }}
      whileHover={{ y: -5 }}
      className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
    >
      <div className="relative h-52 overflow-hidden bg-slate-100">
        <img
          src={getImageUrl(property)}
          alt={property.title || "Property"}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/5 to-transparent" />

        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur ${status.pill}`}
        >
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h2 className="truncate text-xl font-black">
            {property.title || "Untitled property"}
          </h2>
          <p className="mt-1 text-xs font-semibold text-white/70">
            {[property.location?.city, property.location?.state]
              .filter(Boolean)
              .join(", ") || "Location not specified"}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Reserved ranges
            </p>
            <p className="mt-1 text-sm font-black text-slate-900">
              {bookings.length} reservation{bookings.length === 1 ? "" : "s"}
            </p>
          </div>

          <Link
            to={`/host/edit-listing/${property._id}`}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-[#FF385C]"
          >
            Manage listing
          </Link>
        </div>

        <div className="mt-4 space-y-2.5">
          {bookings.length > 0 ? (
            bookings.map((booking) => (
              <div
                key={booking._id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-black text-slate-900">
                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    {booking.guest?.name || "Guest reservation"}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-sm">
                  {booking.status || "reserved"}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-center">
              <p className="text-sm font-black text-emerald-700">
                No reservations in this range
              </p>
              <p className="mt-1 text-xs text-emerald-600/75">
                This property is free for the selected dates.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function PropertyAvailability() {
  const [from, setFrom] = useState(toInputDate(new Date()));
  const [to, setTo] = useState(
    toInputDate(new Date(Date.now() + 90 * DAY_IN_MS))
  );
  const [data, setData] = useState({
    summary: { available: 0, booked: 0 },
    properties: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAvailability = useCallback(
    async ({ initial = false, silent = false } = {}) => {
      if (!from || !to) {
        toast.error("Please select both dates.");
        return;
      }

      if (new Date(from) >= new Date(to)) {
        toast.error("End date must be after start date.");
        return;
      }

      try {
        if (initial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const response = await hostService.getAvailability({ from, to });

        if (!response?.success) {
          throw new Error(response?.message || "Availability load failed.");
        }

        setData(
          response.data || {
            summary: { available: 0, booked: 0 },
            properties: [],
          }
        );

        if (!initial && !silent) {
          toast.success("Availability updated.");
        }
      } catch (requestError) {
        const message =
          requestError.response?.data?.message ||
          requestError.message ||
          "Availability load failed.";

        setError(message);

        if (!silent) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchInitialAvailability = async () => {
      if (!isMounted) {
        return;
      }

      await loadAvailability({ initial: true, silent: true });
    };

    fetchInitialAvailability();

    return () => {
      isMounted = false;
    };
  }, [loadAvailability]);

  const properties = useMemo(
    () => (Array.isArray(data.properties) ? data.properties : []),
    [data.properties]
  );

  const totalProperties = properties.length;
  const availableCount = Number(data.summary?.available || 0);
  const bookedCount = Number(data.summary?.booked || 0);

  return (
    <div className="min-h-screen bg-transparent px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-xl sm:p-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-300">
                Property availability
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Know exactly what is free.
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/65">
                Availability confirmed booking dates se calculate hoti hai. Checkout
                complete hote hi property automatically available dikhegi.
              </p>
            </div>

            <div className="grid w-full gap-3 rounded-[24px] border border-white/10 bg-white/10 p-3 backdrop-blur lg:max-w-xl sm:grid-cols-[1fr_1fr_auto]">
              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-white/55">
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-white/55">
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none"
                />
              </label>

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                disabled={refreshing}
                onClick={() => loadAvailability()}
                className="self-end rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Checking..." : "Apply"}
              </motion.button>
            </div>
          </div>
        </motion.header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton-shimmer h-36 rounded-[28px]"
                />
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton-shimmer h-[430px] rounded-[30px]"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                title="Available now"
                value={availableCount}
                helper="No active confirmed stay"
                tone="emerald"
                symbol="✓"
              />
              <SummaryCard
                title="Booked now"
                value={bookedCount}
                helper="Guest currently staying"
                tone="rose"
                symbol="●"
              />
              <SummaryCard
                title="Total properties"
                value={totalProperties}
                helper="All non-deleted listings"
                tone="slate"
                symbol="⌂"
              />
            </section>

            {properties.length > 0 ? (
              <section className="grid gap-5 lg:grid-cols-2">
                {properties.map((property, index) => (
                  <PropertyCard
                    key={property._id}
                    property={property}
                    index={index}
                  />
                ))}
              </section>
            ) : (
              <section className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-3xl">
                  🏠
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-900">
                  No properties found
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Create your first listing to start monitoring availability.
                </p>
                <Link
                  to="/host/add-listing"
                  className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-[#FF385C]"
                >
                  Add property
                </Link>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}