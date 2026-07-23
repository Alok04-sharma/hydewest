import React from "react";
import { motion } from "framer-motion";
import { FiArrowUpRight, FiHeart, FiMapPin, FiStar, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

export default function ListingCard({ apartment, index = 0 }) {
  if (!apartment) return null;

  const mainImage =
    apartment.images?.find((image) => image.isCover)?.url ||
    apartment.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=85";

  const locationText = [apartment.location?.city, apartment.location?.state]
    .filter(Boolean)
    .join(", ") || "Location not provided";

  const price = Number(apartment.pricing?.basePrice || apartment.pricing?.pricePerNight || 0);
  const priceUnit = apartment.pricing?.priceUnit || "night";
  const currencySymbol = apartment.pricing?.currency === "USD" ? "$" : "₹";
  const rating = Number(apartment.rating || 0);

  return (
    <motion.article
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: Math.min(index * 0.045, 0.35), duration: 0.42 }}
      whileHover={{ y: -8 }}
      className="group min-w-0"
    >
      <Link
        to={`/apartment/${apartment._id}`}
        className="block h-full overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition duration-300 hover:border-rose-200 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200 sm:aspect-square">
          <motion.img
            src={mainImage}
            alt={apartment.title || "StayNest property"}
            loading="lazy"
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.075 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />

          <button
            type="button"
            onClick={(event) => event.preventDefault()}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border border-white/40 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 hover:text-[#FF385C]"
            aria-label="Add to wishlist"
          >
            <FiHeart />
          </button>

          {apartment.isFeatured && (
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg backdrop-blur">
              Featured stay
            </span>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            <FiMapPin /> {locationText}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FF385C]">
                {apartment.propertyType || "Property"}
              </p>
              <h3 className="mt-1.5 truncate text-base font-black text-slate-950 sm:text-lg">
                {apartment.title || locationText}
              </h3>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
              <FiStar className="fill-current" /> {rating > 0 ? rating.toFixed(1) : "New"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><FiUsers /> {apartment.guests || 1} guests</span>
            <span>{apartment.bedrooms || 0} bedrooms</span>
            <span>{apartment.bathrooms || 0} baths</span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <span className="text-xl font-black text-slate-950">
                {currencySymbol}{price.toLocaleString("en-IN")}
              </span>
              <span className="ml-1 text-xs font-semibold text-slate-400">/ {priceUnit}</span>
            </div>
            <motion.span
              whileHover={{ x: 2, y: -2 }}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg transition group-hover:bg-[#FF385C]"
            >
              <FiArrowUpRight />
            </motion.span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}