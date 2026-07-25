import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import guestMembershipService from "../../services/guestMembership.service";
import listingService from "../../services/listing.service";
import GuestPageHeader from "../../components/guest/GuestPageHeader";
import { createRazorpayPrefill } from "../../utils/razorpayContact";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const FEATURE_GROUPS = [
  {
    title: "Booking savings",
    icon: "💸",
    summary: "Discounts, coupons, cancellation and priority",
    features: [
      "12–15% Premium booking prices",
      "Premium-only Host coupons",
      "Exclusive property access",
      "48-hour flexible cancellation",
      "Priority booking requests",
    ],
  },
  {
    title: "Travel intelligence",
    icon: "✨",
    summary: "Price alerts, history and planning tools",
    features: [
      "Price-drop alerts",
      "Property price history",
      "AI trip planner",
      "Personalized recommendations",
      "Early-access entitlement",
    ],
  },
  {
    title: "Member experience",
    icon: "👑",
    summary: "Chat, rewards, wishlist and support",
    features: [
      "Direct Host chat",
      "Unlimited wishlist",
      "Boosted loyalty points",
      "Premium Traveller badge",
      "Priority support entitlement",
    ],
  },
];

const couponValue = (coupon) =>
  coupon.discountType === "fixed"
    ? `${money(coupon.discountValue)} OFF`
    : `${Number(coupon.discountValue || 0)}% OFF`;

export default function GuestPremium() {
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [premiumCoupons, setPremiumCoupons] = useState([]);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [plansResponse, membershipResponse, paymentResponse, listingResponse] =
        await Promise.allSettled([
          guestMembershipService.getPlans(),
          guestMembershipService.getMyMembership(),
          guestMembershipService.getPayments(),
          listingService.search({ page: 1, limit: 100 }),
        ]);

      if (plansResponse.status === "fulfilled") {
        setPlans(plansResponse.value.data || []);
      }
      if (membershipResponse.status === "fulfilled") {
        setSummary(membershipResponse.value.data || null);
      }
      if (paymentResponse.status === "fulfilled") {
        setPayments(paymentResponse.value.data || []);
      }

      if (listingResponse.status === "fulfilled") {
        const apartments = listingResponse.value.data?.apartments || [];
        const coupons = apartments.flatMap((apartment) =>
          (apartment.coupons || [])
            .filter(
              (coupon) => coupon.premiumOnly && coupon.isActive !== false
            )
            .map((coupon) => ({
              ...coupon,
              apartmentId: apartment._id,
              apartmentTitle: apartment.title,
            }))
        );
        setPremiumCoupons(coupons);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Premium details load nahi hui."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const current = summary?.membership;
  const premiumActive = Boolean(summary?.isActive);
  const activePlanCode = premiumActive ? current?.planCode : "";
  const highlighted = useMemo(
    () =>
      plans.find((plan) => plan.durationMonths === 12)?.code || plans[0]?.code,
    [plans]
  );

  const availablePremiumCoupons = useMemo(() => {
    if (premiumCoupons.length) return premiumCoupons;

    return [
      {
        code: "PREMIUM15",
        label: "Premium Member Saving",
        description:
          "15% off on eligible Host properties. Final eligibility is checked during booking.",
        discountType: "percentage",
        discountValue: 15,
        apartmentTitle: "Eligible Premium properties",
      },
      {
        code: "PREMIUM500",
        label: "Premium Flat Saving",
        description: "Flat ₹500 off on eligible higher-value bookings.",
        discountType: "fixed",
        discountValue: 500,
        apartmentTitle: "Eligible Premium properties",
      },
    ];
  }, [premiumCoupons]);

  const purchase = async (plan) => {
    if (activePlanCode === plan.code) return;

    try {
      setPaying(plan.code);
      setError("");
      setNotice("");

      if (!(await loadRazorpay())) {
        throw new Error("Razorpay checkout load nahi hua.");
      }

      const orderResponse = await guestMembershipService.createOrder(plan.code);
      const data = orderResponse.data;
      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "hydewest",
        description: `${plan.name} Guest Premium`,
        order_id: data.order.id,
        prefill: createRazorpayPrefill({
          name: data.guest?.name,
          email: data.guest?.email,
          phone: data.guest?.phone,
          mobile: data.guest?.mobile,
          contact: data.guest?.contact,
        }),
        theme: { color: "#bd123f" },
        handler: async (result) => {
          try {
            const verified = await guestMembershipService.verifyPayment({
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            });
            setNotice(verified.message || "Premium activated.");
            await load();
          } catch (verifyError) {
            setError(
              verifyError.response?.data?.message || "Payment verify nahi hua."
            );
          } finally {
            setPaying("");
          }
        },
        modal: { ondismiss: () => setPaying("") },
      });

      razorpay.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment failed.");
        setPaying("");
      });
      razorpay.open();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Purchase start nahi hua."
      );
      setPaying("");
    }
  };

  const download = async (payment) => {
    try {
      setDownloading(payment._id);
      const result = await guestMembershipService.downloadInvoice(payment._id);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Invoice download nahi hui."
      );
    } finally {
      setDownloading("");
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#bd123f] border-t-transparent" />
      </div>
    );
  }

  const pageClass = premiumActive
    ? "bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.14),transparent_30rem),linear-gradient(180deg,#0b1020_0%,#151827_100%)] text-white"
    : "bg-[radial-gradient(circle_at_8%_0%,rgba(255,56,92,.10),transparent_28rem),linear-gradient(180deg,#fff3f4_0%,#f3edf0_52%,#eef2f7_100%)] text-slate-950";

  return (
    <div className={`guest-page min-h-screen px-4 pb-12 pt-16 sm:px-6 lg:px-8 ${pageClass}`}>
      <div className="mx-auto max-w-7xl">
        <GuestPageHeader
          eyebrow={premiumActive ? "👑 Premium membership" : "Guest Premium"}
          title={
            premiumActive
              ? "Your Premium travel club"
              : "Unlock a smarter hydewest experience"
          }
          description={
            premiumActive
              ? "Manage your plan, member coupons and payment history from one clean workspace."
              : "Premium prices, Host chat, exclusive stays, rewards and flexible cancellation—without filling the page with feature cards."
          }
        />

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {notice}
          </div>
        )}

        {premiumActive && (
          <section className="mt-6 overflow-hidden rounded-[30px] border border-amber-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(251,191,36,.16),transparent_20rem),linear-gradient(135deg,#171208,#111827)] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,.35)]">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                  Active membership
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {current?.planName || "Premium Traveller"}
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Active until {formatDate(current?.expiryDate)} · {summary.remainingDays} days remaining
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl border border-amber-300/15 bg-white/[0.05] px-4 py-3">
                  <span className="block text-xl font-black text-amber-300">
                    {current?.discountPercent || 0}%
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wide text-white/40">
                    Member saving
                  </span>
                </div>
                <div className="rounded-2xl border border-amber-300/15 bg-white/[0.05] px-4 py-3">
                  <span className="block text-xl font-black text-amber-300">
                    {current?.loyaltyMultiplier || 1}x
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wide text-white/40">
                    Reward rate
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <motion.article
            whileHover={{ y: -3 }}
            className={`overflow-hidden rounded-[28px] border ${
              premiumActive
                ? "border-amber-300/20 bg-white/[0.05]"
                : "border-rose-200/70 bg-rose-50/55"
            }`}
          >
            <button
              type="button"
              onClick={() => setCouponsOpen((currentValue) => !currentValue)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
            >
              <span className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-2xl shadow-lg">
                  🎟️
                </span>
                <span>
                  <span
                    className={`block text-xs font-black uppercase tracking-[0.18em] ${
                      premiumActive ? "text-amber-300" : "text-amber-800"
                    }`}
                  >
                    Find available coupons
                  </span>
                  <span className="mt-1 block text-lg font-black">
                    {availablePremiumCoupons.length} member offers available
                  </span>
                  <span className="mt-1 block text-xs opacity-50">
                    Click to view codes and eligible properties.
                  </span>
                </span>
              </span>
              <motion.span
                animate={{ rotate: couponsOpen ? 180 : 0 }}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                  premiumActive
                    ? "bg-amber-300 text-slate-950"
                    : "bg-slate-950 text-white"
                }`}
              >
                ⌄
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {couponsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-3 border-t border-current/10 p-4 sm:grid-cols-2 sm:p-6">
                    {availablePremiumCoupons.map((coupon, index) => (
                      <article
                        key={`${coupon.apartmentId}-${coupon.code}-${index}`}
                        className={`rounded-2xl border p-4 ${
                          premiumActive
                            ? "border-amber-300/15 bg-black/15"
                            : "border-amber-200/70 bg-amber-50/55"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                              premiumActive
                                ? "bg-amber-300 text-slate-950"
                                : "bg-slate-950 text-white"
                            }`}
                          >
                            {String(coupon.code || "PREMIUM").toUpperCase()}
                          </span>
                          <span className="text-sm font-black text-emerald-500">
                            {couponValue(coupon)}
                          </span>
                        </div>
                        <h3 className="mt-3 font-black">
                          {coupon.label || "Premium property offer"}
                        </h3>
                        <p className="mt-1 text-xs leading-5 opacity-50">
                          {coupon.description ||
                            `Available on ${coupon.apartmentTitle}.`}
                        </p>
                        <p
                          className={`mt-2 truncate text-[10px] font-black uppercase tracking-wide ${
                            premiumActive ? "text-amber-300" : "text-amber-800"
                          }`}
                        >
                          🏠 {coupon.apartmentTitle}
                        </p>
                      </article>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.article>

          <motion.article
            whileHover={{ y: -3 }}
            className={`overflow-hidden rounded-[28px] border ${
              premiumActive
                ? "border-amber-300/20 bg-white/[0.05]"
                : "border-rose-200/70 bg-rose-50/55"
            }`}
          >
            <button
              type="button"
              onClick={() => setBenefitsOpen((currentValue) => !currentValue)}
              className="flex h-full w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
            >
              <span>
                <span
                  className={`text-xs font-black uppercase tracking-[0.18em] ${
                    premiumActive ? "text-amber-300" : "text-[#bd123f]"
                  }`}
                >
                  Premium Toolkit
                </span>
                <span className="mt-2 block text-xl font-black">
                  All benefits, one compact panel
                </span>
                <span className="mt-1 block text-xs opacity-50">
                  15 member advantages grouped into three categories.
                </span>
              </span>
              <motion.span
                animate={{ rotate: benefitsOpen ? 180 : 0 }}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                  premiumActive
                    ? "bg-amber-300 text-slate-950"
                    : "bg-[#bd123f] text-white"
                }`}
              >
                ⌄
              </motion.span>
            </button>
          </motion.article>
        </section>

        <AnimatePresence initial={false}>
          {benefitsOpen && (
            <motion.section
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {FEATURE_GROUPS.map((group) => (
                  <article
                    key={group.title}
                    className={`rounded-[26px] border p-5 ${
                      premiumActive
                        ? "border-amber-300/15 bg-white/[0.045]"
                        : "border-rose-200/70 bg-rose-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-xl">
                        {group.icon}
                      </span>
                      <span>
                        <h3 className="font-black">{group.title}</h3>
                        <p className="mt-0.5 text-[10px] opacity-45">
                          {group.summary}
                        </p>
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {group.features.map((feature) => (
                        <p key={feature} className="text-xs font-semibold opacity-70">
                          ✓ {feature}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {plans.map((plan, index) => {
            const purchased = activePlanCode === plan.code;
            const bestValue = highlighted === plan.code;

            return (
              <motion.article
                key={plan.code}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={purchased ? undefined : { y: -5 }}
                className={`relative rounded-[30px] border p-6 shadow-sm ${
                  purchased
                    ? premiumActive
                      ? "border-emerald-300/30 bg-emerald-400/10"
                      : "border-emerald-300 bg-emerald-100/60"
                    : bestValue
                      ? premiumActive
                        ? "border-amber-300 bg-amber-300/10 ring-4 ring-amber-300/5"
                        : "border-[#bd123f] bg-rose-50/75 ring-4 ring-rose-100/70"
                      : premiumActive
                        ? "border-amber-300/15 bg-white/[0.045]"
                        : "border-rose-200/70 bg-rose-50/50"
                }`}
              >
                {bestValue && !purchased && (
                  <span
                    className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-black ${
                      premiumActive
                        ? "bg-amber-300 text-slate-950"
                        : "bg-[#bd123f] text-white"
                    }`}
                  >
                    BEST VALUE
                  </span>
                )}
                <p
                  className={`text-xs font-black uppercase tracking-[0.16em] ${
                    premiumActive ? "text-amber-300" : "text-[#bd123f]"
                  }`}
                >
                  {plan.name}
                </p>
                <p className="mt-4 text-4xl font-black">{money(plan.amount)}</p>
                <p className="mt-1 text-sm font-semibold opacity-45">
                  {plan.durationMonths} month coverage
                </p>
                <div className="mt-5 space-y-2 text-sm font-semibold opacity-75">
                  <p>✓ {plan.discountPercent}% booking discount</p>
                  <p>✓ Host chat and exclusive properties</p>
                  <p>✓ Unlimited wishlist and price alerts</p>
                  <p>✓ {plan.loyaltyMultiplier}x loyalty points</p>
                </div>
                <button
                  type="button"
                  onClick={() => purchase(plan)}
                  disabled={purchased || paying === plan.code}
                  className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-black ${
                    purchased
                      ? "cursor-not-allowed bg-emerald-300/20 text-emerald-500"
                      : premiumActive
                        ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                        : "bg-slate-950 text-white hover:bg-[#bd123f]"
                  }`}
                >
                  {purchased
                    ? `Purchased until ${formatDate(current?.expiryDate)}`
                    : paying === plan.code
                      ? "Opening payment..."
                      : "Purchase Premium"}
                </button>
              </motion.article>
            );
          })}
        </section>

        <section
          className={`mt-8 overflow-hidden rounded-[28px] border shadow-sm ${
            premiumActive
              ? "border-amber-300/15 bg-white/[0.045]"
              : "border-rose-200/70 bg-rose-50/50"
          }`}
        >
          <div className="border-b border-current/10 p-5">
            <h2 className="text-xl font-black">Premium payment history</h2>
          </div>
          <div className="divide-y divide-current/10">
            {payments.map((payment) => (
              <div
                key={payment._id}
                className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-black">{payment.planName}</p>
                  <p className="mt-1 text-xs opacity-45">
                    {formatDate(payment.coverageStart)} - {formatDate(payment.coverageEnd)} · {payment.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong>{money(payment.amount)}</strong>
                  {payment.status === "success" && (
                    <button
                      type="button"
                      onClick={() => download(payment)}
                      disabled={downloading === payment._id}
                      className={`rounded-xl px-3 py-2 text-xs font-black ${
                        premiumActive
                          ? "bg-amber-300 text-slate-950"
                          : "bg-slate-950 text-white"
                      }`}
                    >
                      {downloading === payment._id ? "Preparing..." : "⬇ Invoice"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!payments.length && (
              <div className="p-10 text-center text-sm font-semibold opacity-45">
                No Premium payments yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}