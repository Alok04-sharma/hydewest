import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import bookingService from "../../services/booking.service";
import paymentService from "../../services/payment.service";
import { createRazorpayPrefill } from "../../utils/razorpayContact";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
};

const unitLabel = (unit) => {
  const labels = {
    hour: "Hourly stay",
    night: "Night stay",
    day: "Daily stay",
    week: "Weekly stay",
    month: "Monthly stay",
  };
  return labels[unit] || "Stay booking";
};

export default function Checkout() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      try {
        const response = await bookingService.getMyBookingDetails(bookingId);
        if (active) setBooking(response.data);
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Checkout details load nahi hui."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCheckout();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const pricing = booking?.pricing || {};
  const premiumBooking = Boolean(booking?.membershipSnapshot?.isPremium);
  const includeTime = pricing.bookingUnit === "hour";
  const image = useMemo(
    () =>
      booking?.apartment?.images?.find((item) => item.isCover)?.url ||
      booking?.apartment?.images?.[0]?.url ||
      "",
    [booking]
  );

  const pay = async () => {
    try {
      setPaying(true);
      setError("");

      if (!(await loadRazorpay())) {
        throw new Error("Razorpay load nahi hua.");
      }

      const response = await paymentService.createOrder(bookingId);
      const data = response.data;
      const requiredMethod = data.requiredPaymentMethod || "any";

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "hydewest",
        description: `${unitLabel(pricing.bookingUnit)} · ${
          booking.apartment?.title || "Property"
        }`,
        order_id: data.order.id,
        prefill: createRazorpayPrefill({
          name: data.guest?.name,
          email: data.guest?.email,
          phone: data.guest?.phone,
          mobile: data.guest?.mobile,
          contact: data.guest?.contact,
        }),
        notes: {
          bookingId,
          bookingUnit: pricing.bookingUnit || "night",
          couponCode: pricing.couponCode || "",
        },
        theme: {
          color: premiumBooking ? "#B8860B" : "#FF385C",
        },
        ...(data.checkoutConfig ? { config: data.checkoutConfig } : {}),
        handler: async (result) => {
          try {
            const verified = await paymentService.verify({
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            });

            navigate(`/guest/booking-success/${bookingId}`, {
              replace: true,
              state: {
                payment: verified.data?.payment,
                requiredPaymentMethod: requiredMethod,
              },
            });
          } catch (verifyError) {
            navigate(`/guest/booking-failed/${bookingId}`, {
              state: {
                message:
                  verifyError.response?.data?.message ||
                  "Payment verification failed.",
              },
            });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      razorpay.on("payment.failed", (result) => {
        navigate(`/guest/booking-failed/${bookingId}`, {
          state: {
            message: result.error?.description || "Payment failed.",
          },
        });
        setPaying(false);
      });

      razorpay.open();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Payment start nahi hua."
      );
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-black">Checkout unavailable</h1>
          <p className="mt-2 text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const priceRows = [
    ["Base rent", pricing.subtotal],
    ["Extra guest charge", pricing.extraGuestCharge],
    ["Cleaning fee", pricing.cleaningFee],
    ["Service fee", pricing.serviceFee],
    [
      pricing.couponLabel
        ? `Coupon · ${pricing.couponLabel}`
        : "Coupon discount",
      -pricing.discountAmount,
    ],
    ["Premium member saving", -pricing.premiumDiscountAmount],
    ["Loyalty points saving", -pricing.loyaltyDiscountAmount],
  ];

  return (
    <div
      className={`min-h-screen px-4 py-8 sm:px-6 ${
        premiumBooking
          ? "bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.17),transparent_28rem),linear-gradient(180deg,#171208,#2b1c06_34%,#f8fafc_34%)]"
          : "bg-[radial-gradient(circle_at_top_right,rgba(255,56,92,.09),transparent_26rem),#f8fafc]"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/apartment/${booking.apartment?._id}`}
          className={`text-sm font-black ${
            premiumBooking ? "text-amber-200" : "text-slate-500"
          }`}
        >
          ← Back to property
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={`text-3xl font-black sm:text-4xl ${
                premiumBooking ? "text-white" : "text-slate-950"
              }`}
            >
              Complete your payment
            </h1>
            {premiumBooking && (
              <span className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-3 py-1 text-[10px] font-black text-slate-950">
                👑 PREMIUM CHECKOUT
              </span>
            )}
          </div>
          <p
            className={`mt-2 text-sm font-semibold ${
              premiumBooking ? "text-amber-100/70" : "text-slate-500"
            }`}
          >
            Review your selected pricing plan, offers and stay details before
            paying.
          </p>
        </motion.header>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_410px]">
          <div className="space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`overflow-hidden rounded-[30px] border shadow-xl ${
                premiumBooking
                  ? "border-amber-400/40 bg-gradient-to-br from-[#211707] via-[#332108] to-[#171208] text-white"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  {image && (
                    <img
                      src={image}
                      alt={booking.apartment?.title || "Property"}
                      className="h-44 w-full rounded-[24px] object-cover sm:h-28 sm:w-36"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        premiumBooking ? "text-amber-300" : "text-[#FF385C]"
                      }`}
                    >
                      {premiumBooking
                        ? "👑 Premium Booking"
                        : "hydewest Booking"}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {booking.apartment?.title}
                    </h2>
                    <p
                      className={`mt-1 text-sm ${
                        premiumBooking ? "text-amber-100/60" : "text-slate-500"
                      }`}
                    >
                      📍 {booking.apartment?.location?.city || "Location"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          premiumBooking
                            ? "bg-amber-300/15 text-amber-200"
                            : "bg-rose-50 text-[#FF385C]"
                        }`}
                      >
                        {unitLabel(pricing.bookingUnit)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${
                          premiumBooking
                            ? "bg-white/10 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {pricing.unitCount || 1} unit(s) ×{" "}
                        {money(pricing.basePrice)}
                      </span>
                      {pricing.unitSavingsPercent > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black text-emerald-400">
                          SAVE {pricing.unitSavingsPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    className={`rounded-2xl p-4 ${
                      premiumBooking ? "bg-white/8" : "bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-black ${
                        premiumBooking ? "text-amber-200/60" : "text-slate-400"
                      }`}
                    >
                      {includeTime ? "START" : "CHECK-IN"}
                    </p>
                    <p className="mt-1 font-black">
                      {formatDate(booking.checkIn, includeTime)}
                    </p>
                  </div>
                  <div
                    className={`rounded-2xl p-4 ${
                      premiumBooking ? "bg-white/8" : "bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-black ${
                        premiumBooking ? "text-amber-200/60" : "text-slate-400"
                      }`}
                    >
                      {includeTime ? "END" : "CHECK-OUT"}
                    </p>
                    <p className="mt-1 font-black">
                      {formatDate(booking.checkOut, includeTime)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-xl">
                  🔒
                </span>
                <div>
                  <h3 className="font-black text-slate-950">Secure payment</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Your booking confirms only after successful payment
                    signature verification. Coupon-based UPI or Card offers
                    automatically open the matching payment method.
                  </p>
                </div>
              </div>
            </section>

            {(pricing.couponCode || pricing.premiumDiscountAmount > 0) && (
              <section className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm sm:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  Your savings
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {pricing.couponCode && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-black text-slate-950">
                        🎟️ {pricing.couponLabel || pricing.couponCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Coupon {pricing.couponCode} applied
                        {pricing.couponPaymentMethod !== "any"
                          ? ` · pay with ${String(
                              pricing.couponPaymentMethod
                            ).toUpperCase()}`
                          : ""}
                      </p>
                    </div>
                  )}
                  {pricing.premiumDiscountAmount > 0 && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-black text-amber-700">
                        👑 Premium member price
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Extra {money(pricing.premiumDiscountAmount)} saved
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            className={`overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(15,23,42,.15)] lg:sticky lg:top-24 ${
              premiumBooking
                ? "border-amber-300 bg-white"
                : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`p-6 ${
                premiumBooking
                  ? "bg-gradient-to-br from-[#171208] via-[#2b1c06] to-amber-800 text-white"
                  : "bg-gradient-to-br from-slate-950 to-rose-950 text-white"
              }`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  premiumBooking ? "text-amber-300" : "text-rose-200"
                }`}
              >
                Final payment
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-black">
                  {money(pricing.totalAmount)}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/60">
                Inclusive of configured fees and applied discounts
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <h2 className="text-xl font-black text-slate-950">
                Price details
              </h2>
              <div className="mt-5 space-y-3 text-sm">
                {priceRows.map(
                  ([label, value]) =>
                    Number(value || 0) !== 0 && (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-slate-500">{label}</span>
                        <strong
                          className={
                            Number(value) < 0
                              ? "text-emerald-600"
                              : "text-slate-900"
                          }
                        >
                          {Number(value) < 0 ? "−" : ""}
                          {money(Math.abs(value))}
                        </strong>
                      </div>
                    )
                )}
              </div>

              <div className="mt-5 flex justify-between border-t border-slate-200 pt-5 text-xl font-black">
                <span>Total</span>
                <span>{money(pricing.totalAmount)}</span>
              </div>

              {pricing.preferredPaymentMethod &&
                pricing.preferredPaymentMethod !== "any" && (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
                    {pricing.preferredPaymentMethod === "upi" ? "📱" : "💳"}{" "}
                    Preferred payment:{" "}
                    {pricing.preferredPaymentMethod.toUpperCase()}
                  </div>
                )}

              <button
                onClick={pay}
                disabled={paying || booking.paymentStatus === "paid"}
                className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black text-white shadow-lg disabled:opacity-50 ${
                  premiumBooking
                    ? "bg-gradient-to-r from-slate-950 via-amber-950 to-amber-700 shadow-amber-200"
                    : "bg-gradient-to-r from-[#FF385C] to-rose-600 shadow-rose-200"
                }`}
              >
                {booking.paymentStatus === "paid"
                  ? "Payment completed"
                  : paying
                  ? "Opening secure payment..."
                  : `Pay ${money(pricing.totalAmount)}`}
              </button>

              <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">
                Loyalty points are credited after successful payment.
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
