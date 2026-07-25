import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch } from "react-redux";
import {
  searchListingsThunk,
  setFilter,
} from "../../redux/slices/listingSlice";

const types = [
  "Apartment",
  "House",
  "Villa",
  "Cabin",
  "Farm House",
  "Hotel",
  "Resort",
];

export default function SearchBar({ compact = false }) {
  const [city, setCityInput] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [guests, setGuests] = useState("");
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const dispatch = useDispatch();

  const handleSearch = (event) => {
    event?.preventDefault();

    const query = {};
    if (city.trim()) query.city = city.trim();
    if (propertyType) query.propertyType = propertyType;
    if (guests) query.guests = guests;

    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));
    setIsMobileModalOpen(false);

    window.requestAnimationFrame(() => {
      document
        .getElementById("home-properties")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const clear = () => {
    setCityInput("");
    setPropertyType("");
    setGuests("");
  };

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsMobileModalOpen(true)}
        className={`flex w-full items-center justify-between border border-rose-200/70 bg-[#fff8f8]/94 text-left shadow-[0_14px_35px_rgba(86,20,42,.12)] backdrop-blur md:hidden ${
          compact ? "rounded-2xl px-3 py-2" : "rounded-[22px] px-4 py-3"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#ff385c] to-[#b20b3b] text-white ${
              compact ? "h-8 w-8 rounded-xl text-sm" : "h-10 w-10 rounded-2xl"
            }`}
          >
            ⌕
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black text-slate-950">
              {city.trim() || "Where do you want to stay?"}
            </span>
            {!compact && (
              <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">
                {propertyType || "Any property"} · {guests ? `${guests} guests` : "Add guests"}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-[#bd123f]">☰</span>
      </motion.button>

      <form
        onSubmit={handleSearch}
        className={`hidden w-full items-center border border-rose-200/70 bg-[#fff8f8]/94 shadow-[0_16px_45px_rgba(86,20,42,.13)] backdrop-blur transition duration-300 hover:shadow-[0_22px_60px_rgba(86,20,42,.17)] md:flex ${
          compact
            ? "gap-0.5 rounded-[20px] p-1"
            : "gap-1 rounded-[24px] p-1.5"
        }`}
      >
        <label
          className={`min-w-0 flex-[1.35] transition hover:bg-rose-100/60 ${
            compact ? "rounded-2xl px-3 py-1.5" : "rounded-[18px] px-4 py-2"
          }`}
        >
          {!compact && (
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#b20b3b]">
              Destination
            </span>
          )}
          <input
            type="text"
            placeholder={compact ? "Search destination" : "Goa, Jaipur, beach..."}
            value={city}
            onChange={(event) => setCityInput(event.target.value)}
            className={`w-full bg-transparent font-bold text-slate-900 outline-none placeholder:text-slate-400 ${
              compact ? "text-xs" : "mt-0.5 text-sm"
            }`}
          />
        </label>

        <span className={`${compact ? "h-7" : "h-9"} w-px bg-rose-200/70`} />

        <label
          className={`min-w-0 flex-1 transition hover:bg-rose-100/60 ${
            compact ? "rounded-2xl px-3 py-1.5" : "rounded-[18px] px-4 py-2"
          }`}
        >
          {!compact && (
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#b20b3b]">
              Property
            </span>
          )}
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className={`w-full cursor-pointer bg-transparent font-bold text-slate-900 outline-none ${
              compact ? "text-xs" : "mt-0.5 text-sm"
            }`}
          >
            <option value="">Any type</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <span className={`${compact ? "h-7" : "h-9"} w-px bg-rose-200/70`} />

        <label
          className={`min-w-0 flex-[0.65] transition hover:bg-rose-100/60 ${
            compact ? "rounded-2xl px-3 py-1.5" : "rounded-[18px] px-4 py-2"
          }`}
        >
          {!compact && (
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#b20b3b]">
              Guests
            </span>
          )}
          <input
            type="number"
            min="1"
            placeholder={compact ? "Guests" : "Add guests"}
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            className={`w-full bg-transparent font-bold text-slate-900 outline-none placeholder:text-slate-400 ${
              compact ? "text-xs" : "mt-0.5 text-sm"
            }`}
          />
        </label>

        {(city || propertyType || guests) && !compact && (
          <button
            type="button"
            onClick={clear}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-black text-slate-500 transition hover:bg-rose-100 hover:text-[#b20b3b]"
            aria-label="Clear search"
          >
            ×
          </button>
        )}

        <motion.button
          type="submit"
          whileHover={{ scale: 1.04, rotate: -2 }}
          whileTap={{ scale: 0.94 }}
          className={`grid shrink-0 place-items-center bg-gradient-to-br from-[#ff385c] to-[#a90836] font-black text-white shadow-lg shadow-rose-200 ${
            compact
              ? "h-9 w-9 rounded-[14px] text-sm"
              : "h-12 w-12 rounded-[18px] text-lg"
          }`}
          aria-label="Search"
        >
          ⌕
        </motion.button>
      </form>

      <AnimatePresence>
        {isMobileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex flex-col justify-end bg-slate-950/65 backdrop-blur-sm md:hidden"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="rounded-t-[30px] border-t border-rose-200 bg-[#fff4f5] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-rose-200/70 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bd123f]">
                    hydewest search
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    Find your next stay
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileModalOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-slate-700"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Destination
                  </span>
                  <input
                    type="text"
                    placeholder="Goa, Jaipur, beach..."
                    value={city}
                    onChange={(event) => setCityInput(event.target.value)}
                    className="w-full rounded-2xl border border-rose-200 bg-[#fff8f8] p-3.5 text-sm font-bold outline-none focus:border-[#d3134c]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Property type
                  </span>
                  <select
                    value={propertyType}
                    onChange={(event) => setPropertyType(event.target.value)}
                    className="w-full rounded-2xl border border-rose-200 bg-[#fff8f8] p-3.5 text-sm font-bold outline-none"
                  >
                    <option value="">Any type</option>
                    {types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Guests
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Number of guests"
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                    className="w-full rounded-2xl border border-rose-200 bg-[#fff8f8] p-3.5 text-sm font-bold outline-none"
                  />
                </label>
              </div>

              <div className="mt-5 flex gap-3 border-t border-rose-200/70 pt-4">
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-black text-slate-600"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#ff385c] to-[#a90836] py-3 text-sm font-black text-white shadow-lg shadow-rose-200"
                >
                  Search stays
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}