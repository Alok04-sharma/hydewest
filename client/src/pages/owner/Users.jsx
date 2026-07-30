import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUser,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const EMPTY_RESULT = {
  guests: [],
  summary: {
    total: 0,
    active: 0,
    suspended: 0,
    verified: 0,
    unverified: 0,
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Guests" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "unverified", label: "Unverified" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "bookings", label: "Most bookings" },
  { value: "spend", label: "Highest spend" },
];

const number = (value) =>
  new Intl.NumberFormat("en-GB").format(Number(value || 0));

const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const date = (value) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const getAvatar = (guest) => {
  if (typeof guest?.avatar === "string") {
    return guest.avatar;
  }

  return guest?.avatar?.url || "";
};

const getStatusMeta = (guest) => {
  if (!guest?.isVerified) {
    return {
      label: "Unverified",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (["suspended", "blocked"].includes(guest?.status)) {
    return {
      label: "Suspended",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "Active",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
};

function SummaryCard({ title, value, helper, icon: Icon, tone }) {
  return (
    <motion.article
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-55 blur-2xl ${tone}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {number(value)}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {helper}
          </p>
        </div>

        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg ${tone}`}
        >
          <Icon />
        </span>
      </div>
    </motion.article>
  );
}

function GuestRow({ guest }) {
  const avatar = getAvatar(guest);
  const statusMeta = getStatusMeta(guest);
  const bookingStats = guest?.bookingStats || {};

  return (
    <tr className="border-t border-slate-100 transition hover:bg-violet-50/45">
      <td className="px-5 py-4">
        <div className="flex min-w-[220px] items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-sm">
            {avatar ? (
              <img
                src={avatar}
                alt={guest?.name || "Guest"}
                className="h-full w-full object-cover"
              />
            ) : (
              guest?.name?.charAt(0)?.toUpperCase() || "G"
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">
              {guest?.name || "Guest"}
            </p>

            <p className="truncate text-xs font-semibold text-slate-500">
              {guest?.email || "—"}
            </p>

            <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
              {guest?.phone || "No phone added"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="font-black text-slate-950">
          {number(bookingStats.totalBookings)}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
          {number(bookingStats.paidBookings)} paid ·{" "}
          {number(bookingStats.completedBookings)} completed
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="font-black text-slate-950">
          {money(bookingStats.totalSpent)}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
          Paid booking value
        </p>
      </td>

      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
        {date(bookingStats.lastBookingAt)}
      </td>

      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
        {date(guest?.createdAt)}
      </td>

      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
        {date(guest?.lastLoginAt)}
      </td>
    </tr>
  );
}

export default function Users() {
  const [result, setResult] = useState(EMPTY_RESULT);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search input ko debounce karta hai taaki har key press par API call na ho.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  const loadGuests = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await ownerService.getGuests({
          page,
          limit: 10,
          search: debouncedSearch,
          status,
          sortBy,
        });

        setResult(response.data || EMPTY_RESULT);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Guest records could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, page, sortBy, status]
  );

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  const guests = Array.isArray(result?.guests) ? result.guests : [];
  const summary = result?.summary || EMPTY_RESULT.summary;
  const pagination = result?.pagination || EMPTY_RESULT.pagination;

  const summaryCards = useMemo(
    () => [
      {
        title: "Total Guests",
        value: summary.total,
        helper: "Registered Guest accounts",
        Icon: FiUsers,
        tone: "bg-violet-100 text-violet-700",
      },
      {
        title: "Active Guests",
        value: summary.active,
        helper: "Can sign in normally",
        Icon: FiUserCheck,
        tone: "bg-emerald-100 text-emerald-700",
      },
      {
        title: "Verified Guests",
        value: summary.verified,
        helper: "Verified email accounts",
        Icon: FiCheckCircle,
        tone: "bg-blue-100 text-blue-700",
      },
      {
        title: "Suspended",
        value: summary.suspended,
        helper: `${number(summary.unverified)} unverified account(s)`,
        Icon: FiShield,
        tone: "bg-rose-100 text-rose-700",
      },
    ],
    [summary]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0_0,rgba(124,58,237,.09),transparent_30rem),#f8fafc] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-7">
        {/* Total Guests page header */}
        <header className="flex flex-col justify-between gap-5 rounded-[30px] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white shadow-2xl sm:flex-row sm:items-end sm:p-8">
          <div>
            <Link
              to="/owner/dashboard"
              className="inline-flex items-center gap-2 text-xs font-black text-violet-200 transition hover:text-white"
            >
              <FiArrowLeft />
              Dashboard
            </Link>

            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
              Guest management
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Total Guests
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/60">
              Review every registered Guest, their account state, booking
              activity and paid booking value from one page.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadGuests(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* Guest summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ Icon, ...card }) => (
            <SummaryCard key={card.title} {...card} icon={Icon} />
          ))}
        </section>

        {/* Guest search and filters */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, email or phone..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </label>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => loadGuests(true)}
              className="shrink-0 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Guest table */}
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Guest directory
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Showing {number(guests.length)} of {number(pagination.total)}
                {debouncedSearch ? " matching" : ""} Guests.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <FiCalendar /> Page {number(pagination.page)} of{" "}
                {number(pagination.totalPages)}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                <FiUser /> {STATUS_OPTIONS.find((item) => item.value === status)?.label}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-[340px] place-items-center">
              <div className="text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                <p className="mt-4 text-sm font-bold text-slate-500">
                  Loading Guest records...
                </p>
              </div>
            </div>
          ) : guests.length === 0 ? (
            <div className="grid min-h-[340px] place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-100 text-2xl text-violet-700">
                  <FiUsers />
                </span>

                <h3 className="mt-5 text-xl font-black text-slate-950">
                  No Guests found
                </h3>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Try changing the search text or account-status filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-5 py-3.5">Guest</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <FiCalendar /> Bookings
                      </span>
                    </th>
                    <th className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <FiCreditCard /> Paid value
                      </span>
                    </th>
                    <th className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <FiClock /> Last booking
                      </span>
                    </th>
                    <th className="px-5 py-3.5">Joined</th>
                    <th className="px-5 py-3.5">Last login</th>
                  </tr>
                </thead>

                <tbody>
                  {guests.map((guest) => (
                    <GuestRow key={guest._id} guest={guest} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
            <p className="text-xs font-semibold text-slate-500">
              {number(pagination.total)} Guest record(s) in this result.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiChevronLeft />
                Previous
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <FiChevronRight />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
