import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import subscriptionService from "../../services/subscription.service";

const formatDate = (value, withTime = false) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
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
  return "bg-slate-100 text-slate-700";
};

const triggerBlobDownload = ({ blob, fileName }) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

export default function MySubscription() {
  const location = useLocation();

  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState("");
  const [error, setError] = useState("");
  const [downloadNotice, setDownloadNotice] = useState("");

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

  const handleDownloadInvoice = async (paymentId) => {
    if (!paymentId || downloadingPaymentId) {
      return;
    }

    try {
      setDownloadingPaymentId(paymentId);
      setError("");
      setDownloadNotice("");

      const invoiceFile = await subscriptionService.downloadInvoice(paymentId);
      triggerBlobDownload(invoiceFile);
      setDownloadNotice("Invoice PDF download start ho gaya hai.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Invoice download nahi ho saka."
      );
    } finally {
      setDownloadingPaymentId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-rose-50/30">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
      </div>
    );
  }

  const current = data?.activeSubscription || data?.latestSubscription;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-slate-50 to-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#FF385C] shadow-sm">
              <span aria-hidden="true">🛡️</span>
              Host Subscription
            </span>
            <h1 className="mt-4 text-3xl font-black text-slate-950 sm:text-4xl">
              My Subscription
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Active plan, expiry, remaining coverage aur downloadable payment
              invoices manage karein.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>↻</span>
              Refresh
            </button>
            <Link
              to="/host/subscription/plans"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF385C] to-rose-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-200"
            >
              <span aria-hidden="true">💳</span>
              View Plans
            </Link>
          </div>
        </header>

        {location.state?.paymentSuccess && (
          <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-black text-emerald-800">
                Payment successful. Subscription activate ho gayi hai.
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                Invoice payment history me available hai.
              </p>
            </div>

            {location.state?.paymentId && (
              <button
                type="button"
                onClick={() => handleDownloadInvoice(location.state.paymentId)}
                disabled={downloadingPaymentId === location.state.paymentId}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {downloadingPaymentId === location.state.paymentId
                  ? "Preparing PDF..."
                  : "⬇ Download Invoice"}
              </button>
            )}
          </div>
        )}

        {downloadNotice && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
            {downloadNotice}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-7 overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-rose-950 to-[#FF385C] p-6 text-white shadow-[0_25px_80px_rgba(255,56,92,0.2)] sm:p-8"
        >
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                  data?.isActive
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-white/15 text-white"
                }`}
              >
                {data?.isActive
                  ? "Active Subscription"
                  : data?.status || "No Subscription"}
              </span>

              <h2 className="mt-4 text-3xl font-black">
                {current?.planName || "Choose your Host plan"}
              </h2>
              <p className="mt-2 text-sm font-semibold text-white/70">
                {current
                  ? `${current.durationMonths} month plan · ${formatCurrency(
                      current.amount
                    )}`
                  : "Listing create aur edit karne ke liye plan purchase karein."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  icon: "⏳",
                  value: data?.remainingDays || 0,
                  label: "Days remaining",
                },
                {
                  icon: "📅",
                  value: formatDate(current?.startDate),
                  label: "Start date",
                },
                {
                  icon: "🏁",
                  value: formatDate(current?.expiryDate),
                  label: "Expiry date",
                },
                {
                  icon: "🔄",
                  value: formatDate(data?.nextRenewalDate),
                  label: "Next renewal",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <p className="mt-2 text-sm font-black sm:text-base">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {data?.upcomingSubscription && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-black text-blue-800">
              Upcoming subscription scheduled
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-blue-700">
              {data.upcomingSubscription.planName} will start on {" "}
              {formatDate(data.upcomingSubscription.startDate)} and continue
              until {formatDate(data.upcomingSubscription.expiryDate)}.
            </p>
          </section>
        )}

        <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <h2 className="text-xl font-black text-slate-950">
              Subscription Records
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[760px] divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Start</th>
                  <th className="px-5 py-3">Expiry</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.records || []).map((record) => (
                  <tr key={record._id} className="hover:bg-rose-50/35">
                    <td className="px-5 py-4 font-black text-slate-900">
                      {record.planName}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${badgeClass(
                          record.status
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {formatDate(record.startDate)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {formatDate(record.expiryDate)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-900">
                      {formatCurrency(record.amount)}
                    </td>
                  </tr>
                ))}

                {!data?.records?.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center font-semibold text-slate-500"
                    >
                      Abhi koi subscription record nahi hai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Payment History & Invoices
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Successful payment ke saamne PDF invoice download button milega.
              </p>
            </div>
            <span className="w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-[#FF385C]">
              {payments.length} payment record{payments.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[900px] divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Payment ID</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-rose-50/35">
                    <td className="px-5 py-4 font-black text-slate-900">
                      {payment.subscription?.planName || payment.planCode}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${badgeClass(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="max-w-48 truncate px-5 py-4 font-mono text-xs font-bold text-slate-500">
                      {payment.invoiceNumber || "Generated on download"}
                    </td>
                    <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-slate-500">
                      {payment.razorpayPaymentId || payment.razorpayOrderId}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {formatDate(payment.paidAt || payment.createdAt, true)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {payment.status === "success" ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(payment._id)}
                          disabled={downloadingPaymentId === payment._id}
                          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-[#FF385C] disabled:opacity-50"
                        >
                          {downloadingPaymentId === payment._id
                            ? "Preparing..."
                            : "⬇ Invoice PDF"}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {!payments.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center font-semibold text-slate-500"
                    >
                      Payment history available nahi hai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {payments.map((payment) => (
              <article
                key={payment._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">
                      {payment.subscription?.planName || payment.planCode}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {formatDate(payment.paidAt || payment.createdAt, true)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${badgeClass(
                      payment.status
                    )}`}
                  >
                    {payment.status}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Amount
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>

                  {payment.status === "success" && (
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(payment._id)}
                      disabled={downloadingPaymentId === payment._id}
                      className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50"
                    >
                      {downloadingPaymentId === payment._id
                        ? "Preparing..."
                        : "⬇ Invoice PDF"}
                    </button>
                  )}
                </div>
              </article>
            ))}

            {!payments.length && (
              <p className="py-10 text-center text-sm font-semibold text-slate-500">
                Payment history available nahi hai.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}