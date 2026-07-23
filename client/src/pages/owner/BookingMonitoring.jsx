import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiXCircle,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const EMPTY_RESULT = {
  bookings: [],
  summary: {
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-blue-200 bg-blue-50 text-blue-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const PAYMENT_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-purple-50 text-purple-700",
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${
        STATUS_STYLES[status] || STATUS_STYLES.pending
      }`}
    >
      {status}
    </span>
  );
}

function PaymentBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        PAYMENT_STYLES[status] || PAYMENT_STYLES.pending
      }`}
    >
      {status}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, style }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style}`}>
          <Icon />
        </div>
      </div>
    </article>
  );
}

export default function BookingMonitoring() {
  const [result, setResult] = useState(EMPTY_RESULT);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadBookings = useCallback(
    async (manualRefresh = false) => {
      try {
        manualRefresh ? setRefreshing(true) : setLoading(true);
        setError("");

        const response = await ownerService.getBookings({
          page,
          limit: 10,
          search: debouncedSearch,
          status,
          paymentStatus,
          from,
          to,
          sortBy,
        });

        if (!response.success) {
          throw new Error(response.message || "Bookings load nahi ho saki.");
        }

        setResult(response.data || EMPTY_RESULT);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Booking Monitoring data load nahi ho saka."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, from, page, paymentStatus, sortBy, status, to]
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: `All (${result.summary.total})` },
      { value: "pending", label: `Pending (${result.summary.pending})` },
      { value: "confirmed", label: `Confirmed (${result.summary.confirmed})` },
      { value: "completed", label: `Completed (${result.summary.completed})` },
      { value: "cancelled", label: `Cancelled (${result.summary.cancelled})` },
    ],
    [result.summary]
  );

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setFrom("");
    setTo("");
    setSortBy("newest");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
              <FiShield /> Super Admin Module
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Booking Monitoring
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Platform ki sabhi bookings, guest-host details, booking status,
              payment status aur complete history monitor karein.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => loadBookings(true)} className="underline">Retry</button>
          </div>
        )}

        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="All Bookings" value={result.summary.total} icon={FiCalendar} style="bg-purple-100 text-purple-700" />
          <SummaryCard title="Pending" value={result.summary.pending} icon={FiClock} style="bg-amber-100 text-amber-700" />
          <SummaryCard title="Confirmed" value={result.summary.confirmed} icon={FiCheckCircle} style="bg-emerald-100 text-emerald-700" />
          <SummaryCard title="Completed" value={result.summary.completed} icon={FiCheckCircle} style="bg-blue-100 text-blue-700" />
          <SummaryCard title="Cancelled" value={result.summary.cancelled} icon={FiXCircle} style="bg-red-100 text-red-700" />
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search booking ID, guest, host or property..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100">
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100">
              <option value="all">All Payments</option>
              <option value="pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} title="From date" className="rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
            <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} title="To date" className="rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />

            <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="checkin_soon">Check-in Soon</option>
              <option value="amount_high">Amount High-Low</option>
              <option value="amount_low">Amount Low-High</option>
            </select>
          </div>

          <div className="mt-3 flex justify-end">
            <button type="button" onClick={clearFilters} className="text-xs font-bold text-purple-700 hover:underline">Clear all filters</button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-500">Bookings load ho rahi hain...</p>
            </div>
          ) : result.bookings.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-2xl text-gray-500"><FiCalendar /></div>
              <h2 className="mt-4 text-xl font-black text-gray-900">No bookings found</h2>
              <p className="mt-2 text-sm text-gray-500">Search ya filters change karke dobara try karein.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">Booking</th>
                      <th className="px-5 py-4 font-bold">Guest / Host</th>
                      <th className="px-5 py-4 font-bold">Stay Dates</th>
                      <th className="px-5 py-4 font-bold">Status</th>
                      <th className="px-5 py-4 font-bold">Payment</th>
                      <th className="px-5 py-4 text-right font-bold">Amount</th>
                      <th className="px-5 py-4 text-right font-bold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {result.bookings.map((booking) => (
                      <tr key={booking._id} className="transition hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="max-w-64 truncate font-black text-gray-900">{booking.apartment?.title || "Property unavailable"}</p>
                          <p className="mt-1 font-mono text-[11px] text-gray-400">#{booking._id}</p>
                          <p className="mt-1 text-xs text-gray-500">Created {formatDate(booking.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-800">Guest: {booking.guest?.name || "Unknown"}</p>
                          <p className="mt-1 text-xs text-gray-500">Host: {booking.host?.name || "Unknown"}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">{formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}<p className="mt-1 text-xs text-gray-400">{booking.pricing?.totalNights || 0} nights · {booking.guestsCount || 0} guests</p></td>
                        <td className="px-5 py-4"><StatusBadge status={booking.status} /></td>
                        <td className="px-5 py-4"><PaymentBadge status={booking.paymentStatus} /></td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-black text-gray-900">{formatCurrency(booking.pricing?.totalAmount)}</td>
                        <td className="px-5 py-4 text-right"><Link to={`/owner/bookings/${booking._id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"><FiEye /> Details</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 lg:hidden">
                {result.bookings.map((booking) => (
                  <article key={booking._id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><h2 className="font-black text-gray-900">{booking.apartment?.title || "Property unavailable"}</h2><p className="mt-1 font-mono text-[10px] text-gray-400">#{booking._id}</p></div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">
                      <p><strong>Guest:</strong> {booking.guest?.name || "Unknown"}</p>
                      <p><strong>Host:</strong> {booking.host?.name || "Unknown"}</p>
                      <p><strong>Check-in:</strong> {formatDate(booking.checkIn)}</p>
                      <p><strong>Check-out:</strong> {formatDate(booking.checkOut)}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3"><div><PaymentBadge status={booking.paymentStatus} /><p className="mt-2 font-black text-gray-900">{formatCurrency(booking.pricing?.totalAmount)}</p></div><Link to={`/owner/bookings/${booking._id}`} className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white"><FiEye /> View Details</Link></div>
                  </article>
                ))}
              </div>
            </>
          )}

          {!loading && result.bookings.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row">
              <p className="text-xs font-semibold text-gray-500">Page {result.pagination.page} of {result.pagination.totalPages} · {result.pagination.total} matching bookings</p>
              <div className="flex gap-2">
                <button type="button" disabled={!result.pagination.hasPreviousPage} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">Previous</button>
                <button type="button" disabled={!result.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}