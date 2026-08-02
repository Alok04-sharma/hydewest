import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCalendar,
  FiDollarSign,
  FiMapPin,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

const PERIOD_META = {
  daily: "Last 30 days",
  weekly: "Last 16 weeks",
  monthly: "Last 12 months",
  yearly: "Last 5 years",
};

const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactMoney = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const number = (value) =>
  new Intl.NumberFormat("en-GB").format(Number(value || 0));

// Mobile-only cue for horizontally scrollable revenue content.
function MobileScrollHint({ dark = false }) {
  return (
    <div
      className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-[11px] font-black md:hidden ${
        dark
          ? "border-white/15 bg-white/10 text-white/80"
          : "border-blue-200 bg-blue-50 text-blue-900"
      }`}
    >
      <span>Swipe left or right to view more</span>
      <span
        aria-hidden="true"
        className="shrink-0 text-base tracking-[0.18em]"
      >
        &larr;&rarr;
      </span>
    </div>
  );
}

function MetricCard({ title, value, helper, icon: Icon, tone }) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.012 }}
      className="relative overflow-hidden rounded-[28px] border border-violet-200/70 bg-white/90 p-5 shadow-[0_18px_55px_rgba(76,29,149,.10)] backdrop-blur"
    >
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full ${tone} opacity-40 blur-2xl`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {helper}
          </p>
        </div>

        <span
          className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${tone}`}
        >
          <Icon />
        </span>
      </div>
    </motion.article>
  );
}

function RevenueTrendChart({ rows, period }) {
  const normalizedRows = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [
        {
          label: "No data",
          subscriptionRevenue: 0,
          guestCommissionRevenue: 0,
          total: 0,
        },
      ];
    }

    return rows.map((row) => ({
      key: row.key || row.label || "—",
      label: row.label || "—",
      fullLabel: row.fullLabel || row.label || "—",
      subscriptionRevenue: Number(row.subscriptionRevenue || 0),
      guestCommissionRevenue: Number(row.guestCommissionRevenue || 0),
      total: Number(
        row.total ||
          Number(row.subscriptionRevenue || 0) +
            Number(row.guestCommissionRevenue || 0)
      ),
    }));
  }, [rows]);

  const [activeIndex, setActiveIndex] = useState(
    Math.max(normalizedRows.length - 1, 0)
  );

  const rowSignature = useMemo(
    () => normalizedRows.map((row) => `${row.key}:${row.total}`).join("|"),
    [normalizedRows]
  );

  // Period ya graph data change hote hi latest calendar bucket select hota hai.
  useEffect(() => {
    setActiveIndex(Math.max(normalizedRows.length - 1, 0));
  }, [period, rowSignature, normalizedRows.length]);

  const activeRow =
    normalizedRows[Math.min(activeIndex, normalizedRows.length - 1)] ||
    normalizedRows[0];

  const width = Math.max(920, normalizedRows.length * 92);
  const height = 350;
  const padding = {
    top: 30,
    right: 28,
    bottom: 62,
    left: 80,
  };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maximumValue = Math.max(
    ...normalizedRows.map((row) => row.total),
    1
  );

  const yForValue = (value) =>
    padding.top +
    plotHeight -
    (Number(value || 0) / maximumValue) * plotHeight;

  const groupWidth = plotWidth / Math.max(normalizedRows.length, 1);
  const barWidth = Math.min(18, groupWidth * 0.24);

  const points = normalizedRows.map((row, index) => ({
    ...row,
    x: padding.left + groupWidth * index + groupWidth / 2,
    y: yForValue(row.total),
  }));

  const totalLine = points.map((point) => `${point.x},${point.y}`).join(" ");
  const tickRatios = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-500">
            Selected period
          </p>
          <p className="mt-1 text-lg font-black text-slate-950">
            {activeRow.fullLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Total {money(activeRow.total)}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500">
            <span className="h-3 w-3 rounded-sm bg-violet-500" />
            Host subscriptions
          </div>
          <p className="mt-2 text-xl font-black text-slate-950">
            {money(activeRow.subscriptionRevenue)}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500">
            <span className="h-3 w-3 rounded-sm bg-amber-400" />
            Guest commission
          </div>
          <p className="mt-2 text-xl font-black text-slate-950">
            {money(activeRow.guestCommissionRevenue)}
          </p>
        </div>
      </div>

      <div className="relative rounded-[26px] border border-slate-800 bg-slate-950 p-3 shadow-[0_24px_70px_rgba(15,23,42,.20)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-black text-white">Revenue source comparison</p>
            <p className="mt-1 text-xs font-semibold text-white/45">
              Bars show each revenue source. The blue line shows the combined total.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] font-bold text-white/65">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
              Subscriptions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
              Commission
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-sky-300" />
              Total
            </span>
          </div>
        </div>

        <MobileScrollHint dark />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-3 top-40 z-10 w-10 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent md:hidden"
        />

        <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[760px]"
          role="img"
          aria-label={`Revenue trend for ${PERIOD_META[period]}`}
        >
          <defs>
            <linearGradient id="subscriptionBars" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="commissionBars" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {tickRatios.map((ratio) => {
            const value = maximumValue * ratio;
            const y = yForValue(value);

            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,.09)"
                  strokeDasharray={ratio === 0 ? "0" : "5 7"}
                />
                <text
                  x={padding.left - 14}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,.45)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {compactMoney(value)}
                </text>
              </g>
            );
          })}

          {normalizedRows.map((row, index) => {
            const centreX =
              padding.left + groupWidth * index + groupWidth / 2;
            const subscriptionY = yForValue(row.subscriptionRevenue);
            const commissionY = yForValue(row.guestCommissionRevenue);
            const subscriptionHeight =
              padding.top + plotHeight - subscriptionY;
            const commissionHeight = padding.top + plotHeight - commissionY;
            const isActive = index === activeIndex;

            return (
              <g
                key={`${row.key}-${index}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                tabIndex={0}
                className="cursor-pointer outline-none"
              >
                {isActive && (
                  <rect
                    x={padding.left + groupWidth * index + 4}
                    y={padding.top}
                    width={Math.max(groupWidth - 8, 20)}
                    height={plotHeight}
                    rx="14"
                    fill="rgba(125,211,252,.07)"
                    stroke="rgba(125,211,252,.18)"
                  />
                )}

                <motion.rect
                  initial={{ height: 0, y: padding.top + plotHeight }}
                  animate={{ height: subscriptionHeight, y: subscriptionY }}
                  transition={{ duration: 0.55, delay: index * 0.025 }}
                  x={centreX - barWidth - 3}
                  width={barWidth}
                  rx="5"
                  fill="url(#subscriptionBars)"
                />

                <motion.rect
                  initial={{ height: 0, y: padding.top + plotHeight }}
                  animate={{ height: commissionHeight, y: commissionY }}
                  transition={{ duration: 0.55, delay: index * 0.025 + 0.05 }}
                  x={centreX + 3}
                  width={barWidth}
                  rx="5"
                  fill="url(#commissionBars)"
                />

                <rect
                  x={padding.left + groupWidth * index}
                  y={padding.top}
                  width={groupWidth}
                  height={plotHeight + 34}
                  fill="transparent"
                >
                  <title>
                    {`${row.label}: subscriptions ${money(
                      row.subscriptionRevenue
                    )}, commission ${money(
                      row.guestCommissionRevenue
                    )}, total ${money(row.total)}`}
                  </title>
                </rect>

                {(normalizedRows.length <= 12 ||
                  index === 0 ||
                  index === normalizedRows.length - 1 ||
                  index % Math.ceil(normalizedRows.length / 10) === 0) && (
                  <text
                    x={centreX}
                    y={height - 22}
                    textAnchor="middle"
                    fill={isActive ? "#ffffff" : "rgba(255,255,255,.46)"}
                    fontSize="11"
                    fontWeight={isActive ? "800" : "600"}
                  >
                    {row.label}
                  </text>
                )}
              </g>
            );
          })}

          <motion.polyline
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.85 }}
            points={totalLine}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <circle
              key={`${point.key}-total`}
              cx={point.x}
              cy={point.y}
              r={index === activeIndex ? 6.5 : 4.5}
              fill={index === activeIndex ? "#ffffff" : "#7dd3fc"}
              stroke="#0f172a"
              strokeWidth="3"
              onMouseEnter={() => setActiveIndex(index)}
            />
          ))}
        </svg>
        </div>
      </div>
    </div>
  );
}

export default function AdminRevenueAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await ownerService.getRevenueAnalytics();
      setData(response.data || response);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Revenue analytics could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overview = data?.overview || {};
  const graphRows = data?.graphs?.[period] || [];

  const sources = useMemo(() => {
    const total = Math.max(Number(overview.totalRevenue || 0), 1);

    return [
      {
        label: "Host subscriptions",
        amount: Number(overview.subscriptionRevenue || 0),
        color: "bg-violet-500",
      },
      {
        label: "Guest booking commission",
        amount: Number(overview.guestCommissionRevenue || 0),
        color: "bg-amber-500",
      },
    ].map((row) => ({
      ...row,
      percentage: (row.amount / total) * 100,
    }));
  }, [overview]);

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0_0,rgba(124,58,237,.10),transparent_30rem),#f8fafc] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 rounded-[30px] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white shadow-2xl sm:flex-row sm:items-end sm:p-8">
          <div>
            <button
              type="button"
              onClick={() => navigate("/owner/dashboard")}
              className="inline-flex items-center gap-2 text-xs font-black text-violet-200"
            >
              <FiArrowLeft />
              Dashboard
            </button>

            <p className="mt-5 text-xs font-black uppercase tracking-[.22em] text-amber-300">
              Financial control centre
            </p>

            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Total Earnings Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Host subscription income and the platform share of paid guest
              bookings, with location and Host performance analytics.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black backdrop-blur hover:bg-white/15"
          >
            <FiRefreshCw />
            Refresh
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total earnings"
            value={money(overview.totalRevenue)}
            helper="All recorded platform revenue"
            icon={FiDollarSign}
            tone="bg-violet-100 text-violet-700"
          />
          <MetricCard
            title="Subscription revenue"
            value={money(overview.subscriptionRevenue)}
            helper="Successful Host plans"
            icon={FiCalendar}
            tone="bg-blue-100 text-blue-700"
          />
          <MetricCard
            title="Guest commission"
            value={money(overview.guestCommissionRevenue)}
            helper="30% Free / 10% subscribed share"
            icon={FiTrendingUp}
            tone="bg-amber-100 text-amber-700"
          />
          <MetricCard
            title="Monthly growth"
            value={`${Number(overview.growth || 0).toFixed(1)}%`}
            helper={`${money(overview.currentMonthRevenue)} this month`}
            icon={FiBarChart2}
            tone="bg-emerald-100 text-emerald-700"
          />
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white/90 p-4 shadow-xl sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Revenue trend
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {PERIOD_META[period]}. Compare subscription income, booking
                commission and the combined total.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-xl px-3 py-2 text-xs font-black capitalize ${
                    period === item
                      ? "bg-violet-700 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <RevenueTrendChart
            key={period}
            rows={graphRows}
            period={period}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-lg md:p-5">
            <h2 className="font-black text-slate-950">
              Revenue source breakdown
            </h2>

            <div className="mt-5 space-y-4 md:space-y-5">
              {sources.map((row) => (
                <div
                  key={row.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0"
                >
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 font-bold leading-5 text-slate-600">
                      {row.label}
                    </span>
                    <strong className="shrink-0 text-right text-base text-slate-950 md:text-sm">
                      {money(row.amount)}
                    </strong>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 md:mt-2 md:bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.percentage}%` }}
                      className={`h-full rounded-full ${row.color}`}
                    />
                  </div>

                  <div className="mt-2 flex justify-end md:mt-1">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm md:bg-transparent md:p-0 md:text-slate-400 md:shadow-none">
                      {row.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-lg md:p-5 xl:col-span-2">
            <div className="flex items-center gap-2">
              <FiUsers className="text-violet-600" />
              <h2 className="font-black text-slate-950">Top earning Hosts</h2>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {(data?.topEarningHosts || []).map((host, index) => (
                <article
                  key={host.hostId}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Host #{index + 1}
                      </p>
                      <p className="mt-1 truncate font-black text-slate-900">
                        {host.name || "Host"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                      {number(host.bookings)} bookings
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                        Host earnings
                      </p>
                      <p className="mt-1 break-words text-sm font-black text-slate-900">
                        {money(host.hostEarnings)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-[9px] font-black uppercase tracking-wide text-red-500">
                        Admin commission
                      </p>
                      <p className="mt-1 break-words text-sm font-black text-red-700">
                        {money(host.adminCommission)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              {(data?.topEarningHosts || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">
                  No Host earnings data available.
                </div>
              )}
            </div>

            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-400">
                    <th className="py-3">Host</th>
                    <th>Bookings</th>
                    <th>Host earnings</th>
                    <th>Admin commission</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topEarningHosts || []).map((host) => (
                    <tr key={host.hostId} className="border-t border-slate-100">
                      <td className="py-3 font-black text-slate-800">
                        {host.name || "Host"}
                      </td>
                      <td>{number(host.bookings)}</td>
                      <td>{money(host.hostEarnings)}</td>
                      <td className="font-black text-violet-700">
                        {money(host.adminCommission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section
          id="trending-locations"
          className="grid scroll-mt-8 gap-6 xl:grid-cols-2"
        >
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-center gap-2">
              <FiMapPin className="text-rose-600" />
              <h2 className="font-black">Top booked cities</h2>
            </div>

            <div className="mt-4 space-y-3">
              {(data?.topBookedCities || []).map((city, index) => (
                <div
                  key={city.city}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-black text-slate-900">
                      #{index + 1} {city.city}
                    </p>
                    <p className="text-xs text-slate-500">
                      {number(city.bookingCount)} paid bookings
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{money(city.revenue)}</p>
                    <p className="text-[10px] font-bold text-violet-600">
                      Admin {money(city.adminRevenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-center gap-2">
              <FiTrendingUp className="text-emerald-600" />
              <h2 className="font-black">Trending locations</h2>
            </div>

            <div className="mt-4 space-y-3">
              {(data?.trendingLocations?.cities || []).map((city) => (
                <div
                  key={city.city}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-slate-100 p-4"
                >
                  <div>
                    <p className="font-black">{city.city}</p>
                    <p className="text-xs text-slate-500">
                      {number(city.bookingCount)} bookings · {money(city.revenue)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-black ${
                      Number(city.growth) >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {Number(city.growth) >= 0 ? "+" : ""}
                    {Number(city.growth || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}