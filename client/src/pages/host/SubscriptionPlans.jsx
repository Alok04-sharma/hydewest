import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import subscriptionService from "../../services/subscription.service";
import { createRazorpayPrefill } from "../../utils/razorpayContact";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingPlan, setPayingPlan] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      try {
        setLoading(true);
        setError("");

        const [plansResponse, subscriptionResponse] = await Promise.all([
          subscriptionService.getPlans(),
          subscriptionService.getMySubscription(),
        ]);

        if (!isMounted) {
          return;
        }

        setPlans(plansResponse.data || []);
        setSubscription(subscriptionResponse.data || null);
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Subscription plans load nahi ho sake."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  const highlightedPlan = useMemo(() => {
    if (!plans.length) {
      return "";
    }

    return (
      plans.find((plan) => plan.durationMonths === 6)?.code || plans[0].code
    );
  }, [plans]);

  const purchasedCoverage = useMemo(() => {
    const now = Date.now();
    const coverageByPlan = new Map();

    (subscription?.records || []).forEach((record) => {
      const expiryTime = new Date(record.expiryDate || 0).getTime();
      const isPaid = record.paymentStatus === "success";
      const isCovered = ["active", "scheduled"].includes(record.status);

      if (!isPaid || !isCovered || expiryTime <= now) {
        return;
      }

      const existingExpiry = coverageByPlan.get(record.planCode);

      if (!existingExpiry || expiryTime > new Date(existingExpiry).getTime()) {
        coverageByPlan.set(record.planCode, record.expiryDate);
      }
    });

    return coverageByPlan;
  }, [subscription]);

  const handlePurchase = async (plan) => {
    if (purchasedCoverage.has(plan.code)) {
      return;
    }

    try {
      setPayingPlan(plan.code);
      setError("");
      setNotice("");

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error("Razorpay checkout load nahi ho saka.");
      }

      const orderResponse = await subscriptionService.createOrder(plan.code);
      const checkoutData = orderResponse.data;

      if (!orderResponse.success || !checkoutData?.order?.id) {
        throw new Error(
          orderResponse.message || "Payment order create nahi hua."
        );
      }

      const razorpay = new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.order.amount,
        currency: checkoutData.order.currency,
        name: "hydewest",
        description: `${plan.name} Host Subscription`,
        order_id: checkoutData.order.id,
        prefill: createRazorpayPrefill({
          name: checkoutData.host?.name,
          email: checkoutData.host?.email,
          phone: checkoutData.host?.phone,
          mobile: checkoutData.host?.mobile,
          contact: checkoutData.host?.contact,
        }),
        theme: {
          color: "#FF385C",
        },
        handler: async (paymentResult) => {
          try {
            const verifyResponse = await subscriptionService.verifyPayment({
              razorpayOrderId: paymentResult.razorpay_order_id,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpaySignature: paymentResult.razorpay_signature,
            });

            if (!verifyResponse.success) {
              throw new Error(
                verifyResponse.message || "Payment verify nahi hua."
              );
            }

            const verifiedPaymentId = verifyResponse.data?.payment?._id;

            navigate("/host/subscription", {
              replace: true,
              state: {
                paymentSuccess: true,
                paymentId: verifiedPaymentId || null,
              },
            });
          } catch (verifyError) {
            setError(
              verifyError.response?.data?.message ||
                verifyError.message ||
                "Payment verification failed."
            );
          } finally {
            setPayingPlan("");
          }
        },
        modal: {
          ondismiss: () => {
            setPayingPlan("");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setError(
          response.error?.description || "Payment failed. Dobara try karein."
        );
        setPayingPlan("");
      });

      razorpay.open();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Subscription purchase start nahi ho saka."
      );
      setPayingPlan("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-rose-50/30">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-slate-50 to-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#FF385C] shadow-sm">
            <span aria-hidden="true">🛡️</span>
            Host Subscription
          </span>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Choose the coverage that fits your hosting journey
          </h1>

          <p className="mt-4 text-sm font-medium leading-7 text-slate-500 sm:text-base">
            Purchased plan card expiry tak locked rahega. Aap kisi doosre plan ko
            choose kar sakte hain, lekin same active plan dobara purchase nahi hoga.
          </p>
        </header>

        {location.state?.subscriptionRequired && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Listing management continue karne ke liye active Host subscription
            required hai.
          </div>
        )}

        {subscription?.isActive && (
          <div className="mx-auto mt-6 flex max-w-3xl flex-col items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-black text-emerald-800">
                Your subscription is active
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {subscription.remainingDays || 0} day(s) remaining. Purchased
                plan card expiry tak disabled rahega.
              </p>
            </div>

            <Link
              to="/host/subscription"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white"
            >
              View details →
            </Link>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {notice}
          </div>
        )}

        <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, index) => {
            const highlighted = plan.code === highlightedPlan;
            const purchasedUntil = purchasedCoverage.get(plan.code);
            const isPurchased = Boolean(purchasedUntil);
            const isPaying = payingPlan === plan.code;

            return (
              <motion.article
                key={plan.code}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={isPurchased ? undefined : { y: -6 }}
                className={`relative flex flex-col overflow-hidden rounded-[30px] border bg-white p-6 shadow-sm transition ${
                  isPurchased
                    ? "border-emerald-200 bg-emerald-50/45 opacity-85"
                    : highlighted
                      ? "border-[#FF385C] ring-4 ring-rose-100 hover:shadow-xl"
                      : "border-slate-200 hover:border-rose-200 hover:shadow-xl"
                }`}
              >
                {highlighted && !isPurchased && (
                  <span className="absolute right-4 top-4 rounded-full bg-[#FF385C] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                    Best Value
                  </span>
                )}

                {isPurchased && (
                  <div className="absolute inset-x-0 top-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    Purchased until {formatDate(purchasedUntil)}
                  </div>
                )}

                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${
                    isPurchased
                      ? "mt-7 bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-[#FF385C]"
                  }`}
                >
                  {isPurchased ? "✓" : "📅"}
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">
                  {plan.name}
                </h2>
                <p className="mt-2 text-3xl font-black text-[#FF385C]">
                  {formatCurrency(plan.amount)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  One-time payment · {plan.durationMonths} month coverage
                </p>

                <div className="mt-6 space-y-3 text-sm font-semibold text-slate-600">
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600">✓</span> Create new
                    listings
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600">✓</span> Edit and resubmit
                    listings
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-600">✓</span> Downloadable PDF
                    invoice
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePurchase(plan)}
                  disabled={Boolean(payingPlan) || isPurchased}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed ${
                    isPurchased
                      ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                      : highlighted
                        ? "bg-[#FF385C] text-white shadow-lg shadow-rose-200 hover:bg-[#E00B41] disabled:opacity-50"
                        : "bg-slate-950 text-white hover:bg-[#FF385C] disabled:opacity-50"
                  }`}
                >
                  <span aria-hidden="true">{isPurchased ? "✓" : "💳"}</span>
                  {isPurchased
                    ? `Purchased · ${formatDate(purchasedUntil)}`
                    : isPaying
                      ? "Opening payment..."
                      : "Purchase plan"}
                </button>
              </motion.article>
            );
          })}
        </section>
      </div>
    </div>
  );
}