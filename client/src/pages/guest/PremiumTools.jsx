import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";

import guestService from "../../services/guest.service";
import guestMembershipService from "../../services/guestMembership.service";
import ListingCard from "../../components/listing/ListingCard";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

const initialForm = {
  city: "",
  budget: "15000",
  days: "4",
  guests: "2",
};

const QUICK_DESTINATIONS = ["Goa", "Jaipur", "Udaipur", "Manali", "Pondicherry"];

const TOOL_TABS = [
  {
    id: "planner",
    label: "AI Trip Planner",
    icon: "🤖",
    description: "Build a day-wise plan from budget and group size.",
  },
  {
    id: "recommendations",
    label: "Smart Picks",
    icon: "🎯",
    description: "Properties selected from your hydewest activity.",
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function StatPill({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function NumberControl({ label, name, value, min = 1, max = 30, onChange }) {
  const numericValue = Number(value || min);

  const setValue = (nextValue) => {
    onChange({
      target: {
        name,
        value: String(Math.min(Math.max(nextValue, min), max)),
      },
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setValue(numericValue - 1)}
          disabled={numericValue <= min}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        >
          −
        </button>
        <span className="min-w-10 text-center text-lg font-black text-slate-950">
          {numericValue}
        </span>
        <button
          type="button"
          onClick={() => setValue(numericValue + 1)}
          disabled={numericValue >= max}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}

function DayTimeline({ itinerary = [] }) {
  return (
    <div className="space-y-4">
      {itinerary.map((day, index) => (
        <motion.article
          key={`${day.day}-${index}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <span className="absolute -right-5 -top-7 text-7xl opacity-[0.05]">
            {index % 2 === 0 ? "✈️" : "🗺️"}
          </span>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-sm font-black text-slate-950 shadow-lg shadow-amber-200/40">
              {day.day || index + 1}
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                Day {day.day || index + 1}
              </p>
              <h3 className="mt-0.5 font-black text-slate-950">
                A balanced travel day
              </h3>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["🌅", "Morning", day.morning],
              ["☀️", "Afternoon", day.afternoon],
              ["🌙", "Evening", day.evening],
            ].map(([icon, label, text]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  {icon} {label}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                  {text || "Flexible time for local exploration."}
                </p>
              </div>
            ))}
          </div>
        </motion.article>
      ))}
    </div>
  );
}

export default function PremiumTools() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const [activeTab, setActiveTab] = useState(
    requestedView === "recommendations" ? "recommendations" : "planner"
  );
  const [membership, setMembership] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [tripPlan, setTripPlan] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");

  const premiumActive = Boolean(membership?.isActive);

  useEffect(() => {
    if (requestedView === "recommendations" || requestedView === "planner") {
      setActiveTab(requestedView);
    }
  }, [requestedView]);

  useEffect(() => {
    let active = true;

    async function loadPremiumTools() {
      try {
        setLoading(true);
        setError("");

        const membershipResponse =
          await guestMembershipService.getMyMembership();

        if (!active) return;

        const summary = membershipResponse.data || null;
        setMembership(summary);

        if (summary?.isActive) {
          try {
            const recommendationResponse =
              await guestService.getRecommendations();

            if (active) {
              setRecommendations(recommendationResponse.data || null);
            }
          } catch (requestError) {
            if (requestError.response?.status !== 403) {
              throw requestError;
            }
          }
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Premium travel tools load nahi hue."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPremiumTools();

    return () => {
      active = false;
    };
  }, []);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ view: tabId });
  };

  const generatePlan = async (event) => {
    event.preventDefault();

    if (!premiumActive) return;

    try {
      setPlanning(true);
      setError("");
      setTripPlan(null);

      const response = await guestService.createTripPlan({
        city: form.city.trim(),
        budget: Number(form.budget || 0),
        days: Number(form.days || 1),
        guests: Number(form.guests || 1),
      });

      setTripPlan(response.data || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Trip plan generate nahi hua."
      );
    } finally {
      setPlanning(false);
    }
  };

  const budgetSplit = useMemo(() => {
    const total = Number(form.budget || 0);
    return {
      stay: Math.round(total * 0.6),
      food: Math.round(total * 0.2),
      activities: Math.round(total * 0.2),
    };
  }, [form.budget]);

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <p className="mt-4 text-sm font-black text-slate-500">
            Preparing your premium travel studio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <GuestPageHeader
          eyebrow="Premium Intelligence"
          title="Your AI travel studio"
          description="Plan trips from budget and duration, then discover stays selected from your hydewest activity."
        />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm font-bold text-red-600"
          >
            {error}
          </motion.div>
        )}

        {!premiumActive ? (
          <section className="relative mt-6 overflow-hidden rounded-[34px] border border-amber-300/25 bg-gradient-to-br from-slate-950 via-amber-950 to-[#8f1238] p-7 text-center text-white shadow-[0_30px_90px_rgba(15,23,42,.25)] sm:p-10">
            <span className="absolute -right-10 -top-16 text-[12rem] opacity-[0.05]">
              👑
            </span>
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-amber-200/30 bg-amber-300/10 text-4xl shadow-xl">
              🤖
            </div>
            <h2 className="relative mt-5 text-3xl font-black sm:text-4xl">
              Premium travel intelligence is locked
            </h2>
            <p className="relative mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Unlock AI Trip Planner, activity-based recommendations, price
              alerts, Host chat and member-only savings with Guest Premium.
            </p>
            <Link
              to="/guest/premium"
              className="relative mt-6 inline-flex rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/25"
            >
              Unlock Premium
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-[30px] border border-amber-300/20 bg-slate-950/90 p-2 shadow-[0_22px_70px_rgba(15,23,42,.2)]">
              <div className="grid gap-2 md:grid-cols-2">
                {TOOL_TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => changeTab(tab.id)}
                      className={`flex items-center gap-4 rounded-[24px] p-4 text-left transition sm:p-5 ${
                        selected
                          ? "bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-lg"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-black/10 text-2xl">
                        {tab.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-black">{tab.label}</span>
                        <span className="mt-1 block text-xs font-semibold opacity-65">
                          {tab.description}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <AnimatePresence mode="wait">
              {activeTab === "planner" ? (
                <motion.section
                  key="planner"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-6 grid items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]"
                >
                  <form
                    onSubmit={generatePlan}
                    className="guest-card overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_65px_rgba(15,23,42,.1)]"
                  >
                    <div className="bg-gradient-to-br from-slate-950 via-amber-950 to-orange-900 p-6 text-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                        AI itinerary builder
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        Tell us the trip basics
                      </h2>
                      <p className="mt-2 text-xs leading-5 text-white/60">
                        Your plan is generated from destination, total budget,
                        travel days and group size.
                      </p>
                    </div>

                    <div className="p-5 sm:p-6">
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                          Destination
                        </span>
                        <input
                          name="city"
                          value={form.city}
                          onChange={update}
                          placeholder="Where do you want to go?"
                          required
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold"
                        />
                      </label>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {QUICK_DESTINATIONS.map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() =>
                              setForm((current) => ({ ...current, city }))
                            }
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-black transition ${
                              form.city === city
                                ? "border-amber-500 bg-amber-400 text-slate-950"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-300"
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>

                      <label className="mt-5 block">
                        <span className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                          <span>Total budget</span>
                          <span className="text-amber-600">
                            {formatCurrency(form.budget)}
                          </span>
                        </span>
                        <input
                          name="budget"
                          type="range"
                          min="5000"
                          max="200000"
                          step="1000"
                          value={form.budget}
                          onChange={update}
                          className="mt-3 w-full accent-amber-500"
                        />
                        <input
                          name="budget"
                          type="number"
                          min="0"
                          value={form.budget}
                          onChange={update}
                          className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold"
                        />
                      </label>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <NumberControl
                          label="Travel days"
                          name="days"
                          value={form.days}
                          min={1}
                          max={30}
                          onChange={update}
                        />
                        <NumberControl
                          label="Guests"
                          name="guests"
                          value={form.guests}
                          min={1}
                          max={20}
                          onChange={update}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <StatPill
                          icon="🏨"
                          label="Stay"
                          value={formatCurrency(budgetSplit.stay)}
                        />
                        <StatPill
                          icon="🍽️"
                          label="Food"
                          value={formatCurrency(budgetSplit.food)}
                        />
                        <StatPill
                          icon="🎟️"
                          label="Explore"
                          value={formatCurrency(budgetSplit.activities)}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={planning}
                        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-amber-200/30 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {planning ? "Creating your itinerary..." : "✨ Generate AI Trip Plan"}
                      </motion.button>
                    </div>
                  </form>

                  <div className="min-w-0">
                    {planning ? (
                      <div className="grid min-h-[520px] place-items-center rounded-[30px] border border-amber-300/20 bg-amber-300/5 p-8 text-center">
                        <div>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                            className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-amber-300/30 bg-amber-300/10 text-4xl"
                          >
                            🤖
                          </motion.div>
                          <h3 className="mt-5 text-2xl font-black text-slate-950">
                            Designing your trip
                          </h3>
                          <p className="mt-2 text-sm text-slate-500">
                            Balancing stay, activities and local experiences...
                          </p>
                        </div>
                      </div>
                    ) : tripPlan ? (
                      <div>
                        <div className="relative overflow-hidden rounded-[30px] border border-amber-300/20 bg-gradient-to-br from-slate-950 via-amber-950 to-orange-900 p-6 text-white shadow-xl sm:p-7">
                          <span className="absolute -right-4 -top-10 text-[9rem] opacity-[0.06]">
                            🗺️
                          </span>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                            Your generated journey
                          </p>
                          <h2 className="relative mt-2 text-3xl font-black">
                            {tripPlan.city} · {tripPlan.days} Days
                          </h2>
                          <p className="relative mt-2 text-sm text-white/65">
                            {formatCurrency(tripPlan.budget)} total budget · {tripPlan.guests} guest(s)
                          </p>
                        </div>

                        <div className="mt-5">
                          <DayTimeline itinerary={tripPlan.itinerary || []} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid min-h-[520px] place-items-center overflow-hidden rounded-[30px] border border-dashed border-amber-300/35 bg-amber-300/5 p-8 text-center">
                        <div>
                          <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="mx-auto grid h-24 w-24 place-items-center rounded-[32px] border border-amber-300/30 bg-gradient-to-br from-amber-300/15 to-orange-500/10 text-5xl"
                          >
                            🗺️
                          </motion.div>
                          <h3 className="mt-5 text-2xl font-black text-slate-950">
                            Your itinerary will appear here
                          </h3>
                          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Choose destination, budget, days and guests. The planner
                            will create a simple morning-to-evening journey.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="recommendations"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-6"
                >
                  <div className="relative overflow-hidden rounded-[30px] border border-amber-300/20 bg-gradient-to-r from-slate-950 via-amber-950 to-[#8f1238] p-6 text-white shadow-xl sm:p-8">
                    <span className="absolute -right-4 -top-12 text-[10rem] opacity-[0.05]">
                      🎯
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                      Personalized for you
                    </p>
                    <h2 className="relative mt-2 text-3xl font-black">
                      Smart property recommendations
                    </h2>
                    <p className="relative mt-2 max-w-2xl text-sm leading-6 text-white/65">
                      {recommendations?.reason ||
                        "As you explore and book more stays, hydewest will improve these suggestions."}
                    </p>
                  </div>

                  {recommendations?.recommendations?.length > 0 ? (
                    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {recommendations.recommendations.map((apartment, index) => (
                        <ListingCard
                          key={apartment._id}
                          apartment={apartment}
                          index={index}
                          membership={membership}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[30px] border border-dashed border-amber-300/35 bg-amber-300/5 px-6 py-16 text-center">
                      <div className="text-5xl">🧭</div>
                      <h3 className="mt-4 text-xl font-black text-slate-950">
                        Keep exploring to improve recommendations
                      </h3>
                      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                        Search properties, open listing details and complete trips.
                        Your activity gives the recommendation engine better signals.
                      </p>
                      <Link
                        to="/guest/search"
                        className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-3 text-sm font-black text-slate-950"
                      >
                        Explore stays
                      </Link>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            {activeTab === "planner" && tripPlan?.stays?.length > 0 && (
              <section className="mt-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                  Budget-matched stays
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Stay options for this plan
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tripPlan.stays.map((apartment, index) => (
                    <ListingCard
                      key={apartment._id}
                      apartment={apartment}
                      index={index}
                      membership={membership}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
