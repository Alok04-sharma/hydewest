import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import guestService from "../../services/guest.service";
import guestMembershipService from "../../services/guestMembership.service";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

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
          "Price alerts load nahi hue."
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
      setAlerts((current) =>
        current.filter((alert) => alert._id !== alertId)
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Price alert remove nahi hua."
      );
    }
  };

  const premiumActive = Boolean(membership?.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-white to-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <GuestPageHeader
          eyebrow="Premium Price Alerts"
          title="Track price drops automatically"
          description="Saved property ka price target tak girte hi StayNest notification generate karega."
          action={
            <Link
              to="/guest/search"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Find properties
            </Link>
          }
        />

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
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
              exclusive stays aur member discount unlock karein.
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
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
          </div>
        ) : premiumActive ? (
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert, index) => {
              const apartment = alert.apartment;
              const image =
                apartment?.images?.find((item) => item?.isCover)?.url ||
                apartment?.images?.[0]?.url ||
                apartment?.images?.[0] ||
                "https://placehold.co/800x500?text=StayNest";
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
                  whileHover={{ y: -4 }}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <Link to={`/apartment/${apartment?._id}`}>
                    <img
                      src={image}
                      alt={apartment?.title || "Property"}
                      className="h-44 w-full object-cover"
                    />
                  </Link>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">
                          {apartment?.title || "Property"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {apartment?.location?.city || "StayNest"}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                        Active
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-black text-slate-400">
                          CURRENT PRICE
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          {money(currentPrice)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-rose-50 p-3">
                        <p className="text-[10px] font-black text-rose-400">
                          TARGET PRICE
                        </p>
                        <p className="mt-1 font-black text-[#FF385C]">
                          {money(alert.targetPrice)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAlert(alert._id)}
                      className="mt-4 w-full rounded-2xl border border-red-200 px-4 py-2.5 text-xs font-black text-red-600"
                    >
                      Remove Alert
                    </button>
                  </div>
                </motion.article>
              );
            })}

            {!alerts.length && (
              <div className="col-span-full rounded-[30px] border border-dashed border-slate-300 bg-white py-20 text-center">
                <div className="text-5xl">📉</div>
                <h2 className="mt-4 text-xl font-black text-slate-950">
                  No price alerts yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Property details page se target price set karein.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}