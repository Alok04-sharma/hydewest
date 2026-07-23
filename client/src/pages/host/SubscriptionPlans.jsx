import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCalendar,
  FiCheck,
  FiCreditCard,
  FiShield,
} from "react-icons/fi";
import subscriptionService from "../../services/subscription.service";

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
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [plansResponse, subscriptionResponse] = await Promise.all([
          subscriptionService.getPlans(),
          subscriptionService.getMySubscription(),
        ]);

        setPlans(plansResponse.data || []);
        setSubscription(subscriptionResponse.data || null);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Subscription plans load nahi ho sake."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const highlightedPlan = useMemo(() => {
    if (!plans.length) return "";
    return plans.find((plan) => plan.durationMonths === 6)?.code || plans[0].code;
  }, [plans]);

  const handlePurchase = async (plan) => {
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
        throw new Error(orderResponse.message || "Payment order create nahi hua.");
      }

      const razorpay = new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.order.amount,
        currency: checkoutData.order.currency,
        name: "StayNest",
        description: `${plan.name} Host Subscription`,
        order_id: checkoutData.order.id,
        prefill: {
          name: checkoutData.host?.name || "",
          email: checkoutData.host?.email || "",
        },
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
              throw new Error(verifyResponse.message || "Payment verify nahi hua.");
            }

            setNotice(verifyResponse.message);
            navigate("/host/subscription", {
              replace: true,
              state: { paymentSuccess: true },
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
          response.error?.description ||
            "Payment failed. Dobara try karein."
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
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#FF385C]">
            <FiShield /> Host Subscription
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Choose a plan and keep listing
          </h1>

          <p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">
            Active subscription ke bina new listing create ya existing listing edit nahi
            ki ja sakti. Renewal current expiry ke baad automatically continue hota hai.
          </p>
        </header>

        {location.state?.subscriptionRequired && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Listing management continue karne ke liye active Host subscription required hai.
          </div>
        )}

        {subscription?.isActive && (
          <div className="mx-auto mt-6 flex max-w-3xl flex-col items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-black text-emerald-800">Your subscription is active</p>
              <p className="mt-1 text-sm text-emerald-700">
                {subscription.remainingDays || 0} day(s) remaining. You can renew now to
                extend your coverage.
              </p>
            </div>

            <Link
              to="/host/subscription"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
            >
              View Details <FiArrowRight />
            </Link>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}

        <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const highlighted = plan.code === highlightedPlan;

            return (
              <article
                key={plan.code}
                className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                  highlighted
                    ? "border-[#FF385C] ring-4 ring-rose-100"
                    : "border-gray-200"
                }`}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF385C] px-3 py-1 text-xs font-black text-white">
                    Best Value
                  </span>
                )}

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-xl text-[#FF385C]">
                  <FiCalendar />
                </div>

                <h2 className="mt-5 text-2xl font-black text-gray-900">{plan.name}</h2>
                <p className="mt-2 text-3xl font-black text-[#FF385C]">
                  {formatCurrency(plan.amount)}
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-400">
                  One-time payment · {plan.durationMonths} month coverage
                </p>

                <div className="mt-6 space-y-3 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600" /> Create new listings
                  </p>
                  <p className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600" /> Edit and resubmit listings
                  </p>
                  <p className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600" /> Renewal extends current plan
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePurchase(plan)}
                  disabled={Boolean(payingPlan)}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    highlighted
                      ? "bg-[#FF385C] text-white hover:bg-[#E00B41]"
                      : "bg-gray-900 text-white hover:bg-purple-700"
                  }`}
                >
                  <FiCreditCard />
                  {payingPlan === plan.code ? "Opening Payment..." : "Purchase Plan"}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}