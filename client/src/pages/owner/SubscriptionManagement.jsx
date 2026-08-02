import React, { useCallback, useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiRefreshCw,
  FiSearch,
  FiShield,
} from "react-icons/fi";
import ownerService from "../../services/owner.service";

const EMPTY_RESULT = {
  subscriptions: [],
  summary: {
    total: 0,
    active: 0,
    scheduled: 0,
    pending: 0,
    expired: 0,
    failed: 0,
    totalRevenue: 0,
    currency: "INR",
  },
  pagination: {
    page: 1,
    totalPages: 1,
    total: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const badgeClass = (status) => {
  if (status === "active" || status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "expired" || status === "failed") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

// Mobile-only cue for the horizontally scrollable subscription table.
function MobileScrollHint() {
  return (
    <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-900 md:hidden">
      <span>Swipe left or right to view all columns</span>
      <span
        aria-hidden="true"
        className="shrink-0 text-base tracking-[0.18em]"
      >
        &larr;&rarr;
      </span>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, style }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${style}`}>
          <Icon />
        </div>
      </div>
    </article>
  );
}

export default function SubscriptionManagement() {
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [result, setResult] = useState(EMPTY_RESULT);
  const [payments, setPayments] = useState([]);
  const [paymentPagination, setPaymentPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [planCode, setPlanCode] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (activeTab === "subscriptions") {
        const response = await ownerService.getSubscriptions({
          page,
          limit: 10,
          search,
          status,
          planCode,
          sortBy: "newest",
        });
        setResult(response.data || EMPTY_RESULT);
      } else {
        const response = await ownerService.getSubscriptionPayments({
          page,
          limit: 10,
          search,
          status,
        });
        setPayments(response.data?.payments || []);
        setPaymentPagination(response.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Subscription records could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, planCode, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const pagination = activeTab === "subscriptions" ? result.pagination : paymentPagination;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
              <FiShield /> Super Admin Module
            </div>
            <h1 className="mt-3 text-3xl font-black text-gray-900 sm:text-4xl">
              Host Subscription Management
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Monitor active, scheduled, pending, and expired subscriptions together with payment history.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
          >
            <FiRefreshCw /> Refresh
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Records" value={result.summary.total || 0} icon={FiCreditCard} style="bg-purple-100 text-purple-700" />
          <SummaryCard title="Active" value={result.summary.active || 0} icon={FiShield} style="bg-emerald-100 text-emerald-700" />
          <SummaryCard title="Expired" value={result.summary.expired || 0} icon={FiClock} style="bg-red-100 text-red-700" />
          <SummaryCard title="Subscription Revenue" value={formatCurrency(result.summary.totalRevenue)} icon={FiDollarSign} style="bg-violet-100 text-violet-700" />
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab("subscriptions"); setStatus("all"); setPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${activeTab === "subscriptions" ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                Subscription Records
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("payments"); setStatus("all"); setPage(1); }}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${activeTab === "payments" ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                Payment History
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search host, plan, order or payment ID..."
                  className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <select
                value={status}
                onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold"
              >
                <option value="all">All Status</option>
                {activeTab === "subscriptions" ? (
                  <>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                    <option value="failed">Failed</option>
                  </>
                ) : (
                  <>
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </>
                )}
              </select>

              {activeTab === "subscriptions" && (
                <select
                  value={planCode}
                  onChange={(event) => { setPlanCode(event.target.value); setPage(1); }}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold"
                >
                  <option value="all">All Plans</option>
                  <option value="1_month">1 Month</option>
                  <option value="3_months">3 Months</option>
                  <option value="6_months">6 Months</option>
                  <option value="12_months">12 Months</option>
                </select>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            </div>
          ) : (
            <div className="relative">
              {activeTab === "subscriptions" && <MobileScrollHint />}

              {activeTab === "subscriptions" && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 right-0 top-16 z-10 w-10 bg-gradient-to-l from-white via-white/80 to-transparent md:hidden"
                />
              )}

              <div className="overflow-x-auto">
              {activeTab === "subscriptions" ? (
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4">Host</th>
                      <th className="px-5 py-4">Plan</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Start / Expiry</th>
                      <th className="px-5 py-4">Remaining</th>
                      <th className="px-5 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.subscriptions.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-gray-900">{record.host?.name || "Host"}</p>
                          <p className="text-xs text-gray-500">{record.host?.email}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-700">{record.planName}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-600">
                          <p>{formatDate(record.startDate)}</p>
                          <p className="mt-1">to {formatDate(record.expiryDate)}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-700">
                          {record.status === "active" ? `${record.remainingDays || 0} days` : "—"}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-gray-900">{formatCurrency(record.amount)}</td>
                      </tr>
                    ))}

                    {!result.subscriptions.length && (
                      <tr><td colSpan={6} className="px-5 py-14 text-center text-gray-500">No subscription records found.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4">Host</th>
                      <th className="px-5 py-4">Plan</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Order / Payment</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <p className="font-black text-gray-900">{payment.host?.name || "Host"}</p>
                          <p className="text-xs text-gray-500">{payment.host?.email}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-700">{payment.subscription?.planName || payment.planCode}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(payment.status)}`}>{payment.status}</span></td>
                        <td className="max-w-64 px-5 py-4 font-mono text-xs text-gray-500">
                          <p className="truncate">{payment.razorpayOrderId}</p>
                          <p className="mt-1 truncate">{payment.razorpayPaymentId || "Payment pending"}</p>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{formatDate(payment.paidAt || payment.createdAt, true)}</td>
                        <td className="px-5 py-4 text-right font-black text-gray-900">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                    {!payments.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-gray-500">No payment records found.</td></tr>}
                  </tbody>
                </table>
              )}
              </div>
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-4">
              <p className="text-xs font-semibold text-gray-500">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="rounded-lg border bg-white px-4 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
                <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border bg-white px-4 py-2 text-xs font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}