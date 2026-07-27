import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  FiActivity,
  FiArrowDownRight,
  FiArrowUpRight,
  FiCalendar,
  FiDollarSign,
  FiHome,
  FiMapPin,
  FiMinus,
  FiRefreshCw,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const EMPTY_HOT_MAP = {
  cities: [],
  areas: [],
};

const EMPTY_DASHBOARD = {
  overview: {
    totalUsers: 0,
    totalHosts: 0,
    totalGuests: 0,
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    currency: "INR",
  },

  growth: {},

  analytics: {
    monthlyTrend: [],
    userDistribution: {},
    listingStatus: {},
    bookingStatus: {},
  },

  generatedAt: null,
};

const formatNumber = (value) => {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(
    Number(value || 0)
  );
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value || 0)
  );
};

// ======================================
// Growth Badge
// ======================================

function GrowthBadge({
  metric,
}) {
  const percentage =
    Number(
      metric?.percentage || 0
    );

  const positive =
    percentage > 0;

  const negative =
    percentage < 0;

  const badgeStyle =
    positive
      ? "bg-emerald-50 text-emerald-700"
      : negative
        ? "bg-red-50 text-red-700"
        : "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${badgeStyle}`}
    >
      {positive ? (
        <FiArrowUpRight />
      ) : negative ? (
        <FiArrowDownRight />
      ) : (
        <FiMinus />
      )}

      {Math.abs(
        percentage
      ).toFixed(1)}
      %
    </span>
  );
}

// ======================================
// Statistics Card
// ======================================

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  growth,
  accent,
  to,
  onNavigate,
}) {
  const openCard = () => {
    if (to && onNavigate) onNavigate(to);
  };

  return (
    <motion.article
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onClick={openCard}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && to) openCard();
      }}
      role={to ? "link" : undefined}
      tabIndex={to ? 0 : undefined}
      className={`group relative overflow-hidden rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm transition ${to ? "cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-200" : ""}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-violet-100/70 transition duration-300 group-hover:scale-125" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${accent}`}
        >
          <Icon />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <GrowthBadge
          metric={growth}
        />

        <span className="text-right text-xs font-medium text-gray-400">
          {helper}
        </span>
      </div>

      {to && (
        <div className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-violet-500 opacity-0 transition group-hover:opacity-100">
          Open management →
        </div>
      )}
    </motion.article>
  );
}

// ======================================
// Hot Map Card
// ======================================

function HotMapCard({ locations, onNavigate }) {
  const areaRows = Array.isArray(locations?.areas)
    ? locations.areas
    : [];

  const cityRows = Array.isArray(locations?.cities)
    ? locations.cities
    : [];

  const rows = (areaRows.length ? areaRows : cityRows)
    .slice(0, 5)
    .map((row) => ({
      label: row.area
        ? `${row.area}${row.city ? `, ${row.city}` : ""}`
        : row.city || "Unknown location",
      bookingCount: Number(row.bookingCount || 0),
      revenue: Number(row.revenue || 0),
      growth: row.growth,
    }));

  const topLocation = rows[0];
  const maximumBookings = Math.max(
    ...rows.map((row) => row.bookingCount),
    1
  );

  return (
    <motion.article
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.992 }}
      onClick={() => onNavigate("/owner/revenue-analytics#trending-locations")}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onNavigate("/owner/revenue-analytics#trending-locations");
        }
      }}
      role="link"
      tabIndex={0}
      className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-rose-200 bg-gradient-to-br from-rose-950 via-fuchsia-950 to-slate-950 p-5 text-white shadow-[0_20px_65px_rgba(136,19,55,.24)] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 sm:col-span-2 sm:p-6 xl:col-span-3"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl transition duration-500 group-hover:scale-125" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose-100 backdrop-blur">
            <FiMapPin />
            HOT MAP
          </div>

          <p className="mt-4 text-sm font-semibold text-white/60">
            Highest booking concentration
          </p>

          <h2 className="mt-1 line-clamp-2 text-2xl font-black tracking-tight sm:text-3xl">
            {topLocation?.label || "Booking activity will appear here"}
          </h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black backdrop-blur">
              {formatNumber(topLocation?.bookingCount || 0)} bookings
            </span>

            <span className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-amber-200 backdrop-blur">
              {formatCurrency(topLocation?.revenue || 0)} volume
            </span>
          </div>

          <p className="mt-4 text-xs font-semibold text-rose-100/65">
            Click to open location analytics and full ranking.
          </p>
        </div>

        <div className="space-y-3">
          {rows.length ? (
            rows.map((row, index) => {
              const width = Math.max(
                (row.bookingCount / maximumBookings) * 100,
                row.bookingCount ? 8 : 0
              );

              return (
                <div key={`${row.label}-${index}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-bold text-white/80">
                      {index + 1}. {row.label}
                    </span>
                    <span className="shrink-0 font-black text-white">
                      {formatNumber(row.bookingCount)}
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.65, delay: index * 0.06 }}
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-amber-300"
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-sm font-semibold text-white/55">
              Paid booking location data is not available yet.
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ======================================
// Progress Analytics
// ======================================

function ProgressList({
  rows,
  total,
}) {
  const safeTotal =
    Math.max(
      Number(total || 0),
      1
    );

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const value =
          Number(
            row.value || 0
          );

        const width =
          Math.min(
            (value / safeTotal) *
              100,
            100
          );

        return (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-600">
                {row.label}
              </span>

              <span className="font-bold text-gray-900">
                {formatNumber(
                  value
                )}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{
                  width: `${width}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ======================================
// Revenue Bar Chart
// ======================================

function RevenueChart({
  monthlyTrend,
}) {
  const maxRevenue =
    Math.max(
      ...monthlyTrend.map(
        (item) =>
          Number(
            item.revenue || 0
          )
      ),
      1
    );

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex h-64 min-w-[680px] items-end gap-3 pt-7">
        {monthlyTrend.map(
          (item) => {
            const revenue =
              Number(
                item.revenue || 0
              );

            const height =
              revenue === 0
                ? 4
                : Math.max(
                    (revenue /
                      maxRevenue) *
                      100,
                    8
                  );

            return (
              <div
                key={item.key}
                className="flex h-full min-w-11 flex-1 flex-col items-center justify-end"
                title={`${item.label}: ${formatCurrency(
                  revenue
                )}`}
              >
                <span className="mb-2 text-[10px] font-bold text-gray-500">
                  {revenue > 0
                    ? formatNumber(
                        revenue
                      )
                    : "0"}
                </span>

                <div className="flex h-44 w-full items-end rounded-t-xl bg-purple-50 px-1.5">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-purple-700 to-violet-400"
                    style={{
                      height: `${height}%`,
                    }}
                  />
                </div>

                <span className="mt-2 text-[11px] font-semibold text-gray-500">
                  {item.label}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

// ======================================
// Super Admin Dashboard Page
// ======================================

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [
    dashboard,
    setDashboard,
  ] = useState(
    EMPTY_DASHBOARD
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    hotMap,
    setHotMap,
  ] = useState(EMPTY_HOT_MAP);

  // ======================================
  // Fetch Dashboard
  // ======================================

  const fetchDashboard =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        try {
          if (manualRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const [response, revenueAnalyticsResponse] =
            await Promise.all([
              ownerService.getDashboard(),
              ownerService
                .getRevenueAnalytics()
                .catch(() => null),
            ]);

          if (!response.success) {
            throw new Error(
              response.message ||
                "Dashboard load nahi ho saka."
            );
          }

          setDashboard(
            response.data ||
              EMPTY_DASHBOARD
          );

          const analyticsPayload =
            revenueAnalyticsResponse?.data ||
            revenueAnalyticsResponse ||
            {};

          setHotMap(
            analyticsPayload.trendingLocations ||
              EMPTY_HOT_MAP
          );
        } catch (
          requestError
        ) {
          setError(
            requestError
              .response
              ?.data
              ?.message ||
              requestError
                .message ||
              "Super Admin dashboard load nahi ho saka."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const {
    overview,
    growth,
    analytics,
  } = dashboard;

  // ======================================
  // User Distribution
  // ======================================

  const userRows =
    useMemo(
      () => [
        {
          label: "Guests",

          value:
            analytics
              .userDistribution
              ?.guests,

          color:
            "bg-purple-600",
        },

        {
          label: "Hosts",

          value:
            analytics
              .userDistribution
              ?.hosts,

          color:
            "bg-pink-500",
        },

        {
          label:
            "Administrators",

          value:
            analytics
              .userDistribution
              ?.administrators,

          color:
            "bg-gray-700",
        },
      ],
      [
        analytics
          .userDistribution,
      ]
    );

  // ======================================
  // Listing Distribution
  // ======================================

  const listingRows =
    useMemo(
      () => [
        {
          label: "Approved",

          value:
            analytics
              .listingStatus
              ?.approved,

          color:
            "bg-emerald-500",
        },

        {
          label: "Pending",

          value:
            analytics
              .listingStatus
              ?.pending,

          color:
            "bg-amber-500",
        },

        {
          label: "Rejected",

          value:
            analytics
              .listingStatus
              ?.rejected,

          color:
            "bg-red-500",
        },

        {
          label: "Draft",

          value:
            analytics
              .listingStatus
              ?.draft,

          color:
            "bg-blue-500",
        },

        {
          label: "Inactive",

          value:
            analytics
              .listingStatus
              ?.inactive,

          color:
            "bg-gray-500",
        },
      ],
      [
        analytics
          .listingStatus,
      ]
    );

  // ======================================
  // Booking Distribution
  // ======================================

  const bookingRows =
    useMemo(
      () => [
        {
          label:
            "Confirmed",

          value:
            analytics
              .bookingStatus
              ?.confirmed,

          color:
            "bg-emerald-500",
        },

        {
          label: "Pending",

          value:
            analytics
              .bookingStatus
              ?.pending,

          color:
            "bg-amber-500",
        },

        {
          label:
            "Completed",

          value:
            analytics
              .bookingStatus
              ?.completed,

          color:
            "bg-blue-500",
        },

        {
          label:
            "Cancelled",

          value:
            analytics
              .bookingStatus
              ?.cancelled,

          color:
            "bg-red-500",
        },
      ],
      [
        analytics
          .bookingStatus,
      ]
    );

  // ======================================
  // Loading State
  // ======================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />

        <p className="text-sm font-semibold text-gray-500">
          Loading dashboard analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Dashboard Header */}

        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
              <FiActivity />

              Platform Control Center
            </div>

            <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Super Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              hydewest users, hosts, listings, bookings and platform earnings in one operational overview.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchDashboard(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-60"
          >
            <FiRefreshCw
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh Dashboard"}
          </button>
        </header>

        {/* Error Message */}

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                fetchDashboard(
                  true
                )
              }
              className="shrink-0 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics Cards */}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Users"
            value={formatNumber(
              overview.totalUsers
            )}
            helper="New accounts this month"
            icon={FiUsers}
            growth={
              growth.users
            }
            accent="bg-purple-100 text-purple-700"
            to="/owner/hosts"
            onNavigate={navigate}
          />

          <StatCard
            title="Total Hosts"
            value={formatNumber(
              overview.totalHosts
            )}
            helper="New hosts this month"
            icon={FiUserCheck}
            growth={
              growth.hosts
            }
            accent="bg-pink-100 text-pink-700"
            to="/owner/hosts"
            onNavigate={navigate}
          />

          <StatCard
            title="Total Guests"
            value={formatNumber(
              overview.totalGuests
            )}
            helper="New guests this month"
            icon={FiUsers}
            growth={
              growth.guests
            }
            accent="bg-blue-100 text-blue-700"
            to="/owner/bookings"
            onNavigate={navigate}
          />

          <StatCard
            title="Total Listings"
            value={formatNumber(
              overview.totalListings
            )}
            helper="New listings this month"
            icon={FiHome}
            growth={
              growth.listings
            }
            accent="bg-amber-100 text-amber-700"
            to="/owner/listings"
            onNavigate={navigate}
          />

          <StatCard
            title="Total Bookings"
            value={formatNumber(
              overview.totalBookings
            )}
            helper="New bookings this month"
            icon={FiCalendar}
            growth={
              growth.bookings
            }
            accent="bg-emerald-100 text-emerald-700"
            to="/owner/bookings"
            onNavigate={navigate}
          />

          <StatCard
            title="Total Earnings"
            value={formatCurrency(
              overview.totalRevenue
            )}
            helper="Subscriptions + booking commission"
            icon={FiDollarSign}
            growth={
              growth.revenue
            }
            accent="bg-violet-100 text-violet-700"
            to="/owner/revenue-analytics"
            onNavigate={navigate}
          />

          <HotMapCard
            locations={hotMap}
            onNavigate={navigate}
          />
        </section>

        {/* Revenue and User Distribution */}

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2 sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <FiTrendingUp className="text-purple-600" />

                  Monthly Revenue
                  Trend
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Pichhle 12 months
                  ke successful
                  payments.
                </p>
              </div>

              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                Currency:{" "}
                {overview.currency ||
                  "INR"}
              </span>
            </div>

            <RevenueChart
              monthlyTrend={
                analytics.monthlyTrend ||
                []
              }
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-gray-900">
              User Distribution
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Platform accounts ka
              role-wise breakdown.
            </p>

            <div className="mt-6">
              <ProgressList
                rows={userRows}
                total={
                  overview.totalUsers
                }
              />
            </div>
          </div>
        </section>

        {/* Listing and Booking Analytics */}

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-gray-900">
              Listing Analytics
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Property moderation
              aur publishing status.
            </p>

            <div className="mt-6">
              <ProgressList
                rows={listingRows}
                total={
                  overview.totalListings
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-black text-gray-900">
              Booking Analytics
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Booking lifecycle ka
              status breakdown.
            </p>

            <div className="mt-6">
              <ProgressList
                rows={bookingRows}
                total={
                  overview.totalBookings
                }
              />
            </div>
          </div>
        </section>

        {/* Monthly Growth Table */}

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-black text-gray-900">
            Monthly Growth
            Statistics
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Users, listings,
            bookings aur revenue
            ka 12-month comparison.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-3 font-bold">
                    Month
                  </th>

                  <th className="px-3 py-3 font-bold">
                    Users
                  </th>

                  <th className="px-3 py-3 font-bold">
                    Hosts
                  </th>

                  <th className="px-3 py-3 font-bold">
                    Guests
                  </th>

                  <th className="px-3 py-3 font-bold">
                    Listings
                  </th>

                  <th className="px-3 py-3 font-bold">
                    Bookings
                  </th>

                  <th className="px-3 py-3 text-right font-bold">
                    Revenue
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {(
                  analytics.monthlyTrend ||
                  []
                ).map(
                  (month) => (
                    <tr
                      key={
                        month.key
                      }
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-bold text-gray-900">
                        {
                          month.label
                        }
                      </td>

                      <td className="px-3 py-3 text-gray-600">
                        {formatNumber(
                          month.users
                        )}
                      </td>

                      <td className="px-3 py-3 text-gray-600">
                        {formatNumber(
                          month.hosts
                        )}
                      </td>

                      <td className="px-3 py-3 text-gray-600">
                        {formatNumber(
                          month.guests
                        )}
                      </td>

                      <td className="px-3 py-3 text-gray-600">
                        {formatNumber(
                          month.listings
                        )}
                      </td>

                      <td className="px-3 py-3 text-gray-600">
                        {formatNumber(
                          month.bookings
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(
                          month.revenue
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Last Updated */}

        <p className="mt-6 text-center text-xs text-gray-400">
          Last updated:{" "}
          {dashboard.generatedAt
            ? new Date(
                dashboard.generatedAt
              ).toLocaleString(
                "en-IN"
              )
            : "—"}
        </p>
      </div>
    </div>
  );
}