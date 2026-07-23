import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiHome, FiRefreshCw } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllListings, searchListingsThunk, setFilter } from "../../redux/slices/listingSlice";
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

  useEffect(() => {
    dispatch(fetchAllListings());
  }, [dispatch]);

  const handleCategorySelect = (typeValue) => {
    setSelectedCategory(typeValue);
    const query = typeValue ? { propertyType: typeValue } : {};
    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 sm:pb-12">
      <section className="relative overflow-hidden border-b border-white/70 bg-gradient-to-br from-white via-rose-50/50 to-violet-50/60">
        <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-7 pt-9 text-center sm:px-6 sm:pb-10 sm:pt-14 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF385C] shadow-sm backdrop-blur"
          >
            <FiHome /> Curated stays across India
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mx-auto mt-4 max-w-4xl text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
          >
            Find a place that feels like it was made for you.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base"
          >
            Explore verified apartments, villas, resorts and unique homes with a clean booking experience.
          </motion.p>
          <div className="relative z-10 mt-6">
            <SearchBar />
          </div>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-b border-slate-200/70 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.value;
            return (
              <motion.button
                key={category.name}
                type="button"
                onClick={() => handleCategorySelect(category.value)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-black transition sm:px-4 ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                    : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-[#FF385C]"
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="whitespace-nowrap">{category.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <main className="mx-auto mt-7 max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF385C]">Approved listings</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Places worth discovering</h2>
            <p className="mt-1 text-sm text-slate-500">Every property shown here is approved by StayNest.</p>
          </div>
          {!loading && listings.length > 0 && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm">
              {listings.length} stays found
            </span>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="skeleton-shimmer aspect-square rounded-2xl" />
                <div className="skeleton-shimmer mt-4 h-4 rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-2/3 rounded-full" />
                <div className="skeleton-shimmer mt-4 h-5 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto my-10 max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <p className="font-black text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchAllListings())}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white"
            >
              <FiRefreshCw /> Try again
            </button>
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="mx-auto my-10 max-w-md rounded-[30px] border border-slate-200 bg-white px-6 py-14 text-center shadow-lg">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-3xl">🏖️</div>
            <p className="mt-5 text-xl font-black text-slate-950">No properties found</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Choose another category or clear your current search filters.</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {listings.map((item, index) => (
              <ListingCard key={item._id} apartment={item} index={index} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}