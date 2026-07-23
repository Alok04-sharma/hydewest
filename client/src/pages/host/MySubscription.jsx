import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import subscriptionService from "../../services/subscription.service";

const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const badgeClass = (status) => {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

export default function MySubscription() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (manual = false) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      setError("");

      const [subscriptionResponse, paymentResponse] = await Promise.all([
        subscriptionService.getMySubscription(),
        subscriptionService.getMyPayments(),
      ]);

      setData(subscriptionResponse.data || null);
      setPayments(paymentResponse.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Subscription details load nahi ho sake."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
      </div>
    );
  }

  const current = data?.activeSubscription || data?.latestSubscription;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#FF385C]">
              <FiShield /> Host Subscription
            </div>
            <h1 className="mt-3 text-3xl font-black text-gray-900 sm:text-4xl">
              My Subscription
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Active plan, expiry, remaining time aur payment history yahan dekhein.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <Link
              to="/host/subscription/plans"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF385C] px-4 py-2.5 text-sm font-bold text-white"
            >
              <FiCreditCard /> {data?.isActive ? "Renew" : "Buy Plan"}
            </Link>
          </div>
        </header>

        {location.state?.paymentSuccess && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Payment successful. Subscription details update ho gayi hain.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-r from-gray-950 via-purple-950 to-[#FF385C] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                  data?.isActive
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-white/15 text-white"
                }`}
              >
                {data?.isActive ? "Active Subscription" : data?.status || "No Subscription"}
              </span>

              <h2 className="mt-4 text-3xl font-black">
                {current?.planName || "Choose your Host plan"}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {current
                  ? `${current.durationMonths} month plan · ${formatCurrency(current.amount)}`
                  : "Listing create aur edit karne ke liye plan purchase karein."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <FiClock />
                <p className="mt-2 text-2xl font-black">{data?.remainingDays || 0}</p>
                <p className="text-xs text-white/60">Days remaining</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <FiCalendar />
                <p className="mt-2 text-sm font-black">{formatDate(current?.startDate)}</p>
                <p className="text-xs text-white/60">Start date</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <FiCalendar />
                <p className="mt-2 text-sm font-black">{formatDate(current?.expiryDate)}</p>
                <p className="text-xs text-white/60">Expiry date</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <FiRefreshCw />
                <p className="mt-2 text-sm font-black">{formatDate(data?.nextRenewalDate)}</p>
                <p className="text-xs text-white/60">Next renewal</p>
              </div>
            </div>
          </div>
        </section>

        {data?.upcomingSubscription && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-black text-blue-800">Upcoming renewal scheduled</p>
            <p className="mt-1 text-sm text-blue-700">
              {data.upcomingSubscription.planName} will start on {formatDate(data.upcomingSubscription.startDate)}
              and continue until {formatDate(data.upcomingSubscription.expiryDate)}.
            </p>
          </section>
        )}

        <section className="mt-7 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h2 className="text-xl font-black text-gray-900">Subscription Records</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Start</th>
                  <th className="px-5 py-3">Expiry</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.records || []).map((record) => (
                  <tr key={record._id}>
                    <td className="px-5 py-4 font-bold text-gray-900">{record.planName}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{formatDate(record.startDate)}</td>
                    <td className="px-5 py-4 text-gray-600">{formatDate(record.expiryDate)}</td>
                    <td className="px-5 py-4 text-right font-black text-gray-900">{formatCurrency(record.amount)}</td>
                  </tr>
                ))}

                {!data?.records?.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                      Abhi koi subscription record nahi hai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
              <FiCreditCard className="text-[#FF385C]" /> Payment History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-5 py-4 font-bold text-gray-900">{payment.subscription?.planName || payment.planCode}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="max-w-60 truncate px-5 py-4 font-mono text-xs text-gray-500">{payment.razorpayPaymentId || payment.razorpayOrderId}</td>
                    <td className="px-5 py-4 text-gray-600">{formatDate(payment.paidAt || payment.createdAt, true)}</td>
                    <td className="px-5 py-4 text-right font-black text-gray-900">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}

                {!payments.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                      Payment history available nahi hai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
