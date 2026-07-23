import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import hostService from "../../services/host.service";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactMoney = (value) => {
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

  return image?.url || "https://placehold.co/240x240?text=StayNest";
};

const createChartGeometry = (items, width = 980, height = 330) => {
  const safeItems = Array.isArray(items) && items.length > 0 ? items : [];
  const padding = {
    left: 48,
    right: 24,
    top: 28,
    bottom: 48,
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
    padding,
    chartHeight,
    maximum,
    points,
    linePath,
    areaPath,
  };
};

function MetricCard({ label, value, helper, tone, symbol, delay = 0 }) {
  const styles = {
    rose: {
      card: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50",
      symbol: "bg-rose-100 text-rose-700",
    },
    emerald: {
      card:
        "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50",
      symbol: "bg-emerald-100 text-emerald-700",
    },
    violet: {
      card:
        "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50",
      symbol: "bg-violet-100 text-violet-700",
    },
    slate: {
      card: "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50",
      symbol: "bg-slate-100 text-slate-700",
    },
  };

  const selected = styles[tone] || styles.slate;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -6, scale: 1.015 }}
      className={`relative overflow-hidden rounded-[28px] border p-5 shadow-sm ${selected.card}`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-current opacity-[0.04]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p>
        </div>

        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl shadow-sm ${selected.symbol}`}
        >
          {symbol}
        </span>
      </div>
    </motion.article>
  );
}

function RevenueChart({ items }) {
  const chart = useMemo(() => createChartGeometry(items), [items]);

  if (chart.points.length === 0) {
    return (
      <div className="grid h-[310px] place-items-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 text-center">
        <div>
          <p className="text-base font-black text-slate-800">No revenue data yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Successful guest payments will build this graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-[300px] min-w-[760px] w-full"
        role="img"
        aria-label="Host monthly revenue chart"
      >
        <defs>
          <linearGradient id="revenuePageArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#14b8a6" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="revenuePageLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="52%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#ff385c" />
          </linearGradient>
          <filter id="revenuePageGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="8"
              floodColor="#10b981"
              floodOpacity="0.20"
            />
          </filter>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chart.padding.top + chart.chartHeight * ratio;
          const amount = chart.maximum * (1 - ratio);

          return (
            <g key={ratio}>
              <line
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={y}
                y2={y}
                stroke="#cbd5e1"
                strokeOpacity="0.5"
                strokeDasharray="6 8"
              />
              <text
                x={chart.padding.left - 9}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fontWeight="800"
                fill="#94a3b8"
              >
                {compactMoney(amount)}
              </text>
            </g>
          );
        })}

        <motion.path
          d={chart.areaPath}
          fill="url(#revenuePageArea)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        <motion.path
          d={chart.linePath}
          fill="none"
          stroke="url(#revenuePageLine)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#revenuePageGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        {chart.points.map((point, index) => (
          <g key={point.key || point.month || index}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              r="7"
              fill="#ffffff"
              stroke={index === chart.points.length - 1 ? "#ff385c" : "#10b981"}
              strokeWidth="4"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18 + index * 0.05 }}
            >
              <title>{`${point.month}: ${money(point.value)} · ${Number(
                point.bookings || 0
              )} bookings`}</title>
            </motion.circle>

            <text
              x={point.x}
              y={chart.height - 15}
              textAnchor="middle"
              fontSize="10"
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

function BookingDonut({ statistics }) {
  const entries = useMemo(() => {
    const source = statistics || {};
    const order = ["confirmed", "pending", "completed", "cancelled"];
    const palette = {
      confirmed: "#2563eb",
      pending: "#f59e0b",
      completed: "#10b981",
      cancelled: "#f43f5e",
    };

    return order.map((key) => ({
      key,
      value: Number(source[key] || 0),
      color: palette[key],
    }));
  }, [statistics]);

  const total = entries.reduce((sum, item) => sum + item.value, 0);
  let running = 0;
  const segments = entries.map((item) => {
    const start = total > 0 ? (running / total) * 360 : 0;
    running += item.value;
    const end = total > 0 ? (running / total) * 360 : 0;

    return `${item.color} ${start}deg ${end}deg`;
  });

  const gradient = total > 0 ? `conic-gradient(${segments.join(", ")})` : "#e2e8f0";

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[190px_minmax(0,1fr)]">
      <div className="relative mx-auto h-44 w-44">
        <motion.div
          initial={{ rotate: -100, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="h-full w-full rounded-full"
          style={{ background: gradient }}
        />
        <div className="absolute inset-5 grid place-items-center rounded-full bg-slate-950 text-center shadow-inner">
          <div>
            <p className="text-4xl font-black text-white">{total}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
              Total bookings
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3"
          >
            <span className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-bold capitalize text-white/65">
                {item.key}
              </span>
            </span>
            <strong className="text-lg text-white">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueLoading() {
  return (
    <div className="min-h-screen bg-transparent px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="skeleton-shimmer h-60 rounded-[34px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer h-36 rounded-[28px]" />
          ))}
        </div>
        <div className="skeleton-shimmer h-[430px] rounded-[32px]" />
      </div>
    </div>
  );
}

export default function RevenueManagement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRevenue = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await hostService.getRevenue();

      if (!response?.success) {
        throw new Error(response?.message || "Revenue load failed.");
      }

      setData(response.data || null);

      if (manual) {
        toast.success("Revenue report refreshed.");
      }
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.message ||
        "Revenue load failed.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const overview = data?.overview || {};
  const monthlyRevenue = Array.isArray(data?.monthlyRevenue)
    ? data.monthlyRevenue
    : [];
  const propertyWise = Array.isArray(data?.propertyWise) ? data.propertyWise : [];
  const recentTransactions = Array.isArray(data?.recentTransactions)
    ? data.recentTransactions
    : [];

  const highestMonth = useMemo(() => {
    if (monthlyRevenue.length === 0) {
      return null;
    }

    return monthlyRevenue.reduce((highest, item) =>
      Number(item.revenue || 0) > Number(highest.revenue || 0) ? item : highest
    );
  }, [monthlyRevenue]);

  const averageMonthlyRevenue = useMemo(() => {
    if (monthlyRevenue.length === 0) {
      return 0;
    }

    return (
      monthlyRevenue.reduce(
        (sum, item) => sum + Number(item.revenue || 0),
        0
      ) / monthlyRevenue.length
    );
  }, [monthlyRevenue]);

  const highestPropertyRevenue = Number(propertyWise[0]?.revenue || 0) || 1;

  if (loading) {
    return <RevenueLoading />;
  }

  return (
    <div className="min-h-screen bg-transparent px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[34px] border border-emerald-900/30 bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 p-6 text-white shadow-2xl sm:p-9"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                Revenue management
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Your earning story.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                Only successful Guest booking payments are included. Subscription
                purchases are platform revenue, not Host earnings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/45">
                  Best month
                </p>
                <p className="mt-1 text-sm font-black">
                  {highestMonth?.month || "—"} · {money(highestMonth?.revenue)}
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => loadRevenue(true)}
                disabled={refreshing}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh report"}
              </motion.button>
            </div>
          </div>
        </motion.header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {!data ? (
          <section className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-xl font-black text-slate-900">
              Revenue report unavailable
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Refresh the page after checking the backend connection.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total revenue"
                value={money(overview.totalRevenue)}
                helper="Lifetime successful payments"
                tone="emerald"
                symbol="₹"
                delay={0.02}
              />
              <MetricCard
                label="This month"
                value={money(overview.currentMonthRevenue)}
                helper={`Previous: ${money(overview.previousMonthRevenue)}`}
                tone="rose"
                symbol="↗"
                delay={0.06}
              />
              <MetricCard
                label="Successful bookings"
                value={Number(overview.successfulBookings || 0)}
                helper="Paid guest reservations"
                tone="violet"
                symbol="✓"
                delay={0.1}
              />
              <MetricCard
                label="Monthly growth"
                value={`${Number(overview.monthlyGrowth || 0) >= 0 ? "+" : ""}${Number(
                  overview.monthlyGrowth || 0
                ).toFixed(1)}%`}
                helper={`12-month avg: ${money(averageMonthlyRevenue)}`}
                tone="slate"
                symbol="⌁"
                delay={0.14}
              />
            </section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                    Revenue trend
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Monthly performance
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Last 12 months successful booking earnings.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Current
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {money(overview.currentMonthRevenue)}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      Number(overview.monthlyGrowth || 0) >= 0
                        ? "bg-emerald-50"
                        : "bg-rose-50"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Change
                    </p>
                    <p
                      className={`mt-1 text-lg font-black ${
                        Number(overview.monthlyGrowth || 0) >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {Number(overview.monthlyGrowth || 0) >= 0 ? "+" : ""}
                      {Number(overview.monthlyGrowth || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[28px] border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-2 sm:p-4">
                <RevenueChart items={monthlyRevenue} />
              </div>
            </motion.section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
                      Property performance
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      Property-wise revenue
                    </h2>
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                    {propertyWise.length} properties
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {propertyWise.length > 0 ? (
                    propertyWise.map((property, index) => {
                      const width = Math.max(
                        (Number(property.revenue || 0) / highestPropertyRevenue) * 100,
                        4
                      );
                      const cover =
                        typeof property.cover === "string"
                          ? property.cover
                          : property.cover?.url;

                      return (
                        <motion.div
                          key={property._id || `${property.title}-${index}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.18 + index * 0.04 }}
                          className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={cover || "https://placehold.co/160x160?text=Property"}
                              alt={property.title || "Property"}
                              className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover shadow-sm"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                                <p className="truncate text-sm font-black text-slate-900">
                                  {property.title || "Property"}
                                </p>
                                <p className="shrink-0 text-sm font-black text-emerald-700">
                                  {money(property.revenue)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                {Number(property.bookings || 0)} successful booking
                                {Number(property.bookings || 0) === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${width}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + index * 0.04 }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-[#FF385C]"
                            />
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center">
                      <p className="font-black text-slate-800">
                        No property revenue yet
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Successful payments will appear property-wise.
                      </p>
                    </div>
                  )}
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-5 text-white shadow-xl sm:p-7"
              >
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                    Booking mix
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Booking statistics</h2>
                  <p className="mt-1 text-sm text-white/45">
                    Status distribution across your reservations.
                  </p>

                  <div className="mt-7">
                    <BookingDonut statistics={data.bookingStatistics} />
                  </div>
                </div>
              </motion.section>
            </div>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-7">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF385C]">
                    Payment activity
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Recent transactions
                  </h2>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                  Latest {recentTransactions.length}
                </span>
              </div>

              {recentTransactions.length > 0 ? (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[760px] w-full">
                      <thead className="bg-slate-50 text-left">
                        <tr className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          <th className="px-6 py-4">Property / Guest</th>
                          <th className="px-6 py-4">Paid date</th>
                          <th className="px-6 py-4">Payment ID</th>
                          <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentTransactions.map((transaction) => (
                          <tr key={transaction._id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getImageUrl(transaction.booking?.apartment?.images)}
                                  alt="Property"
                                  className="h-11 w-11 rounded-2xl bg-slate-100 object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="max-w-[260px] truncate text-sm font-black text-slate-900">
                                    {transaction.booking?.apartment?.title || "Property"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {transaction.booking?.guest?.name || "Guest"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                              {formatDate(transaction.paidAt || transaction.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-400">
                              {transaction.razorpayPaymentId || "—"}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-black text-emerald-700">
                              {money(transaction.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 md:hidden">
                    {recentTransactions.map((transaction) => (
                      <article key={transaction._id} className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(transaction.booking?.apartment?.images)}
                            alt="Property"
                            className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900">
                              {transaction.booking?.apartment?.title || "Property"}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {transaction.booking?.guest?.name || "Guest"} · {formatDate(
                                transaction.paidAt || transaction.createdAt
                              )}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-black text-emerald-700">
                            {money(transaction.amount)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-6 py-14 text-center">
                  <p className="font-black text-slate-800">No transactions yet</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Successful booking payments will appear here.
                  </p>
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}