import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllListings,
  searchListingsThunk,
  setFilter,
} from "../../redux/slices/listingSlice";
import ListingCard from "../../components/listing/ListingCard.jsx";
import SearchBar from "../../components/home/SearchBar.jsx";

const CATEGORIES = [
  { name: "All Stays", icon: "🏡", value: "" },
  { name: "Apartment", icon: "🏢", value: "Apartment" },
  { name: "Villa", icon: "🏰", value: "Villa" },
  { name: "House", icon: "🏠", value: "House" },
  { name: "Cabin", icon: "🛖", value: "Cabin" },
  { name: "Farm House", icon: "🌾", value: "Farm House" },
  { name: "Hotel", icon: "🏨", value: "Hotel" },
  { name: "Resort", icon: "🏖️", value: "Resort" },
];

export default function Home() {
  const dispatch = useDispatch();
  const { listings, loading, error } = useSelector((state) => state.listing);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchDocked, setSearchDocked] = useState(false);

  useEffect(() => {
    dispatch(fetchAllListings());
  }, [dispatch]);

  useEffect(() => {
    const handleScroll = () => {
      const nextDocked = window.scrollY > 205;
      setSearchDocked((current) =>
        current === nextDocked ? current : nextDocked
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.dispatchEvent(
        new CustomEvent("hydewest:home-search-docked", {
          detail: { docked: false },
        })
      );
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("hydewest:home-search-docked", {
        detail: { docked: searchDocked },
      })
    );
  }, [searchDocked]);

  const handleCategorySelect = (typeValue) => {
    setSelectedCategory(typeValue);
    const query = typeValue ? { propertyType: typeValue } : {};
    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_0%,rgba(255,56,92,.12),transparent_25rem),radial-gradient(circle_at_95%_10%,rgba(139,92,246,.09),transparent_28rem),linear-gradient(180deg,#fff1f3_0%,#f7edf0_38%,#eef2f7_100%)] pb-16">
      <section className="relative overflow-hidden border-b border-rose-200/45">
        <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-violet-300/16 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-7 text-center sm:px-6 sm:pb-14 sm:pt-9 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-[#fff8f8]/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.19em] text-[#bd123f] shadow-sm backdrop-blur"
          >
            ✦ Verified stays, flexible durations
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
          >
            Find a stay that fits your time, not the other way around.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-2 max-w-xl text-xs font-medium leading-5 text-slate-600 sm:text-sm"
          >
            Book approved properties by hour, night, day, week or month.
          </motion.p>
        </div>
      </section>

      <div className="relative z-40 -mt-7 h-[74px] px-4 sm:px-6 lg:px-8">
        <motion.div
          layout
          transition={{
            layout: { type: "spring", stiffness: 280, damping: 30 },
            duration: 0.28,
          }}
          className={
            searchDocked
              ? "fixed inset-x-0 top-2 z-[70] px-3 sm:px-5"
              : "relative mx-auto max-w-[1034px]"
          }
        >
          <motion.div
            layout
            animate={{
              scale: searchDocked ? 0.97 : 1,
              y: searchDocked ? 0 : 0,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className={`mx-auto border border-rose-200/60 bg-[#fff4f5]/82 shadow-[0_22px_60px_rgba(86,20,42,.15)] backdrop-blur-xl transition-[max-width,padding,border-radius] duration-300 ${
              searchDocked
                ? "max-w-[778px] rounded-[22px] p-1.5"
                : "max-w-[1034px] rounded-[28px] p-2"
            }`}
          >
            <SearchBar compact={searchDocked} />
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-1 border-y border-rose-200/45 bg-rose-100/30 backdrop-blur">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.value;

            return (
              <motion.button
                key={category.name}
                type="button"
                onClick={() => handleCategorySelect(category.value)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition ${
                  active
                    ? "border-[#a90836] bg-[#a90836] text-white shadow-lg shadow-rose-200"
                    : "border-rose-200/70 bg-[#fff8f8]/68 text-slate-600 hover:border-rose-300 hover:bg-rose-100/75 hover:text-[#9f0a35]"
                }`}
              >
                <span className="text-base">{category.icon}</span>
                <span className="whitespace-nowrap">{category.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <main
        id="home-properties"
        className="mx-auto mt-7 max-w-[1600px] scroll-mt-24 px-4 sm:px-6 lg:px-8"
      >
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bd123f]">
              Approved properties
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
              Places worth discovering
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Every property shown here is reviewed by hydewest.
            </p>
          </div>

          {!loading && listings.length > 0 && (
            <span className="rounded-full border border-rose-200/70 bg-rose-100/55 px-3 py-1.5 text-xs font-black text-slate-600">
              {listings.length} stays found
            </span>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[22px] border border-rose-200/60 bg-rose-100/45 p-3"
              >
                <div className="skeleton-shimmer aspect-[16/11] rounded-2xl" />
                <div className="skeleton-shimmer mt-3 h-4 rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-2/3 rounded-full" />
                <div className="skeleton-shimmer mt-3 h-5 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto my-10 max-w-xl rounded-3xl border border-red-200 bg-red-100/70 p-6 text-center">
            <p className="font-black text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchAllListings())}
              className="mt-4 rounded-2xl bg-red-700 px-4 py-2.5 text-sm font-black text-white"
            >
              ↻ Try again
            </button>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="mx-auto my-10 max-w-md rounded-[30px] border border-rose-200/70 bg-rose-100/45 px-6 py-14 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-100 text-3xl">
              🏖️
            </div>
            <p className="mt-5 text-xl font-black text-slate-950">
              No properties found
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose another category or clear your current filters.
            </p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {listings.map((item, index) => (
              <ListingCard
                key={item._id}
                apartment={item}
                index={index}
                compact
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}