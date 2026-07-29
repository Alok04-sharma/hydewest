import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiPlus,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

import hostService from "../../services/host.service";
import UberRideButton from "../../components/common/UberRideButton";
import subscriptionService from "../../services/subscription.service";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactCurrency = (value) => {
  const amount = Number(value || 0);

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(amount >= 100000000 ? 0 : 1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(amount >= 1000000 ? 0 : 1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}K`;
  }

  return `₹${amount.toLocaleString("en-IN")}`;
};

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

const getImageUrl = (images) => {
  const image = images?.[0];

  if (typeof image === "string") {
    return image;
  }

  return image?.url || "https://placehold.co/300x300?text=StayNest";
};

const createChartGeometry = (items, width = 820, height = 270) => {
  const safeItems = Array.isArray(items) && items.length > 0 ? items : [];
  const padding = {
    left: 34,
    right: 22,
    top: 22,
    bottom: 42,
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(
    ...safeItems.map((item) => Number(item.revenue || 0)),
    1
  );

  const points = safeItems.map((item, index) => {
    const x =
      padding.left +
      (safeItems.length === 1
        ? chartWidth / 2
        : (index / (safeItems.length - 1)) * chartWidth);
    const y =
      padding.top +
      chartHeight -
      (Number(item.revenue || 0) / maximum) * chartHeight;

    return {
      ...item,
      x,
      y,
      value: Number(item.revenue || 0),
    };
  });

  const baseline = padding.top + chartHeight;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${baseline} L ${
        points[0].x
      } ${baseline} Z`
    : "";

  return {
    width,
    height,
    points,
    linePath,
    areaPath,
    baseline,
    maximum,
    padding,
    chartHeight,
  };
};

function RevenueAreaChart({ items }) {
  const chart = useMemo(() => createChartGeometry(items), [items]);

  if (chart.points.length === 0) {
    return (
      <div className="grid h-64 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
        <div>
          <p className="text-sm font-black text-slate-700">
            No revenue data yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Successful booking payments will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-5 overflow-hidden rounded-[24px] border border-[#e3d8bd] bg-gradient-to-b from-[#fffdf8] via-[#fffaf2] to-[#f3f7ff] p-2 sm:p-4">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-[250px] w-full overflow-visible"
        role="img"
        aria-label="Monthly revenue graph"
      >
        <defs>
          <linearGradient id="dashboardRevenueArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff385c" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="dashboardRevenueLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#ff385c" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <filter
            id="dashboardRevenueGlow"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="7"
              stdDeviation="7"
              floodColor="#ff385c"
              floodOpacity="0.20"
            />
          </filter>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chart.padding.top + chart.chartHeight * ratio;
          const labelValue = chart.maximum * (1 - ratio);

          return (
            <g key={ratio}>
              <line
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={y}
                y2={y}
                stroke="#cbd5e1"
                strokeOpacity="0.45"
                strokeDasharray="5 7"
              />
              <text
                x={chart.padding.left - 7}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fontWeight="700"
                fill="#94a3b8"
              >
                {compactCurrency(labelValue)}
              </text>
            </g>
          );
        })}

        <motion.path
          d={chart.areaPath}
          fill="url(#dashboardRevenueArea)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        />

        <motion.path
          d={chart.linePath}
          fill="none"
          stroke="url(#dashboardRevenueLine)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#dashboardRevenueGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />

        {chart.points.map((point, index) => (
          <g key={point.key || point.month || index}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#ffffff"
              stroke="#ff385c"
              strokeWidth="4"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + index * 0.045 }}
            >
              <title>{`${point.month}: ${currency(point.value)}`}</title>
            </motion.circle>

            <text
              x={point.x}
              y={chart.height - 13}
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fill="#64748b"
            >
              {point.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatCard({ title, value, helper, icon: Icon, style, to, onNavigate }) {
  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onClick={() => to && onNavigate(to)}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && to) {
          onNavigate(to);
        }
      }}
      role={to ? "link" : undefined}
      tabIndex={to ? 0 : undefined}
      className="group relative flex min-h-[154px] cursor-pointer flex-col overflow-hidden rounded-[24px] border border-[#d9caa5] bg-gradient-to-br from-[#fffdf7] via-[#fffaf0] to-[#eef4ff] p-4 shadow-[0_16px_40px_rgba(62,48,24,0.10)] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 sm:p-5"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-amber-200/45 transition duration-300 group-hover:scale-125" />

      <div className="relative flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="min-h-10 text-xs font-black uppercase leading-5 tracking-[0.08em] text-slate-600">
            {title}
          </p>
          <p className="mt-1 break-words text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-[1.7rem]">
            {value}
          </p>
          <p className="mt-2 min-h-8 text-[11px] font-semibold leading-4 text-slate-500">
            {helper}
          </p>
        </div>

        <motion.div
          whileHover={{ rotate: 7, scale: 1.08 }}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${style}`}
        >
          <Icon aria-hidden="true" />
        </motion.div>
      </div>

      <div className="relative mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100">
        Open details →
      </div>
    </motion.article>
  );
}

export default function HostDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [dashboardResponse, subscriptionResponse] = await Promise.all([
        hostService.getDashboard(),
        subscriptionService.getMySubscription(),
      ]);

      if (!dashboardResponse?.success) {
        throw new Error(
          dashboardResponse?.message || "The dashboard could not be loaded."
        );
      }

      setDashboard(dashboardResponse.data || null);
      setSubscription(subscriptionResponse?.data || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "An error occurred while loading the Host dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overview = dashboard?.overview || {};
  const monthlyRevenue = Array.isArray(dashboard?.monthlyRevenue)
    ? dashboard.monthlyRevenue
    : [];

  const subscriptionSummary = subscription?.summary || subscription || {};
  const activeSubscription =
    subscriptionSummary.activeSubscription ||
    subscription?.activeSubscription ||
    subscription?.latestSubscription ||
    subscription?.subscription ||
    null;
  const hasActiveSubscription = Boolean(
    subscriptionSummary.isActive ?? activeSubscription?.status === "active"
  );

  const currentMonthRevenue = Number(
    monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0
  );
  const previousMonthRevenue = Number(
    monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0
  );
  const highestMonth = useMemo(() => {
    if (monthlyRevenue.length === 0) {
      return null;
    }

    return monthlyRevenue.reduce((highest, item) =>
      Number(item.revenue || 0) > Number(highest.revenue || 0) ? item : highest
    );
  }, [monthlyRevenue]);

  const revenueGrowth = useMemo(() => {
    if (previousMonthRevenue === 0) {
      return currentMonthRevenue > 0 ? 100 : 0;
    }

    return (
      ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) *
      100
    );
  }, [currentMonthRevenue, previousMonthRevenue]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF385C]">
              Host performance
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Listings, bookings and earnings ka complete live overview.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <UberRideButton compact />
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-100 disabled:opacity-50 sm:flex-none"
            >
              <FiRefreshCw
                aria-hidden="true"
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              to={
                hasActiveSubscription
                  ? "/host/add-listing"
                  : "/host/subscription/plans"
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF385C] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#E31C5F] sm:flex-none"
            >
              <FiPlus aria-hidden="true" />
              {hasActiveSubscription ? "Add property" : "Activate plan"}
            </Link>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
          </div>
        ) : (
          <>
            <section
              className={`mt-7 overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-6 ${
                hasActiveSubscription
                  ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50"
                  : "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
              }`}
            >
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${
                      hasActiveSubscription
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    <FiCreditCard aria-hidden="true" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-slate-950">
                        Host subscription
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          hasActiveSubscription
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {hasActiveSubscription ? "ACTIVE" : "ACTION REQUIRED"}
                      </span>
                    </div>

                    <p
                      className={`mt-2 text-sm font-semibold leading-6 ${
                        hasActiveSubscription
                          ? "text-emerald-950/80"
                          : "text-amber-950/80"
                      }`}
                    >
                      {hasActiveSubscription
                        ? `${
                            activeSubscription?.planName || "Host plan"
                          } is active. You can create and edit listings.`
                        : "Activate a Host subscription to continue creating and editing listings."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-950 to-slate-900 p-4 text-white shadow-lg">
                    <FiClock aria-hidden="true" className="text-emerald-300" />
                    <p className="mt-2 text-xl font-black text-white">
                      {subscriptionSummary.remainingDays || 0}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-100/70">
                      Days left
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-950 to-slate-900 p-4 text-white shadow-lg">
                    <FiCalendar aria-hidden="true" className="text-cyan-300" />
                    <p className="mt-2 text-xs font-black text-white">
                      {formatDate(activeSubscription?.expiryDate)}
                    </p>
                    <p className="text-[11px] font-semibold text-cyan-100/70">
                      Expiry
                    </p>
                  </div>

                  <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-950 to-slate-900 p-4 text-white shadow-lg">
                    <FiCreditCard
                      aria-hidden="true"
                      className="text-violet-300"
                    />
                    <p className="mt-2 text-xs font-black text-white">
                      {formatDate(
                        subscriptionSummary.nextRenewalDate ||
                          activeSubscription?.nextRenewalDate
                      )}
                    </p>
                    <p className="text-[11px] font-semibold text-violet-100/70">
                      Renewal
                    </p>
                  </div>

                  <Link
                    to="/host/subscription/plans"
                    className="flex flex-col justify-center rounded-2xl border border-rose-300/25 bg-gradient-to-br from-rose-950 to-slate-900 p-4 text-white shadow-lg hover:-translate-y-1 hover:border-rose-300/60"
                  >
                    <p className="text-sm font-black">
                      {hasActiveSubscription ? "Renew plan" : "Buy plan"}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-100/65">
                      View durations
                    </p>
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
              <StatCard
                title="Total listings"
                value={overview.totalListings || 0}
                helper="Non-deleted properties"
                icon={FiHome}
                style="bg-purple-100 text-purple-700"
                to="/host/listings"
                onNavigate={navigate}
              />
              <StatCard
                title="Active listings"
                value={overview.activeListings || 0}
                helper="Approved and visible"
                icon={FiCheckCircle}
                style="bg-emerald-100 text-emerald-700"
                to="/host/listings"
                onNavigate={navigate}
              />
              <StatCard
                title="Pending listings"
                value={overview.pendingListings || 0}
                helper="Waiting for review"
                icon={FiClock}
                style="bg-amber-100 text-amber-700"
                to="/host/listings"
                onNavigate={navigate}
              />
              <StatCard
                title="Suspended"
                value={overview.suspendedListings || 0}
                helper="Admin action required"
                icon={FiXCircle}
                style="bg-red-100 text-red-700"
                to="/host/listings"
                onNavigate={navigate}
              />
              <StatCard
                title="Total bookings"
                value={overview.totalBookings || 0}
                helper="All reservations"
                icon={FiUsers}
                style="bg-blue-100 text-blue-700"
                to="/host/bookings"
                onNavigate={navigate}
              />
              <StatCard
                title="Booking cancellations"
                value={overview.cancelledBookings || 0}
                helper="Cancelled reservations"
                icon={FiXCircle}
                style="bg-orange-100 text-orange-700"
                to="/host/bookings?tab=cancelled"
                onNavigate={navigate}
              />
              <StatCard
                title="Total earnings"
                value={currency(overview.totalEarnings)}
                helper="Successful payments"
                icon={FiDollarSign}
                style="bg-violet-100 text-violet-700"
                to="/host/revenue"
                onNavigate={navigate}
              />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.55fr)]">
              <motion.article
                whileHover={{ y: -4 }}
                onClick={() => navigate("/host/revenue")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    navigate("/host/revenue");
                  }
                }}
                role="link"
                tabIndex={0}
                className="group cursor-pointer overflow-hidden rounded-[32px] border border-[#d9caa5] bg-gradient-to-br from-[#fffdf8] via-[#fffaf0] to-[#eef4ff] p-5 shadow-[0_20px_55px_rgba(62,48,24,0.12)] outline-none focus-visible:ring-4 focus-visible:ring-amber-200 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                        <FiBarChart2 aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-xl font-black text-gray-950">
                          Revenue momentum
                        </h2>
                        <p className="text-xs font-semibold text-slate-600">
                          Last 12 months · click for complete analytics
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-[#e8dcc1] bg-[#fffdf8] px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        This month
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-950">
                        {currency(currentMonthRevenue)}
                      </p>
                    </div>
                    <div
                      className={`rounded-2xl border px-3 py-2.5 ${
                        revenueGrowth >= 0
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Growth
                      </p>
                      <p
                        className={`mt-1 text-lg font-black ${
                          revenueGrowth >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {revenueGrowth >= 0 ? "+" : ""}
                        {revenueGrowth.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <RevenueAreaChart items={monthlyRevenue} />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
                      Best month
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {highestMonth?.month || "—"} ·{" "}
                      {currency(highestMonth?.revenue)}
                    </p>
                  </div>
                  <span className="text-xs font-black text-rose-300 transition group-hover:translate-x-1">
                    Open revenue page →
                  </span>
                </div>
              </motion.article>

              <motion.article
                whileHover={{ y: -4 }}
                className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6 text-white shadow-xl"
              >
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl text-emerald-400">
                    <FiTrendingUp aria-hidden="true" />
                  </span>
                  <p className="mt-6 text-sm font-bold text-white/55">
                    Revenue growth
                  </p>
                  <p
                    className={`mt-2 text-5xl font-black tracking-tight ${
                      revenueGrowth >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {revenueGrowth >= 0 ? "+" : ""}
                    {revenueGrowth.toFixed(1)}%
                  </p>
                  <p className="mt-3 text-xs leading-5 text-white/45">
                    Current month compared with previous month successful
                    booking payments.
                  </p>

                  <div className="mt-8 rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <FiDollarSign
                      aria-hidden="true"
                      className="text-xl text-rose-300"
                    />
                    <p className="mt-3 text-2xl font-black">
                      {currency(overview.totalEarnings)}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      Lifetime host earnings
                    </p>
                  </div>

                  <Link
                    to="/host/revenue"
                    className="mt-4 flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-rose-100"
                  >
                    View detailed report
                  </Link>
                </div>
              </motion.article>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="overflow-hidden rounded-3xl border border-[#d9caa5] bg-gradient-to-br from-[#fffdf8] to-[#f3f7ff] shadow-[0_18px_48px_rgba(62,48,24,0.10)]">
                <div className="flex items-center justify-between border-b border-[#e7dcc4] bg-[#fffaf0]/80 p-5">
                  <div>
                    <h2 className="text-lg font-black text-gray-950">
                      Recent properties
                    </h2>
                    <p className="text-xs text-gray-500">
                      Latest listing activity
                    </p>
                  </div>
                  <Link
                    to="/host/listings"
                    className="text-sm font-black text-[#FF385C]"
                  >
                    View all
                  </Link>
                </div>

                <div className="divide-y divide-[#e7dcc4]">
                  {(dashboard?.recentListings || []).length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">
                      No listings yet.
                    </p>
                  ) : (
                    dashboard.recentListings.map((listing) => (
                      <Link
                        to={`/host/edit-listing/${listing._id}`}
                        key={listing._id}
                        className="flex items-center gap-4 p-4 transition hover:bg-amber-50/70"
                      >
                        <img
                          src={getImageUrl(listing.images)}
                          alt={listing.title}
                          className="h-14 w-14 shrink-0 rounded-2xl bg-gray-100 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-gray-950">
                            {listing.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {listing.location?.city || "Location"} • ₹
                            {Number(
                              listing.pricing?.basePrice ||
                                listing.pricing?.pricePerNight ||
                                0
                            ).toLocaleString("en-IN")}{" "}
                            / {listing.pricing?.priceUnit || "night"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${
                            listing.status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : listing.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {listing.status}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-[#d9caa5] bg-gradient-to-br from-[#fffdf8] to-[#f3f7ff] shadow-[0_18px_48px_rgba(62,48,24,0.10)]">
                <div className="flex items-center justify-between border-b border-[#e7dcc4] bg-[#fffaf0]/80 p-5">
                  <div>
                    <h2 className="text-lg font-black text-gray-950">
                      Recent bookings
                    </h2>
                    <p className="text-xs text-gray-500">
                      Latest guest reservations
                    </p>
                  </div>
                  <Link
                    to="/host/bookings"
                    className="text-sm font-black text-[#FF385C]"
                  >
                    View all
                  </Link>
                </div>

                <div className="divide-y divide-[#e7dcc4]">
                  {(dashboard?.recentBookings || []).length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">
                      No bookings yet.
                    </p>
                  ) : (
                    dashboard.recentBookings.map((booking) => (
                      <Link
                        to={`/host/bookings/${booking._id}`}
                        key={booking._id}
                        className="flex items-center gap-4 p-4 transition hover:bg-amber-50/70"
                      >
                        <img
                          src={getImageUrl(booking.apartment?.images)}
                          alt="Property"
                          className="h-14 w-14 shrink-0 rounded-2xl bg-gray-100 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-gray-950">
                            {booking.apartment?.title || "Property"}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {booking.guest?.name ||
                              booking.guest?.email ||
                              "Guest"}{" "}
                            • {formatDate(booking.checkIn)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-black text-gray-950">
                            {currency(booking.pricing?.totalAmount)}
                          </p>
                          <p className="text-xs capitalize text-gray-500">
                            {booking.status}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
