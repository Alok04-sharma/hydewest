import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";

import listingService from "../../services/listing.service";
import guestMembershipService from "../../services/guestMembership.service";
import ListingCard from "../../components/listing/ListingCard";

const propertyTypes = [
  "Apartment", "House", "Villa", "Cabin", "Farm House", "Hotel", "Resort",
  "Hostel", "Guest House", "Studio", "Room", "Cottage", "Tree House", "Tent",
];

const priceUnits = [
  ["hour", "Hourly", "⏱️"],
  ["night", "Nightly", "🌙"],
  ["week", "Weekly", "🗓️"],
  ["month", "Monthly", "🏡"],
];

const premiumFilterOptions = [
  ["instantBook", "Instant booking", "⚡"],
  ["selfCheckIn", "Self check-in", "🔑"],
  ["petFriendly", "Pet friendly", "🐾"],
  ["superLuxury", "Super luxury", "💎"],
  ["premiumExclusive", "Premium exclusive", "👑"],
];

const createInitialFilters = (searchParams) => ({
  location: searchParams.get("location") || "",
  propertyType: searchParams.get("propertyType") || "",
  minPrice: searchParams.get("minPrice") || "",
  maxPrice: searchParams.get("maxPrice") || "",
  priceUnit: searchParams.get("priceUnit") === "day" ? "night" : searchParams.get("priceUnit") || "night",
  guests: searchParams.get("guests") || "1",
  checkIn: searchParams.get("checkIn") || "",
  checkOut: searchParams.get("checkOut") || "",
  sortBy: searchParams.get("sortBy") || "newest",
  instantBook: searchParams.get("instantBook") === "true",
  selfCheckIn: searchParams.get("selfCheckIn") === "true",
  petFriendly: searchParams.get("petFriendly") === "true",
  superLuxury: searchParams.get("superLuxury") === "true",
  premiumExclusive: searchParams.get("premiumExclusive") === "true",
});

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => createInitialFilters(searchParams));
  const [membership, setMembership] = useState(null);
  const [result, setResult] = useState({ apartments: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [premiumFiltersOpen, setPremiumFiltersOpen] = useState(false);

  const premiumActive = Boolean(membership?.isActive);
  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => {
      if (["guests", "sortBy", "priceUnit"].includes(key)) return false;
      return value !== "" && value !== false;
    }).length,
    [filters]
  );

  useEffect(() => {
    let active = true;
    async function loadMembership() {
      try {
        const response = await guestMembershipService.getMyMembership();
        if (active) setMembership(response.data || null);
      } catch {
        if (active) setMembership(null);
      }
    }
    loadMembership();
    return () => { active = false; };
  }, []);

  const buildParams = (selectedFilters, page) => {
    const params = { ...selectedFilters, page, limit: 12 };
    if (!premiumActive) {
      premiumFilterOptions.forEach(([name]) => { params[name] = false; });
      if (["cleaning_low", "best_value"].includes(params.sortBy)) params.sortBy = "newest";
    }
    Object.keys(params).forEach((key) => {
      if (params[key] === false || params[key] === "" || params[key] === null) delete params[key];
    });
    return params;
  };

  const search = async (page = 1, selectedFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = buildParams(selectedFilters, page);
      setSearchParams(params, { replace: true });
      const response = await listingService.search(params);
      setResult(response.data || { apartments: [], total: 0, totalPages: 1, page: 1 });
      setMobileFiltersOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Search run nahi hua.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search(1, createInitialFilters(searchParams));
    // Membership decides whether Premium-only filters may be sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premiumActive]);

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setFilters((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const reset = () => {
    const initial = createInitialFilters(new URLSearchParams());
    setFilters(initial);
    search(1, initial);
  };

  const inputClass = `w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
    premiumActive
      ? "border-amber-300/20 bg-white/[0.07] text-white placeholder:text-white/35 focus:border-amber-300/60"
      : "border-rose-200/70 bg-[#fff8f8]/85 text-slate-800 placeholder:text-slate-400 focus:border-[#d3134c] focus:ring-4 focus:ring-rose-100/70"
  }`;

  const horizontalFilters = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_.8fr_.8fr_.65fr_.8fr]">
        <Field label="City, landmark or location">
          <input name="location" value={filters.location} onChange={update} placeholder="Goa, Jaipur, beach..." className={inputClass} />
        </Field>
        <Field label="Property category">
          <select name="propertyType" value={filters.propertyType} onChange={update} className={inputClass}>
            <option value="">All categories</option>
            {propertyTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
        <Field label="Check-in">
          <input name="checkIn" type="date" value={filters.checkIn} onChange={update} className={inputClass} />
        </Field>
        <Field label="Check-out">
          <input name="checkOut" type="date" min={filters.checkIn || undefined} value={filters.checkOut} onChange={update} className={inputClass} />
        </Field>
        <Field label="Guests">
          <input name="guests" type="number" min="1" value={filters.guests} onChange={update} className={inputClass} />
        </Field>
        <Field label="Sort results">
          <select name="sortBy" value={filters.sortBy} onChange={update} className={inputClass}>
            <option value="newest">Newest</option>
            <option value="price_low">Price: low</option>
            <option value="price_high">Price: high</option>
            <option value="rating">Highest rated</option>
            <option value="popular">Most popular</option>
            <option value="cleaning_low" disabled={!premiumActive}>Lowest cleaning fee {!premiumActive ? "🔒" : ""}</option>
            <option value="best_value" disabled={!premiumActive}>Best value {!premiumActive ? "🔒" : ""}</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${premiumActive ? "text-amber-200/55" : "text-slate-500"}`}>Price type</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {priceUnits.map(([value, label, icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilters((current) => ({ ...current, priceUnit: value }))}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                  filters.priceUnit === value
                    ? premiumActive
                      ? "border-amber-300 bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/20"
                      : "border-[#d3134c] bg-[#d3134c] text-white shadow-lg shadow-rose-200"
                    : premiumActive
                      ? "border-amber-300/15 bg-white/[0.06] text-white/65 hover:border-amber-300/40"
                      : "border-rose-200/70 bg-[#fff8f8]/80 text-slate-600 hover:border-rose-300"
                }`}
              >
                <span className="mr-1.5">{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:w-[340px]">
          <Field label={`Minimum / ${filters.priceUnit}`}>
            <input name="minPrice" type="number" min="0" value={filters.minPrice} onChange={update} placeholder="₹0" className={inputClass} />
          </Field>
          <Field label={`Maximum / ${filters.priceUnit}`}>
            <input name="maxPrice" type="number" min="0" value={filters.maxPrice} onChange={update} placeholder="Any" className={inputClass} />
          </Field>
        </div>

        <div className="flex gap-2 xl:pb-0.5">
          <button type="button" onClick={reset} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${premiumActive ? "border-amber-300/20 bg-white/[0.06] text-white/65" : "border-rose-200 bg-rose-100/60 text-slate-700"}`}>Reset</button>
          <button type="button" onClick={() => search(1)} className={`rounded-xl px-5 py-2.5 text-xs font-black shadow-lg ${premiumActive ? "bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-amber-950/20" : "bg-gradient-to-r from-[#d3134c] to-[#aa0b38] text-white shadow-rose-200"}`}>Search stays</button>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border ${premiumActive ? "border-amber-300/15 bg-white/[0.04]" : "border-rose-200/60 bg-rose-100/35"}`}>
        <button type="button" onClick={() => setPremiumFiltersOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left">
          <span>
            <span className={`block text-xs font-black ${premiumActive ? "text-amber-200" : "text-slate-950"}`}>👑 Premium filters</span>
            <span className={`mt-0.5 block text-[10px] ${premiumActive ? "text-white/40" : "text-slate-500"}`}>{premiumActive ? "Member filters are active." : "Visible now, unlocked with Premium."}</span>
          </span>
          <span className="flex items-center gap-2">
            {!premiumActive && <Link to="/guest/premium" onClick={(event) => event.stopPropagation()} className="rounded-xl bg-slate-950 px-3 py-1.5 text-[9px] font-black text-white">Upgrade</Link>}
            <motion.span animate={{ rotate: premiumFiltersOpen ? 180 : 0 }}>⌄</motion.span>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {premiumFiltersOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid gap-2 border-t border-current/10 p-3 sm:grid-cols-2 lg:grid-cols-5">
                {premiumFilterOptions.map(([name, label, icon]) => (
                  <label key={name} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold ${premiumActive ? "cursor-pointer border-amber-300/15 bg-white/[0.05] text-white/70" : "cursor-not-allowed border-rose-200/60 bg-[#fff8f8]/50 text-slate-400"}`}>
                    <span><span className="mr-2">{icon}</span>{label}</span>
                    <span className="flex items-center gap-2">{!premiumActive && <span>🔒</span>}<input name={name} type="checkbox" checked={Boolean(filters[name])} onChange={update} disabled={!premiumActive} className="h-4 w-4 accent-[#d3134c]" /></span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className={`guest-page min-h-screen px-4 pb-12 pt-16 sm:px-6 lg:px-8 ${premiumActive ? "bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.14),transparent_28rem),linear-gradient(180deg,#0b1020_0%,#111827_100%)]" : "bg-[radial-gradient(circle_at_8%_0%,rgba(255,56,92,.11),transparent_28rem),linear-gradient(180deg,#fff1f3_0%,#eef2f7_100%)]"}`}>
      <div className="mx-auto max-w-[1500px]">
        <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`overflow-hidden rounded-[30px] border p-5 shadow-xl backdrop-blur sm:p-7 ${premiumActive ? "border-amber-300/20 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-amber-950/90 text-white" : "border-rose-200/60 bg-gradient-to-br from-[#fff8f8]/90 via-rose-50/80 to-violet-50/75 text-slate-950"}`}>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.22em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>{premiumActive ? "👑 Premium Discovery" : "hydewest Search"}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Search stays without the clutter.</h1>
              <p className={`mt-2 max-w-2xl text-sm leading-6 ${premiumActive ? "text-white/55" : "text-slate-600"}`}>All important filters now stay in one horizontal workspace.</p>
            </div>
            <div className={`rounded-2xl px-4 py-2.5 text-sm font-black ${premiumActive ? "bg-amber-300 text-slate-950" : "bg-rose-100/80 text-[#a90836]"}`}>{result.total || 0} properties found</div>
          </div>
        </motion.header>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-100/75 p-4 text-sm font-bold text-red-800">{error}</div>}

        <button type="button" onClick={() => setMobileFiltersOpen(true)} className={`mt-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-black shadow-sm lg:hidden ${premiumActive ? "border-amber-300/20 bg-white/[0.06] text-white" : "border-rose-200 bg-[#fff8f8]/80 text-slate-800"}`}>
          <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span><span>☰</span>
        </button>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 hidden rounded-[28px] border p-4 shadow-[0_18px_55px_rgba(15,23,42,.12)] backdrop-blur-xl lg:block ${premiumActive ? "border-amber-300/15 bg-[#111827]/88" : "border-rose-200/60 bg-[#fff7f8]/88"}`}>
          {horizontalFilters}
        </motion.section>

        <main className="mt-8 min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className={`rounded-[22px] px-4 py-3 ${premiumActive ? "bg-amber-300/10" : "bg-rose-100/65"}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>Search results</p>
              <h2 className={`mt-1 text-2xl font-black ${premiumActive ? "text-white" : "text-slate-950"}`}>Available Properties</h2>
              <p className={`mt-1 text-xs ${premiumActive ? "text-white/45" : "text-slate-600"}`}>Prices shown for {filters.priceUnit} bookings.</p>
            </div>
            {premiumActive && <span className="rounded-full bg-amber-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-950">Premium prices active</span>}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => <div key={index} className="skeleton-shimmer h-[350px] rounded-[26px]" />)}
            </div>
          ) : result.apartments?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.apartments.map((apartment, index) => <ListingCard
                  key={apartment._id}
                  apartment={apartment}
                  index={index}
                  membership={membership}
                  priceUnit={filters.priceUnit}
                  premiumSearch={premiumActive}
                  compact
                />)}
            </div>
          ) : (
            <div className={`rounded-[30px] border border-dashed p-12 text-center ${premiumActive ? "border-amber-300/20 bg-white/[0.05] text-white" : "border-rose-300/70 bg-[#fff8f8]/70"}`}>
              <div className="text-5xl">🏠</div><h3 className="mt-4 text-xl font-black">No matching stays</h3><p className={`mt-2 text-sm ${premiumActive ? "text-white/45" : "text-slate-500"}`}>Try a wider price range or different dates.</p>
            </div>
          )}

          {result.totalPages > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {Array.from({ length: result.totalPages }, (_, index) => index + 1).map((page) => (
                <button key={page} type="button" onClick={() => search(page)} className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-black ${Number(result.page) === page ? premiumActive ? "bg-amber-400 text-slate-950" : "bg-[#d3134c] text-white" : premiumActive ? "border border-amber-300/15 bg-white/[0.05] text-white/60" : "border border-rose-200 bg-rose-100/50 text-slate-600"}`}>{page}</button>
              ))}
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileFiltersOpen(false)} className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-sm lg:hidden" />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className={`staynest-scrollbar fixed inset-y-0 right-0 z-[100] w-[min(94vw,420px)] overflow-y-auto p-5 shadow-2xl lg:hidden ${premiumActive ? "bg-[#0b1020] text-white" : "bg-[#fff4f5] text-slate-900"}`}>
              <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">Search filters</h2><button type="button" onClick={() => setMobileFiltersOpen(false)} className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${premiumActive ? "bg-white/10" : "bg-rose-100"}`}>×</button></div>
              {horizontalFilters}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}