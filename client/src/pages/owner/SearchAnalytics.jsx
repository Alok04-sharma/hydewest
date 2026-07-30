import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiArrowLeft,
  FiBarChart2,
  FiClock,
  FiCompass,
  FiHome,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiTarget,
  FiUsers,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const RANGE_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

const number = (value) =>
  new Intl.NumberFormat("en-GB").format(Number(value || 0));

const decimal = (value) =>
  new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const dateTime = (value) => {
  if (!value) {
    return "No searches yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const dayLabel = (value) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
};

function SummaryCard({ title, value, helper, icon: Icon, tone }) {
  return (
    <motion.article
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-[26px] border border-violet-200/70 bg-white p-5 shadow-[0_15px_45px_rgba(76,29,149,.08)]"
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-45 blur-2xl ${tone}`}
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

function DemandTrend({ rows }) {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  const maximum = Math.max(
    ...normalizedRows.map((row) => Number(row.searches || 0)),
    1
  );

  if (normalizedRows.length === 0) {
    return (
      <div className="grid min-h-[240px] place-items-center rounded-[24px] border border-dashed border-violet-200 bg-violet-50/45 p-6 text-center">
        <div>
          <FiActivity className="mx-auto text-3xl text-violet-400" />
          <p className="mt-3 font-black text-slate-950">
            No daily search trend yet
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Guest searches will create daily demand bars here.
          </p>
        </div>
      </div>
    );
  }

  const visibleRows = normalizedRows.slice(-30);

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-800 bg-slate-950 p-4 shadow-xl">
      <div className="flex min-w-[720px] items-end gap-2" style={{ height: 250 }}>
        {visibleRows.map((row) => {
          const height = Math.max(
            (Number(row.searches || 0) / maximum) * 190,
            row.searches ? 12 : 3
          );

          return (
            <div
              key={row.date}
              className="group flex min-w-[30px] flex-1 flex-col items-center justify-end"
            >
              <div className="pointer-events-none mb-2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[9px] font-black text-slate-950 opacity-0 shadow-lg transition group-hover:opacity-100">
                {number(row.searches)} searches
              </div>

              <motion.div
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[34px] rounded-t-xl bg-gradient-to-t from-violet-700 via-fuchsia-500 to-rose-300"
              />

              <span className="mt-2 -rotate-45 whitespace-nowrap text-[8px] font-bold text-white/45">
                {dayLabel(row.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemandTable({ title, description, rows, keyName, contextName }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <section className="overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5">
        <h2 className="text-lg font-black text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-xs font-semibold text-slate-500">
          {description}
        </p>
      </div>

      {safeRows.length === 0 ? (
        <div className="grid min-h-[180px] place-items-center p-6 text-center">
          <div>
            <FiMapPin className="mx-auto text-3xl text-violet-300" />
            <p className="mt-3 font-black text-slate-900">
              No tracked data
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              This group will appear after matching Guest searches.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Demand group</th>
                <th className="px-5 py-3">Searches</th>
                <th className="px-5 py-3">Listings</th>
                <th className="px-5 py-3">Paid bookings</th>
                <th className="px-5 py-3">Search identities</th>
                <th className="px-5 py-3">Searches / listing</th>
                <th className="px-5 py-3">Last searched</th>
              </tr>
            </thead>

            <tbody>
              {safeRows.map((row, index) => (
                <tr
                  key={row.key || `${row[keyName]}-${index}`}
                  className="border-t border-slate-100 transition hover:bg-violet-50/45"
                >
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-900">
                      {row[keyName] || "—"}
                    </p>

                    {contextName && row[contextName] && (
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        {row[contextName]}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 font-black text-violet-700">
                    {number(row.searchCount)}
                  </td>

                  <td className="px-5 py-4 font-bold text-slate-700">
                    {number(row.availableListings)}
                  </td>

                  <td className="px-5 py-4 font-bold text-slate-700">
                    {number(row.totalBookings)}
                  </td>

                  <td className="px-5 py-4 font-bold text-slate-700">
                    {number(row.uniqueSearchers)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        Number(row.searchesPerListing || 0) >= 5
                          ? "bg-rose-100 text-rose-700"
                          : Number(row.searchesPerListing || 0) >= 2
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {decimal(row.searchesPerListing)}×
                    </span>
                  </td>

                  <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                    {dateTime(row.lastSearchedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function SearchAnalytics() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await ownerService.getSearchAnalytics({ range });
        setData(response.data || {});
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Search analytics could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range]
  );

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary || {};

  const cards = useMemo(
    () => [
      {
        title: "Total Searches",
        value: summary.totalSearches,
        helper: RANGE_OPTIONS.find((item) => item.value === range)?.label,
        Icon: FiSearch,
        tone: "bg-violet-100 text-violet-700",
      },
      {
        title: "Tracked Groups",
        value: summary.trackedSearchRows,
        helper: "Unique daily search intents",
        Icon: FiBarChart2,
        tone: "bg-fuchsia-100 text-fuchsia-700",
      },
      {
        title: "Logged-in Guests",
        value: summary.loggedInGuests,
        helper: "Distinct authenticated Guests",
        Icon: FiUsers,
        tone: "bg-blue-100 text-blue-700",
      },
      {
        title: "Recommendations",
        value: data?.recommendations?.length || 0,
        helper: "High-demand supply gaps",
        Icon: FiTarget,
        tone: "bg-amber-100 text-amber-800",
      },
    ],
    [data?.recommendations?.length, range, summary]
  );

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          <p className="mt-4 text-sm font-black text-slate-500">
            Calculating search demand...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0_0,rgba(124,58,237,.10),transparent_30rem),#f8fafc] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Search Demand page header */}
        <header className="rounded-[30px] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <Link
                to="/owner/dashboard"
                className="inline-flex items-center gap-2 text-xs font-black text-violet-200 transition hover:text-white"
              >
                <FiArrowLeft />
                Dashboard
              </Link>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
                Search Demand Intelligence
              </p>

              <h1 className="mt-2 text-3xl font-black sm:text-5xl">
                Where Guests want more stays.
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/60">
                Search intent is compared with approved listing supply and paid
                booking activity. City, area, PIN code, state and property-type
                searches are calculated independently.
              </p>
            </div>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Analytics date-range controls */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  range === option.value
                    ? "bg-white text-violet-900 shadow-lg"
                    : "bg-white/[0.08] text-white/65 hover:bg-white/15 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => load(true)} className="underline">
              Retry
            </button>
          </div>
        )}

        {/* Search summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ Icon, ...card }) => (
            <SummaryCard key={card.title} {...card} icon={Icon} />
          ))}
        </section>

        {/* Search activity trend */}
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Daily search activity
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Every bar uses the corrected search count for that calendar day.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
              <FiClock /> Latest: {dateTime(summary.latestSearchAt)}
            </span>
          </div>

          <DemandTrend rows={data?.dailyTrend || []} />
        </section>

        {/* High-demand recommendations */}
        <section className="rounded-[30px] border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-200 text-xl text-amber-900">
              <FiTarget />
            </span>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Supply-gap recommendations
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Locations with high searches but too few approved listings.
              </p>
            </div>
          </div>

          {data?.recommendations?.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.recommendations.map((row) => (
                <article
                  key={`${row.locationType}-${row.key || row.location}`}
                  className="rounded-2xl border border-amber-200 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-slate-950">
                      {row.location || "Unknown location"}
                    </strong>

                    <span className="rounded-full bg-amber-200 px-2 py-1 text-[9px] font-black uppercase text-amber-900">
                      {row.locationType}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-orange-700">
                    High Search Demand — Need More Hosts
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-violet-50 p-2">
                      <p className="text-sm font-black text-violet-700">
                        {number(row.searchCount)}
                      </p>
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        Searches
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-2">
                      <p className="text-sm font-black text-emerald-700">
                        {number(row.availableListings)}
                      </p>
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        Listings
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-2">
                      <p className="text-sm font-black text-blue-700">
                        {number(row.totalBookings)}
                      </p>
                      <p className="text-[8px] font-black uppercase text-slate-400">
                        Bookings
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-white/65 p-5 text-sm font-semibold text-slate-600">
              No location currently crosses the high-demand threshold for this
              date range.
            </div>
          )}
        </section>

        {/* Demand tables */}
        <div className="grid gap-6">
          <DemandTable
            title="Most Searched Cities"
            description="City demand compared with approved city listings and paid bookings."
            rows={data?.mostSearchedCities || []}
            keyName="city"
          />

          <DemandTable
            title="Most Searched Areas"
            description="Area names are grouped with their city so identically named areas do not merge incorrectly."
            rows={data?.mostSearchedAreas || []}
            keyName="area"
            contextName="city"
          />

          <DemandTable
            title="Most Searched PIN Codes"
            description="PIN-code demand uses listing ZIP codes and paid booking locations."
            rows={data?.mostSearchedPinCodes || []}
            keyName="pinCode"
            contextName="city"
          />

          <DemandTable
            title="Most Searched States"
            description="State-level demand for broader destination searches."
            rows={data?.mostSearchedStates || []}
            keyName="state"
          />

          <DemandTable
            title="Most Searched Property Types"
            description="Property-type-only searches now appear even when no city was entered."
            rows={data?.mostSearchedPropertyTypes || []}
            keyName="propertyType"
          />
        </div>

        {/* Tracking information */}
        <section className="grid gap-4 rounded-[28px] border border-violet-200 bg-violet-50 p-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <FiCompass className="text-xl text-violet-700" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                Anonymous groups
              </p>
              <p className="font-black text-slate-950">
                {number(summary.anonymousSearchRows)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FiHome className="text-xl text-violet-700" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                Range
              </p>
              <p className="font-black text-slate-950">
                {RANGE_OPTIONS.find((item) => item.value === range)?.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FiMapPin className="text-xl text-violet-700" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                Generated
              </p>
              <p className="font-black text-slate-950">
                {dateTime(data?.generatedAt)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
