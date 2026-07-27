import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import wishlistService from "../../services/wishlist.service";

const UNIT_LABELS = {
  hour: "hr",
  night: "night",
  day: "day",
  week: "week",
  month: "month",
};

const getPrice = (apartment, unit) => {
  const pricing = apartment?.pricing || {};
  return Number(
    pricing.rates?.[unit] ||
      (unit === "day" ? pricing.basePrice : 0) ||
      (unit === "night" ? pricing.pricePerNight : 0) ||
      pricing.basePrice ||
      pricing.pricePerNight ||
      0
  );
};



export default function ListingCard({
  apartment,
  index = 0,
  membership = null,
  priceUnit = "night",
  premiumSearch = false,
}) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!apartment) return null;

  const image =
    apartment.images?.find((item) => item.isCover)?.url ||
    apartment.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=85";
  const price = getPrice(apartment, priceUnit);
  const location =
    [apartment.location?.city, apartment.location?.state]
      .filter(Boolean)
      .join(", ") || "Location not provided";
  const exclusive = Boolean(apartment.premium?.isExclusive);
  const premiumActive = Boolean(membership?.isActive);
  const premiumCard = Boolean(premiumActive && premiumSearch);
  const premiumDiscount = Number(apartment.premium?.discountPercent || 0);
  const premiumPrice = Math.max(
    price - price * (premiumDiscount / 100),
    0
  );

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) return navigate("/login");
    if (String(user?.role || "guest") !== "guest") return;

    try {
      setSaving(true);
      if (saved) await wishlistService.removeFromWishlist(apartment._id);
      else await wishlistService.addToWishlist(apartment._id);
      setSaved((value) => !value);
    } catch (error) {
      if (error.response?.status === 403) navigate("/guest/premium");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -7 }}
      className="group h-full min-w-0"
    >
      <Link
        to={`/apartment/${apartment._id}`}
        className={`flex h-full min-h-[390px] flex-col overflow-hidden rounded-[26px] border shadow-[0_14px_40px_rgba(15,23,42,.08)] transition hover:shadow-[0_24px_65px_rgba(15,23,42,.15)] ${
          premiumCard
            ? "border-amber-300/20 bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.12),transparent_16rem),linear-gradient(155deg,#141b2d_0%,#0c111d_62%,#1f1609_100%)] text-white shadow-[0_18px_55px_rgba(0,0,0,.30)] hover:border-amber-300/45 hover:shadow-[0_28px_75px_rgba(0,0,0,.42)]"
            : "border-slate-200 bg-white hover:border-rose-200"
        }`}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-200">
          <img
            src={image}
            alt={apartment.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 to-transparent" />

          {String(user?.role || "guest") === "guest" && (
            <button
              type="button"
              disabled={saving}
              onClick={toggle}
              className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-2xl text-xl shadow-lg backdrop-blur ${
                premiumCard
                  ? saved
                    ? "border border-amber-300/30 bg-amber-300 text-slate-950"
                    : "border border-white/15 bg-slate-950/75 text-amber-100"
                  : saved
                    ? "bg-white/90 text-[#FF385C]"
                    : "bg-white/90 text-slate-700"
              }`}
            >
              {saved ? "♥" : "♡"}
            </button>
          )}

          {apartment.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black uppercase text-white">
              Featured
            </span>
          )}

          {exclusive && (
            <span className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black text-slate-950">
              {premiumActive ? "👑 Premium Exclusive" : "🔒 Premium Exclusive"}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                  premiumCard ? "text-amber-300" : premiumActive ? "text-amber-700" : "text-[#FF385C]"
                }`}
              >
                {apartment.propertyType || "Property"}
              </p>
              <h3 title={apartment.title}
                className={`mt-1 line-clamp-2 min-h-[3.25rem] text-lg font-black ${premiumCard ? "text-white" : "text-slate-950"}`}>
                {apartment.title}
              </h3>
              <p className={`mt-1 truncate text-xs font-semibold ${premiumCard ? "text-amber-50/45" : "text-slate-400"}`}>
                📍 {location}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${premiumCard ? "border border-amber-300/20 bg-amber-300/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
              ⭐{" "}
              {Number(apartment.rating || 0) > 0
                ? Number(apartment.rating).toFixed(1)
                : "New"}
            </span>
          </div>

          <div className={`mt-3 flex flex-wrap gap-2 text-[11px] font-bold ${premiumCard ? "text-white/55" : "text-slate-500"}`}>
            <span>👥 {apartment.guests || 1}</span>
            <span>🛏️ {apartment.bedrooms || 0} rooms</span>
            <span>🚿 {apartment.bathrooms || 1}</span>
          </div>

          {exclusive && !premiumActive && (
            <p className="mt-3 rounded-xl bg-amber-50 p-2 text-[10px] font-black text-amber-700">
              Premium members can unlock booking and Host chat.
            </p>
          )}
          <div className={`mt-auto flex items-end justify-between gap-3 border-t pt-4 ${premiumCard ? "border-amber-300/12" : "border-slate-100"}`}>
            <div className="min-w-0">
              {premiumActive && premiumDiscount > 0 ? (
                <>
                  <p className={`text-[10px] font-bold line-through ${premiumCard ? "text-white/35" : "text-slate-400"}`}>
                    ₹{Number(price).toLocaleString("en-IN")}
                  </p>
                  <span className={`text-xl font-black ${premiumCard ? "text-amber-300" : "text-amber-800"}`}>
                    ₹{Number(premiumPrice).toLocaleString("en-IN")}
                  </span>
                </>
              ) : (
                <span className={`text-xl font-black ${premiumCard ? "text-white" : "text-slate-950"}`}>
                  ₹{Number(price).toLocaleString("en-IN")}
                </span>
              )}
              <span className={`ml-1 text-xs font-bold ${premiumCard ? "text-white/40" : "text-slate-400"}`}>
                / {UNIT_LABELS[priceUnit] || priceUnit}
              </span>
              {premiumDiscount > 0 && (
                <p className={`truncate text-[10px] font-black ${premiumCard ? "text-emerald-300" : "text-emerald-600"}`}>
                  👑 {premiumDiscount}% Premium discount
                </p>
              )}
            </div>
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white transition ${
                premiumCard
                  ? "bg-gradient-to-br from-slate-950 to-amber-700"
                  : "bg-slate-950 group-hover:bg-[#FF385C]"
              }`}
            >
              ↗
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}