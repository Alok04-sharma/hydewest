import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import GuestPageHeader from "../../components/guest/GuestPageHeader";
import paymentService from "../../services/payment.service";

const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles = {
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPayments() {
      try {
        const response = await paymentService.getHistory();

        if (active) {
          setPayments(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Payment history could not be loaded."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      active = false;
    };
  }, []);

  const downloadReceipt = async (payment) => {
    try {
      setDownloading(payment._id);
      setError("");

      const result = await paymentService.downloadReceipt(payment._id);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = result.fileName || `hydewest-receipt-${payment._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "The receipt could not be downloaded."
      );
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <GuestPageHeader
          eyebrow="Payments"
          title="Payment history & receipts"
          description="Track booking payment status and download PDF receipts for successful payments."
        />

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {payments.map((payment, index) => (
              <motion.article
                key={payment._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-black text-slate-900">
                        {payment.booking?.apartment?.title || "Booking payment"}
                      </h2>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          statusStyles[payment.status] || statusStyles.pending
                        }`}
                      >
                        {payment.status || "pending"}
                      </span>
                    </div>

                    <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                      {formatDate(payment.createdAt)} · {payment.razorpayPaymentId || payment.razorpayOrderId || "Payment reference pending"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xl font-black text-slate-950">
                      {money(payment.amount)}
                    </p>

                    {payment.status === "success" && (
                      <button
                        type="button"
                        onClick={() => downloadReceipt(payment)}
                        disabled={downloading === payment._id}
                        className="rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#FF385C] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {downloading === payment._id
                          ? "Preparing..."
                          : "⬇ PDF receipt"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}

            {payments.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white py-20 text-center">
                <div className="text-5xl">💳</div>
                <h2 className="mt-4 text-lg font-black text-slate-900">
                  No payments yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Successful booking payments will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}