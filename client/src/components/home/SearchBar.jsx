import React, {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { useDispatch } from "react-redux";
import {
  FiChevronDown,
  FiHome,
  FiMapPin,
  FiSearch,
  FiSliders,
  FiUsers,
  FiX,
} from "react-icons/fi";
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

export default function SearchBar({
  compact = false,
  hideMobileTrigger = false,
  hideDesktopForm = false,
  mobileOpenRequest = 0,
}) {
  const [city, setCityInput] =
    useState("");

  const [
    propertyType,
    setPropertyType,
  ] = useState("");

  const [guests, setGuests] =
    useState("");

  const [
    isMobileModalOpen,
    setIsMobileModalOpen,
  ] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (mobileOpenRequest > 0) {
      setIsMobileModalOpen(true);
    }
  }, [mobileOpenRequest]);

  useEffect(() => {
    if (!isMobileModalOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileModalOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isMobileModalOpen]);

  const handleSearch = (event) => {
    event?.preventDefault();

    const query = {};

    if (city.trim()) {
      query.city = city.trim();
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (guests) {
      query.guests = guests;
    }

    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));

    setIsMobileModalOpen(false);

    window.requestAnimationFrame(() => {
      document
        .getElementById(
          "home-properties"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  };

  const clear = () => {
    setCityInput("");
    setPropertyType("");
    setGuests("");
  };

  const mobileModal = (
    <AnimatePresence>
      {isMobileModalOpen && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="fixed inset-0 z-[300] flex items-end bg-[#050611]/85 p-2 backdrop-blur-xl md:hidden"
          style={{
            paddingTop:
              "max(0.5rem, env(safe-area-inset-top))",
            paddingBottom:
              "max(0.5rem, env(safe-area-inset-bottom))",
          }}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsMobileModalOpen(false);
            }
          }}
        >
          <motion.div
            initial={{
              y: "105%",
              opacity: 0.92,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: "105%",
              opacity: 0.92,
            }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 32,
            }}
            className="staynest-scrollbar max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-[30px] border border-white/10 bg-[#0d1020] p-4 text-white shadow-[0_-24px_80px_rgba(0,0,0,.55)] sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Search stays"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#0d1020] pb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#ff6aa1]">
                  hydewest search
                </p>

                <h3 className="mt-1.5 text-xl font-black tracking-tight text-white">
                  Find your next stay
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsMobileModalOpen(false)
                }
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-lg text-white/75 shadow-lg transition hover:border-[#ff4d8d]/35 hover:bg-[#ff4d8d]/10 hover:text-white"
                aria-label="Close search"
              >
                <FiX />
              </button>
            </div>

            <form
              onSubmit={handleSearch}
              className="mt-5 space-y-4"
            >
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <FiMapPin className="text-[#ff6aa1]" />
                  Destination
                </span>

                <input
                  type="text"
                  placeholder="Goa, Jaipur, beach..."
                  value={city}
                  onChange={(event) =>
                    setCityInput(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 text-sm font-bold text-white outline-none placeholder:text-slate-500 transition focus:border-[#ff4d8d]/60 focus:bg-white/[0.075] focus:ring-4 focus:ring-[#ff4d8d]/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <FiHome className="text-[#ff6aa1]" />
                  Property type
                </span>

                <div className="relative">
                  <select
                    value={propertyType}
                    onChange={(event) =>
                      setPropertyType(
                        event.target.value
                      )
                    }
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 pr-11 text-sm font-bold text-white outline-none transition focus:border-[#ff4d8d]/60 focus:bg-white/[0.075] focus:ring-4 focus:ring-[#ff4d8d]/10"
                  >
                    <option
                      className="bg-[#111827]"
                      value=""
                    >
                      Any type
                    </option>

                    {types.map((type) => (
                      <option
                        className="bg-[#111827]"
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ))}
                  </select>

                  <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <FiUsers className="text-[#ff6aa1]" />
                  Guests
                </span>

                <input
                  type="number"
                  min="1"
                  placeholder="Number of guests"
                  value={guests}
                  onChange={(event) =>
                    setGuests(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 text-sm font-bold text-white outline-none placeholder:text-slate-500 transition focus:border-[#ff4d8d]/60 focus:bg-white/[0.075] focus:ring-4 focus:ring-[#ff4d8d]/10"
                />
              </label>

              <div className="flex gap-3 border-t border-white/[0.08] pt-5">
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  Clear
                </button>

                <motion.button
                  type="submit"
                  whileHover={{
                    scale: 1.015,
                  }}
                  whileTap={{
                    scale: 0.975,
                  }}
                  className="home-search-ripple flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff4d8d] to-[#8b5cf6] py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(255,77,141,.25)]"
                >
                  <FiSearch />
                  Search stays
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Mobile search trigger: separate dark boxes ke badle unified pink-white bar. */}
      {!hideMobileTrigger && (
        <motion.button
          type="button"
          whileTap={{
            scale: 0.985,
          }}
          onClick={() =>
            setIsMobileModalOpen(true)
          }
          className={`home-search-shell flex w-full items-center justify-between text-left md:hidden ${
            compact
              ? "rounded-2xl px-3 py-2"
              : "rounded-[22px] px-3.5 py-2.5"
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`grid shrink-0 place-items-center rounded-xl bg-[#d9165b] text-white shadow-lg shadow-pink-900/20 ${
                compact
                  ? "h-8 w-8 text-sm"
                  : "h-9 w-9"
              }`}
            >
              <FiSearch />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-slate-950">
                {city.trim() ||
                  "Where do you want to stay?"}
              </span>

              {!compact && (
                <span className="mt-0.5 block truncate text-[10px] font-bold text-[#9f1239]">
                  {propertyType ||
                    "Any property"}{" "}
                  ·{" "}
                  {guests
                    ? `${guests} guests`
                    : "Add guests"}
                </span>
              )}
            </span>
          </span>

          <FiSliders className="shrink-0 text-[#9f1239]" />
        </motion.button>
      )}

      {/* Desktop search bar: charon controls ek continuous gradient shell ke andar hain. */}
      {!hideDesktopForm && (
        <form
          onSubmit={handleSearch}
          className={`home-search-shell hidden w-full items-center md:flex ${
            compact
              ? "gap-2 rounded-[18px] px-2 py-1.5"
              : "gap-3 rounded-[22px] px-3 py-2"
          }`}
        >
          <label className="min-w-0 flex-[1.35] px-1">
            {!compact && (
              <span className="home-search-label flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em]">
                <FiMapPin />
                Destination
              </span>
            )}

            <input
              type="text"
              placeholder={
                compact
                  ? "Search destination"
                  : "Goa, Jaipur, beach..."
              }
              value={city}
              onChange={(event) =>
                setCityInput(
                  event.target.value
                )
              }
              className={`home-search-control w-full bg-transparent font-black outline-none ${
                compact
                  ? "text-xs"
                  : "mt-0.5 text-sm"
              }`}
            />
          </label>

          <label className="relative min-w-0 flex-1 px-1">
            {!compact && (
              <span className="home-search-label flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em]">
                <FiHome />
                Property
              </span>
            )}

            <select
              value={propertyType}
              onChange={(event) =>
                setPropertyType(
                  event.target.value
                )
              }
              className={`home-search-control w-full cursor-pointer appearance-none bg-transparent pr-5 font-black outline-none ${
                compact
                  ? "text-xs"
                  : "mt-0.5 text-sm"
              }`}
            >
              <option value="">
                Any type
              </option>

              {types.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>

            <FiChevronDown className="pointer-events-none absolute bottom-1 right-1 text-xs text-[#9f1239]" />
          </label>

          <label className="min-w-0 flex-[0.7] px-1">
            {!compact && (
              <span className="home-search-label flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em]">
                <FiUsers />
                Guests
              </span>
            )}

            <input
              type="number"
              min="1"
              placeholder={
                compact
                  ? "Guests"
                  : "Add guests"
              }
              value={guests}
              onChange={(event) =>
                setGuests(
                  event.target.value
                )
              }
              className={`home-search-control w-full bg-transparent font-black outline-none ${
                compact
                  ? "text-xs"
                  : "mt-0.5 text-sm"
              }`}
            />
          </label>

          <motion.button
            type="submit"
            whileHover={{
              y: -1,
              scale: 1.02,
            }}
            whileTap={{
              scale: 0.96,
            }}
            className={`home-search-ripple flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d9165b] font-black text-white shadow-[0_10px_26px_rgba(217,22,91,.28)] ${
              compact
                ? "h-9 px-3 text-[11px]"
                : "h-10 px-3.5 text-xs"
            }`}
            aria-label="Search"
          >
            <FiSearch />
            <span>Search</span>
          </motion.button>
        </form>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          mobileModal,
          document.body
        )}
    </>
  );
}