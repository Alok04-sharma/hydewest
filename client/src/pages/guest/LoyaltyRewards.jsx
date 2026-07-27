import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import loyaltyService from "../../services/loyalty.service";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function LoyaltyRewards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await loyaltyService.getMyLoyalty();
        if (active) setData(response.data);
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "The loyalty wallet could not be loaded."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const account = data?.account || {};
  const pointsPerRupee = Math.max(
    Number(data?.config?.POINTS_PER_RUPEE_DISCOUNT || 100),
    1
  );
  const maxRedemptionPercent = Number(
    data?.config?.MAX_REDEMPTION_PERCENT || 15
  );
  const cashValue = Number(account.balance || 0) / pointsPerRupee;

  const cards = useMemo(
    () => [
      ["Lifetime earned", account.lifetimeEarned || 0, "🎁"],
      ["Redeemed", account.lifetimeRedeemed || 0, "💸"],
      ["Reversed", account.lifetimeReversed || 0, "↩️"],
      ["Booking value", money(cashValue), "₹"],
    ],
    [account, cashValue]
  );

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <GuestPageHeader
          eyebrow="Loyalty Rewards"
          title="Your hydewest points wallet"
          description={`Earn points from successful bookings. ${pointsPerRupee} points are worth ₹1, and up to ${maxRedemptionPercent}% of an eligible booking can be paid with points.`}
        />

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-400 via-orange-500 to-[#FF385C] p-7 text-white shadow-xl"
        >
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                Available balance
              </p>
              <p className="mt-3 text-5xl font-black">{account.balance || 0}</p>
              <p className="mt-1 text-sm font-bold text-white/75">
                loyalty points · {money(cashValue)} booking value
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-black capitalize backdrop-blur">
                {account.tier || "explorer"} tier
              </span>
              <Link
                to="/guest/search"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-1"
              >
                Use points on a booking →
              </Link>
            </div>
          </div>
        </motion.section>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([label, value, icon], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm"
            >
              <span className="text-2xl">{icon}</span>
              <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
              <p className="text-xs font-bold text-slate-400">{label}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <h2 className="text-lg font-black text-emerald-950">
            How to redeem points
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Open an approved property, select your stay dates, and enter the number
            of points in the booking card. The price quote will immediately show the
            loyalty discount before you continue to payment.
          </p>
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black text-slate-950">Points history</h2>
            <p className="mt-1 text-xs text-slate-400">
              Complete ledger of rewards, referrals, redemptions, and reversals.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.transactions || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-black capitalize text-slate-800">
                    {item.type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-black ${
                      item.direction === "credit" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {item.direction === "credit" ? "+" : "-"}
                    {item.points}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    Balance {item.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
            {!data?.transactions?.length && (
              <div className="p-12 text-center text-sm font-semibold text-slate-400">
                No points transactions yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}