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
  compact = false,
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
  const location = [apartment.location?.city, apartment.location?.state].filter(Boolean).join(", ") || "Location not provided";
  const exclusive = Boolean(apartment.premium?.isExclusive);
  const premiumActive = Boolean(membership?.isActive);
  const premiumDiscount = Number(apartment.premium?.discountPercent || 0);
  const premiumPrice = Math.max(price - price * (premiumDiscount / 100), 0);

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
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.035, 0.25), duration: 0.32 }}
      whileHover={{ y: compact ? -5 : -7, scale: compact ? 1.012 : 1.008 }}
      className="group min-w-0"
    >
      <Link
        to={`/apartment/${apartment._id}`}
        className={`block h-full overflow-hidden border shadow-[0_14px_40px_rgba(40,12,24,.09)] backdrop-blur transition hover:shadow-[0_24px_65px_rgba(40,12,24,.16)] ${
          compact ? "rounded-[22px]" : "rounded-[26px]"
        } ${
          premiumActive
            ? "border-amber-300/30 bg-gradient-to-b from-[#201b12]/90 to-[#101725]/92 hover:border-amber-400"
            : "border-rose-200/65 bg-gradient-to-b from-[#fff8f8]/88 to-[#f4e9ed]/82 hover:border-rose-300"
        }`}
      >
        <div className={`relative overflow-hidden bg-slate-200 ${compact ? "aspect-[16/11]" : "aspect-[4/3]"}`}>
          <img src={image} alt={apartment.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-107" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/65 to-transparent" />

          {String(user?.role || "guest") === "guest" && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={saving}
              onClick={toggle}
              className={`absolute right-3 top-3 grid place-items-center rounded-2xl bg-[#fff8f8]/92 text-xl shadow-lg backdrop-blur ${compact ? "h-9 w-9" : "h-10 w-10"} ${saved ? "text-[#d3134c]" : "text-slate-700"}`}
            >
              {saved ? "♥" : "♡"}
            </motion.button>
          )}

          {apartment.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-[9px] font-black uppercase text-white backdrop-blur">Featured</span>
          )}

          {exclusive && (
            <span className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1.5 text-[9px] font-black text-slate-950">{premiumActive ? "👑 Premium Exclusive" : "🔒 Premium Exclusive"}</span>
          )}
        </div>

        <div className={compact ? "p-3.5" : "p-4"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>{apartment.propertyType || "Property"}</p>
              <h3 className={`mt-1 truncate font-black ${compact ? "text-base" : "text-lg"} ${premiumActive ? "text-white" : "text-slate-950"}`}>{apartment.title}</h3>
              <p className={`mt-1 truncate text-[11px] font-semibold ${premiumActive ? "text-white/45" : "text-slate-500"}`}>📍 {location}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${premiumActive ? "bg-amber-300/15 text-amber-200" : "bg-amber-100/75 text-amber-800"}`}>⭐ {Number(apartment.rating || 0) > 0 ? Number(apartment.rating).toFixed(1) : "New"}</span>
          </div>

          {!compact && (
            <div className={`mt-3 flex flex-wrap gap-2 text-[11px] font-bold ${premiumActive ? "text-white/45" : "text-slate-500"}`}>
              <span>👥 {apartment.guests || 1}</span><span>🛏️ {apartment.bedrooms || 0} rooms</span><span>🚿 {apartment.bathrooms || 1}</span>
            </div>
          )}

          {exclusive && !premiumActive && !compact && (
            <p className="mt-3 rounded-xl bg-amber-100/70 p-2 text-[10px] font-black text-amber-800">Premium members unlock booking and Host chat.</p>
          )}

          <div className={`flex items-end justify-between gap-3 border-t pt-3 ${compact ? "mt-3" : "mt-4"} ${premiumActive ? "border-amber-300/10" : "border-rose-200/60"}`}>
            <div className="min-w-0">
              {premiumActive && premiumDiscount > 0 ? (
                <>
                  <p className="text-[9px] font-bold text-white/35 line-through">₹{Number(price).toLocaleString("en-IN")}</p>
                  <span className={`${compact ? "text-lg" : "text-xl"} font-black text-amber-200`}>₹{Number(premiumPrice).toLocaleString("en-IN")}</span>
                </>
              ) : (
                <span className={`${compact ? "text-lg" : "text-xl"} font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>₹{Number(price).toLocaleString("en-IN")}</span>
              )}
              <span className={`ml-1 text-[10px] font-bold ${premiumActive ? "text-white/35" : "text-slate-500"}`}>/ {UNIT_LABELS[priceUnit] || priceUnit}</span>
            </div>
            <span className={`grid shrink-0 place-items-center rounded-2xl text-white transition ${compact ? "h-9 w-9" : "h-10 w-10"} ${premiumActive ? "bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950" : "bg-slate-950 group-hover:bg-[#d3134c]"}`}>↗</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}