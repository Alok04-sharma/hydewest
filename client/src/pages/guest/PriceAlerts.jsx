import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import guestService from "../../services/guest.service";
import guestMembershipService from "../../services/guestMembership.service";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const FALLBACK_IMAGE =
  "https://placehold.co/800x500/111827/f8d477?text=hydewest";

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [alertsResult, membershipResult] = await Promise.allSettled([
        guestService.getPriceAlerts(),
        guestMembershipService.getMyMembership(),
      ]);

      if (alertsResult.status === "fulfilled") {
        setAlerts(alertsResult.value.data || []);
      } else if (alertsResult.reason?.response?.status !== 403) {
        throw alertsResult.reason;
      }

      if (membershipResult.status === "fulfilled") {
        setMembership(membershipResult.value.data || null);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Price alerts could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeAlert = async (alertId) => {
    try {
      await guestService.removePriceAlert(alertId);
      setAlerts((currentAlerts) =>
        currentAlerts.filter((alert) => alert._id !== alertId)
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "The price alert could not be removed."
      );
    }
  };

  const premiumActive = Boolean(membership?.isActive);

  return (
    <div
      className={`min-h-screen px-4 py-7 sm:px-6 lg:px-8 ${
        premiumActive
          ? "bg-[radial-gradient(circle_at_88%_0%,rgba(251,191,36,.16),transparent_28rem),radial-gradient(circle_at_5%_42%,rgba(180,83,9,.10),transparent_30rem),linear-gradient(180deg,#070b14_0%,#0b1020_48%,#111827_100%)] text-white"
          : "bg-[radial-gradient(circle_at_8%_0%,rgba(255,56,92,.10),transparent_28rem),linear-gradient(180deg,#fff1f3_0%,#eef2f7_100%)] text-slate-950"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`overflow-hidden rounded-[30px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,.20)] sm:p-7 ${
            premiumActive
              ? "border-amber-300/20 bg-[radial-gradient(circle_at_95%_0%,rgba(251,191,36,.18),transparent_20rem),linear-gradient(145deg,rgba(15,23,42,.98),rgba(23,20,15,.98))]"
              : "border-rose-200/70 bg-rose-50/80"
          }`}
        >
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.24em] ${
                  premiumActive ? "text-amber-300" : "text-[#bd123f]"
                }`}
              >
                {premiumActive ? "👑 Premium Price Intelligence" : "Price Alerts"}
              </p>
              <h1
                className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${
                  premiumActive ? "text-white" : "text-slate-950"
                }`}
              >
                Track price drops automatically
              </h1>
              <p
                className={`mt-2 max-w-2xl text-sm font-medium leading-6 ${
                  premiumActive ? "text-amber-50/55" : "text-slate-500"
                }`}
              >
                hydewest will notify you as soon as a saved property reaches your target price.
              </p>
            </div>

            <Link
              to="/guest/search"
              className={`inline-flex shrink-0 items-center justify-center rounded-2xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${
                premiumActive
                  ? "bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-lg shadow-amber-950/30"
                  : "bg-slate-950 text-white"
              }`}
            >
              Find properties
            </Link>
          </div>
        </motion.header>

        {error && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
              premiumActive
                ? "border-red-400/25 bg-red-500/10 text-red-200"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        {!loading && !premiumActive && (
          <section className="mt-6 rounded-[30px] border border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 p-7 text-center">
            <div className="text-5xl">🔒</div>
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              Price alerts are a Premium benefit
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Guest Premium activate karke target-price alerts, price history,
              unlock exclusive stays and member discounts.
            </p>
            <Link
              to="/guest/premium"
              className="mt-5 inline-flex rounded-2xl bg-[#FF385C] px-5 py-3 text-sm font-black text-white"
            >
              View Premium Plans
            </Link>
          </section>
        )}

        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <div
              className={`h-11 w-11 animate-spin rounded-full border-4 border-t-transparent ${
                premiumActive ? "border-amber-300" : "border-[#FF385C]"
              }`}
            />
          </div>
        ) : premiumActive ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert, index) => {
              const apartment = alert.apartment;
              const image =
                apartment?.images?.find((item) => item?.isCover)?.url ||
                apartment?.images?.[0]?.url ||
                apartment?.images?.[0] ||
                FALLBACK_IMAGE;
              const currentPrice =
                apartment?.pricing?.basePrice ||
                apartment?.pricing?.pricePerNight ||
                alert.lastSeenPrice ||
                0;

              return (
                <motion.article
                  key={alert._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={{ y: -5 }}
                  className="overflow-hidden rounded-[28px] border border-amber-300/20 bg-[linear-gradient(155deg,rgba(21,27,43,.98),rgba(13,17,28,.98))] shadow-[0_22px_65px_rgba(0,0,0,.28)]"
                >
                  <Link to={`/apartment/${apartment?._id}`}>
                    <div className="relative overflow-hidden">
                      <img
                        src={image}
                        alt={apartment?.title || "Property"}
                        className="h-44 w-full object-cover transition duration-700 hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1020] to-transparent" />
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">
                          {apartment?.title || "Property"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-amber-100/45">
                          {apartment?.location?.city || "hydewest"}
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-300">
                        Active
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                        <p className="text-[10px] font-black text-white/35">
                          CURRENT PRICE
                        </p>
                        <p className="mt-1 font-black text-white">
                          {money(currentPrice)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 p-3">
                        <p className="text-[10px] font-black text-amber-200/55">
                          TARGET PRICE
                        </p>
                        <p className="mt-1 font-black text-amber-300">
                          {money(alert.targetPrice)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAlert(alert._id)}
                      className="mt-4 w-full rounded-2xl border border-red-300/20 bg-red-500/8 px-4 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-500/15"
                    >
                      Remove Alert
                    </button>
                  </div>
                </motion.article>
              );
            })}

            {!alerts.length && (
              <div className="col-span-full rounded-[30px] border border-dashed border-amber-300/20 bg-white/[0.04] py-20 text-center">
                <div className="text-5xl">📉</div>
                <h2 className="mt-4 text-xl font-black text-white">
                  No price alerts yet
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  Set a target price from the Property Details page.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}