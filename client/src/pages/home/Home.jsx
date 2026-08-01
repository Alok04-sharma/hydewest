import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAward,
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCompass,
  FiCreditCard,
  FiGrid,
  FiHeadphones,
  FiHome,
  FiMap,
  FiMapPin,
  FiShield,
  FiStar,
  FiSun,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import {
  fetchAllListings,
  searchListingsThunk,
  setFilter,
} from "../../redux/slices/listingSlice";
import ListingCard from "../../components/listing/ListingCard.jsx";
import SearchBar from "../../components/home/SearchBar.jsx";
import "./HomeLuxury.css";
import "./HomeHeroLayout.css";

const HERO_IMAGES = [
  "/images/hero/hero2.WEBP",
  "/images/hero/hero3.WEBP",
  "/images/hero/hero4.WEBP",
  "/images/hero/hero5.WEBP",
];

const MOBILE_HERO_IMAGES = [
  "/images/hero/hero2.WEBP",
  "/images/hero/hero4.WEBP",
  "/images/hero/hero5.WEBP",
];

const CATEGORIES = [
  { name: "All Stays", Icon: FiCompass, value: "" },
  { name: "Apartment", Icon: FiGrid, value: "Apartment" },
  { name: "Villa", Icon: FiHome, value: "Villa" },
  { name: "House", Icon: FiHome, value: "House" },
  { name: "Cabin", Icon: FiMap, value: "Cabin" },
  { name: "Farm House", Icon: FiSun, value: "Farm House" },
  { name: "Hotel", Icon: FiBriefcase, value: "Hotel" },
  { name: "Resort", Icon: FiAward, value: "Resort" },
];

// ye feature baad m use krenge
const SHOW_HOME_METRICS = false;

const TRUST_ITEMS = [
  {
    label: "Verified Hosts",
    caption: "Reviewed stays",
    Icon: FiShield,
  },
  {
    label: "Secure Payments",
    caption: "Protected checkout",
    Icon: FiCreditCard,
  },
  {
    label: "24×7 Support",
    caption: "Help when needed",
    Icon: FiHeadphones,
  },
  {
    label: "Instant Booking",
    caption: "Selected properties",
    Icon: FiZap,
  },
];

const WHY_ITEMS = [
  {
    title: "Every stay is reviewed",
    text: "Only approved properties are presented on the public marketplace.",
    Icon: FiShield,
  },
  {
    title: "Clear, flexible pricing",
    text: "Compare the available duration options and understand the price before booking.",
    Icon: FiCreditCard,
  },
  {
    title: "Human support, always",
    text: "Raise a support request from the same platform whenever you need assistance.",
    Icon: FiHeadphones,
  },
];

const getCoverImage = (listing) => {
  const images = Array.isArray(listing?.images)
    ? listing.images
    : [];

  const cover =
    images.find((image) => image?.isCover) ||
    images[0];

  return typeof cover === "string"
    ? cover
    : cover?.url || "";
};

function AnimatedMetric({
  value,
  suffix = "",
  label,
  Icon,
}) {
  const ref = useRef(null);

  const inView = useInView(ref, {
    once: true,
    amount: 0.55,
  });

  const [
    displayValue,
    setDisplayValue,
  ] = useState(0);

  const safeValue = Math.max(
    Number(value || 0),
    0
  );

  useEffect(() => {
    if (!inView) {
      return undefined;
    }

    const duration = 900;
    const startedAt = performance.now();
    let frameId = 0;

    const tick = (time) => {
      const progress = Math.min(
        (time - startedAt) / duration,
        1
      );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      setDisplayValue(
        Math.round(
          safeValue * eased
        )
      );

      if (progress < 1) {
        frameId =
          window.requestAnimationFrame(
            tick
          );
      }
    };

    frameId =
      window.requestAnimationFrame(
        tick
      );

    return () =>
      window.cancelAnimationFrame(
        frameId
      );
  }, [
    inView,
    safeValue,
  ]);

  return (
    <div
      ref={ref}
      className="home-stat-card"
    >
      <span
        className="home-stat-icon"
        aria-hidden="true"
      >
        <Icon />
      </span>

      <div className="min-w-0">
        <p className="text-xl font-black tracking-tight text-white sm:text-2xl">
          {displayValue.toLocaleString(
            "en-IN"
          )}
          {suffix}
        </p>

        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
          {label}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl"
      }
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff4d8d]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 text-sm font-medium leading-7 text-slate-400 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const dispatch = useDispatch();
  const location = useLocation();

  const {
    listings,
    loading,
    error,
  } = useSelector(
    (state) => state.listing
  );

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [
    heroIndex,
    setHeroIndex,
  ] = useState(0);

  const [
    showAllListings,
    setShowAllListings,
  ] = useState(false);

  const [
    tabVisible,
    setTabVisible,
  ] = useState(
    typeof document === "undefined"
      ? true
      : !document.hidden
  );

  const [
    searchDocked,
    setSearchDocked,
  ] = useState(false);

  const [
    isMobileViewport,
    setIsMobileViewport,
  ] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(
          "(max-width: 767px)"
        ).matches
      : false
  );

  const activeHeroImages = isMobileViewport
    ? MOBILE_HERO_IMAGES
    : HERO_IMAGES;

  const initialListingLimit =
    isMobileViewport
      ? 4
      : 8;

  const visibleListings =
    showAllListings
      ? listings
      : listings.slice(
          0,
          initialListingLimit
        );

  const hasMoreListings =
    listings.length >
    initialListingLimit;

  const categoryRailRef =
    useRef(null);

  const heroRef =
    useRef(null);

  useEffect(() => {
    dispatch(
      fetchAllListings()
    );
  }, [dispatch]);

  useEffect(() => {
    setShowAllListings(
      false
    );
  }, [
    listings,
    isMobileViewport,
  ]);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(max-width: 767px)"
      );

    const updateViewport = (
      event
    ) => {
      setIsMobileViewport(
        event.matches
      );
    };

    setIsMobileViewport(
      mediaQuery.matches
    );

    mediaQuery.addEventListener(
      "change",
      updateViewport
    );

    return () =>
      mediaQuery.removeEventListener(
        "change",
        updateViewport
      );
  }, []);

  useEffect(() => {
    if (
      location.hash !==
      "#home-properties"
    ) {
      return undefined;
    }

    let secondFrame = 0;

    const firstFrame =
      window.requestAnimationFrame(
        () => {
          secondFrame =
            window.requestAnimationFrame(
              () => {
                document
                  .getElementById(
                    "home-properties"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }
            );
        }
      );

    return () => {
      window.cancelAnimationFrame(
        firstFrame
      );

      window.cancelAnimationFrame(
        secondFrame
      );
    };
  }, [location.hash]);

  useEffect(() => {
    HERO_IMAGES.forEach(
      (src) => {
        const image =
          new Image();

        image.src = src;
      }
    );

    const onVisibilityChange =
      () =>
        setTabVisible(
          !document.hidden
        );

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
  }, []);

  useEffect(() => {
    setHeroIndex(
      (current) =>
        current >=
        activeHeroImages.length
          ? 0
          : current
    );
  }, [
    activeHeroImages.length,
  ]);

  useEffect(() => {
    if (!tabVisible) {
      return undefined;
    }

    const timer =
      window.setInterval(
        () => {
          setHeroIndex(
            (current) =>
              (current + 1) %
              activeHeroImages.length
          );
        },
        6500
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    tabVisible,
    activeHeroImages.length,
  ]);

  useEffect(() => {
    const updateDockedState =
      () => {
        const heroBottom =
          heroRef.current
            ?.getBoundingClientRect()
            .bottom;

        const navbarHeight =
          72;

        const nextDocked =
          Number.isFinite(
            heroBottom
          ) &&
          heroBottom <=
            navbarHeight;

        setSearchDocked(
          (current) =>
            current ===
            nextDocked
              ? current
              : nextDocked
        );
      };

    updateDockedState();

    window.addEventListener(
      "scroll",
      updateDockedState,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "resize",
      updateDockedState
    );

    return () => {
      window.removeEventListener(
        "scroll",
        updateDockedState
      );

      window.removeEventListener(
        "resize",
        updateDockedState
      );

      window.dispatchEvent(
        new CustomEvent(
          "hydewest:home-search-docked",
          {
            detail: {
              docked: false,
            },
          }
        )
      );
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "hydewest:home-search-docked",
        {
          detail: {
            docked:
              searchDocked,
          },
        }
      )
    );
  }, [searchDocked]);

  const metrics =
    useMemo(() => {
      const citySet =
        new Set();

      const hostSet =
        new Set();

      let bookings = 0;

      listings.forEach(
        (listing) => {
          if (
            listing
              ?.location
              ?.city
          ) {
            citySet.add(
              String(
                listing
                  .location
                  .city
              )
                .trim()
                .toLowerCase()
            );
          }

          const hostId =
            listing?.host
              ?._id ||
            listing?.host;

          if (hostId) {
            hostSet.add(
              String(hostId)
            );
          }

          bookings +=
            Number(
              listing
                ?.bookingCount ||
                0
            );
        }
      );

      return {
        properties:
          listings.length,

        hosts:
          hostSet.size,

        cities:
          citySet.size,

        bookings,
      };
    }, [listings]);

  const featuredLocations =
    useMemo(() => {
      const cityMap =
        new Map();

      listings.forEach(
        (listing) => {
          const city =
            String(
              listing
                ?.location
                ?.city ||
                ""
            ).trim();

          if (!city) {
            return;
          }

          const key =
            city.toLowerCase();

          const current =
            cityMap.get(key) ||
            {
              city,

              state:
                listing
                  ?.location
                  ?.state ||
                "",

              count: 0,

              image: "",
            };

          current.count += 1;

          if (
            !current.image
          ) {
            current.image =
              getCoverImage(
                listing
              );
          }

          cityMap.set(
            key,
            current
          );
        }
      );

      return Array.from(
        cityMap.values()
      )
        .sort(
          (a, b) =>
            b.count -
              a.count ||
            a.city.localeCompare(
              b.city
            )
        )
        .slice(0, 4);
    }, [listings]);

  const scrollCategories = (
    direction
  ) => {
    const rail =
      categoryRailRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left:
        direction *
        Math.min(
          rail.clientWidth *
            0.72,
          540
        ),

      behavior: "smooth",
    });
  };

  const runSearch = (
    query
  ) => {
    dispatch(
      setFilter(query)
    );

    dispatch(
      searchListingsThunk(
        query
      )
    );

    window.requestAnimationFrame(
      () => {
        document
          .getElementById(
            "home-properties"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }
    );
  };

  const handleCategorySelect =
    (typeValue) => {
      setSelectedCategory(
        typeValue
      );

      runSearch(
        typeValue
          ? {
              propertyType:
                typeValue,
            }
          : {}
      );
    };

  const handleLocationSelect =
    (city) => {
      setSelectedCategory(
        ""
      );

      runSearch({
        city,
      });
    };

  return (
    <div className="hydewest-home min-h-screen overflow-x-hidden bg-[#090b17] text-white">
      <section
        ref={heroRef}
        className="home-hero-section relative flex min-h-[100svh] items-center overflow-hidden bg-slate-950 pt-20"
      >
        <AnimatePresence
          initial={false}
          mode="sync"
        >
          <motion.img
            key={
              activeHeroImages[
                heroIndex
              ]
            }
            src={
              activeHeroImages[
                heroIndex
              ]
            }
            alt="Luxury vacation rental destination"
            initial={{
              opacity: 0,

              scale:
                isMobileViewport
                  ? 1.005
                  : 1.035,
            }}
            animate={{
              opacity: 1,

              scale:
                isMobileViewport
                  ? 1.035
                  : 1.09,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              opacity: {
                duration: 1.15,
                ease: "easeInOut",
              },

              scale: {
                duration: 7.1,
                ease: "linear",
              },
            }}
            className="home-hero-image absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        <div className="home-hero-overlay-side absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,15,.88)_0%,rgba(9,11,23,.66)_47%,rgba(9,11,23,.36)_100%)]" />

        <div className="home-hero-overlay-bottom absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,23,.18)_0%,rgba(9,11,23,.08)_52%,rgba(9,11,23,.9)_100%)]" />

        <div
          className="home-hero-orb home-hero-orb-one"
          aria-hidden="true"
        />

        <div
          className="home-hero-orb home-hero-orb-two"
          aria-hidden="true"
        />

        <motion.div
          initial={{
            opacity: 0,
            y: 24,
            scale: 0.985,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            delay: 0.68,
            duration: 0.65,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="home-hero-search home-hero-top-search"
        >
          <div className="home-hero-search-inner">
            <SearchBar />
          </div>
        </motion.div>

        <div className="home-hero-content relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="home-hero-copy max-w-4xl">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},

                visible: {
                  transition: {
                    staggerChildren:
                      0.12,

                    delayChildren:
                      0.08,
                  },
                },
              }}
              className="home-hero-title mt-0 max-w-3xl text-left text-balance text-[clamp(2.35rem,6.4vw,5.5rem)] font-black leading-[0.98] tracking-[-0.05em] text-white"
            >
              {[
                "Stay somewhere",
                "that becomes part",
                "of the journey.",
              ].map(
                (
                  line,
                  index
                ) => (
                  <motion.span
                    key={line}
                    variants={{
                      hidden: {
                        opacity: 0,
                        y: 28,
                        filter:
                          "blur(8px)",
                      },

                      visible: {
                        opacity: 1,
                        y: 0,
                        filter:
                          "blur(0px)",

                        transition: {
                          duration:
                            0.72,

                          ease: [
                            0.22,
                            1,
                            0.36,
                            1,
                          ],
                        },
                      },
                    }}
                    className={`block ${
                      index === 2
                        ? "home-heading-highlight"
                        : ""
                    }`}
                  >
                    {line}
                  </motion.span>
                )
              )}
            </motion.h1>

            <motion.p
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.52,
                duration: 0.65,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
              className="home-hero-description mt-6 max-w-2xl text-sm font-medium leading-7 text-white/68 sm:text-base lg:text-lg"
            >
              Search verified
              apartments, villas and
              unique homes. Compare
              flexible stays,
              transparent prices and
              member benefits in one
              refined experience.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},

              visible: {
                transition: {
                  staggerChildren:
                    0.08,

                  delayChildren:
                    0.88,
                },
              },
            }}
            className="home-hero-trust-grid mt-4 grid max-w-[1060px] grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {TRUST_ITEMS.map(
              ({
                label,
                caption,
                Icon,
              }) => (
                <motion.div
                  key={label}
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 12,
                    },

                    visible: {
                      opacity: 1,
                      y: 0,

                      transition: {
                        duration:
                          0.45,

                        ease: [
                          0.22,
                          1,
                          0.36,
                          1,
                        ],
                      },
                    },
                  }}
                  className="home-trust-card"
                >
                  <span
                    className="home-trust-icon"
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-black text-white sm:text-xs">
                      {label}
                    </span>

                    <span className="mt-0.5 block truncate text-[9px] font-semibold text-white/42">
                      {caption}
                    </span>
                  </span>
                </motion.div>
              )
            )}
          </motion.div>

          {SHOW_HOME_METRICS && (
            <motion.div
              initial={{
                opacity: 0,
                y: 14,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 1.05,
                duration: 0.5,
              }}
              className="mt-5 grid max-w-[760px] grid-cols-2 gap-2 sm:grid-cols-4"
            >
              <AnimatedMetric
                value={
                  metrics.properties
                }
                label="Verified properties"
                Icon={FiHome}
              />

              <AnimatedMetric
                value={
                  metrics.hosts
                }
                label="Trusted hosts"
                Icon={FiUsers}
              />

              <AnimatedMetric
                value={
                  metrics.cities
                }
                label="Cities"
                Icon={FiMapPin}
              />

              <AnimatedMetric
                value={
                  metrics.bookings
                }
                label="Guest bookings"
                Icon={FiStar}
              />
            </motion.div>
          )}
        </div>

        <div className="home-hero-dots absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-6">
          {activeHeroImages.map(
            (
              src,
              index
            ) => (
              <button
                key={src}
                type="button"
                onClick={() =>
                  setHeroIndex(
                    index
                  )
                }
                aria-label={`Show hero image ${
                  index + 1
                }`}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  heroIndex ===
                  index
                    ? "w-9 bg-white shadow-[0_0_16px_rgba(255,255,255,.7)]"
                    : "w-3 bg-white/30 hover:bg-white/60"
                }`}
              />
            )
          )}
        </div>
      </section>

      <motion.section
        initial={{
          opacity: 0,
          y: 26,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
          amount: 0.25,
        }}
        transition={{
          duration: 0.65,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative border-y border-white/[0.08] bg-[#0d1020]"
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff4d8d]">
                Explore categories
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                Find the stay that
                fits your trip
              </h2>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() =>
                  scrollCategories(
                    -1
                  )
                }
                className="home-rail-button"
                aria-label="Previous categories"
              >
                <FiChevronLeft />
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollCategories(
                    1
                  )
                }
                className="home-rail-button"
                aria-label="Next categories"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>

          <div
            ref={
              categoryRailRef
            }
            className="home-category-rail no-scrollbar flex items-stretch gap-3 overflow-x-auto scroll-smooth pb-2"
          >
            {CATEGORIES.map(
              ({
                name,
                Icon,
                value,
              }) => {
                const active =
                  selectedCategory ===
                  value;

                return (
                  <motion.button
                    key={name}
                    type="button"
                    onClick={() =>
                      handleCategorySelect(
                        value
                      )
                    }
                    whileHover={{
                      y: -4,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className={`home-category-card ${
                      active
                        ? "is-active"
                        : ""
                    }`}
                  >
                    <span
                      className="home-category-icon"
                      aria-hidden="true"
                    >
                      <Icon />
                    </span>

                    <span className="whitespace-nowrap text-xs font-black text-white">
                      {name}
                    </span>

                    <span className="text-[9px] font-semibold text-white/42">
                      {active
                        ? "Selected"
                        : "Explore"}
                    </span>
                  </motion.button>
                );
              }
            )}
          </div>
        </div>
      </motion.section>

      <main
        id="home-properties"
        className="mx-auto max-w-[1600px] scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      >
        <motion.div
          initial={{
            opacity: 0,
            y: 24,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.35,
          }}
          transition={{
            duration: 0.65,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
        >
          <SectionHeading
            eyebrow="Popular listings"
            title="Places worth discovering"
            description="Every property shown here is approved before it appears on hydewest."
          />

          {!loading &&
            listings.length >
              0 && (
              <span className="w-fit rounded-full border border-pink-300/20 bg-[linear-gradient(110deg,#b90e44_0%,#5b0b2c_48%,#090b17_100%)] px-4 py-2 text-xs font-black text-slate-300 shadow-[0_10px_28px_rgba(185,14,68,.18)] backdrop-blur-xl">
                {
                  listings.length
                }{" "}
                stays found
              </span>
            )}
        </motion.div>

        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({
              length:
                initialListingLimit,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-3"
                >
                  <div className="home-dark-skeleton aspect-[4/3] rounded-[22px]" />

                  <div className="home-dark-skeleton mt-4 h-4 rounded-full" />

                  <div className="home-dark-skeleton mt-3 h-3 w-2/3 rounded-full" />

                  <div className="home-dark-skeleton mt-6 h-10 rounded-2xl" />
                </div>
              )
            )}
          </div>
        )}

        {error &&
          !loading && (
            <div className="mx-auto my-10 max-w-xl rounded-[28px] border border-rose-400/20 bg-rose-400/[0.08] p-7 text-center shadow-2xl backdrop-blur-xl">
              <p className="font-black text-rose-100">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  dispatch(
                    fetchAllListings()
                  )
                }
                className="mt-5 rounded-2xl bg-gradient-to-r from-[#ff4d8d] to-[#8b5cf6] px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-950/30 transition hover:-translate-y-0.5"
              >
                Try again
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          listings.length ===
            0 && (
            <div className="mx-auto my-10 max-w-md rounded-[30px] border border-white/[0.08] bg-white/[0.045] px-6 py-14 text-center shadow-2xl backdrop-blur-xl">
              <FiCompass className="mx-auto text-4xl text-[#ff4d8d]" />

              <p className="mt-5 text-xl font-black text-white">
                No properties
                found
              </p>

              <p className="mt-2 text-sm font-medium text-slate-400">
                Try another
                destination or
                reset the selected
                category.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          listings.length >
            0 && (
            <>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{
                  once: true,
                  amount: 0.08,
                }}
                variants={{
                  hidden: {},

                  visible: {
                    transition: {
                      staggerChildren:
                        0.06,
                    },
                  },
                }}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {visibleListings.map(
                  (
                    item,
                    index
                  ) => (
                    <ListingCard
                      key={
                        item._id
                      }
                      apartment={
                        item
                      }
                      index={index}
                      homeLuxury
                    />
                  )
                )}
              </motion.div>

              {!showAllListings &&
                hasMoreListings && (
                  <div className="mt-10 flex justify-center">
                    <motion.button
                      type="button"
                      onClick={() =>
                        setShowAllListings(
                          true
                        )
                      }
                      whileHover={{
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.97,
                      }}
                      className="rounded-2xl border border-[#ed1c24]/35 bg-[#ed1c24]/10 px-6 py-3 text-sm font-black text-white shadow-[0_14px_36px_rgba(237,28,36,.12)] transition hover:border-[#ed1c24]/60 hover:bg-[#ed1c24]/16"
                    >
                      View more
                    </motion.button>
                  </div>
                )}
            </>
          )}
      </main>

      {featuredLocations.length >
        0 && (
        <section className="border-y border-white/[0.07] bg-[#0d1020] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{
                opacity: 0,
                y: 24,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.35,
              }}
              transition={{
                duration: 0.65,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
            >
              <SectionHeading
                eyebrow="Featured locations"
                title="Start with a place that inspires you"
                description="Explore the cities currently represented by approved stays on hydewest."
              />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                amount: 0.15,
              }}
              variants={{
                hidden: {},

                visible: {
                  transition: {
                    staggerChildren:
                      0.09,
                  },
                },
              }}
              className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {featuredLocations.map(
                (
                  featuredLocation
                ) => (
                  <motion.button
                    key={`${featuredLocation.city}-${featuredLocation.state}`}
                    type="button"
                    onClick={() =>
                      handleLocationSelect(
                        featuredLocation.city
                      )
                    }
                    variants={{
                      hidden: {
                        opacity: 0,
                        y: 24,
                      },

                      visible: {
                        opacity: 1,
                        y: 0,

                        transition: {
                          duration:
                            0.6,

                          ease: [
                            0.22,
                            1,
                            0.36,
                            1,
                          ],
                        },
                      },
                    }}
                    whileHover={{
                      y: -6,
                    }}
                    whileTap={{
                      scale: 0.985,
                    }}
                    className="home-location-card group"
                  >
                    {featuredLocation.image ? (
                      <img
                        src={
                          featuredLocation.image
                        }
                        alt={`${featuredLocation.city} stays`}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#4c1d95] to-[#be185d]" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#090b17] via-[#090b17]/25 to-transparent" />

                    <div className="relative mt-auto text-left">
                      <p className="text-xl font-black tracking-tight text-white">
                        {
                          featuredLocation.city
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold text-white/60">
                        {[
                          featuredLocation.state,

                          `${
                            featuredLocation.count
                          } stay${
                            featuredLocation.count ===
                            1
                              ? ""
                              : "s"
                          }`,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " · "
                          )}
                      </p>
                    </div>
                  </motion.button>
                )
              )}
            </motion.div>
          </div>
        </section>
      )}

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/[0.09] bg-[linear-gradient(135deg,rgba(255,77,141,.09),rgba(139,92,246,.06)_45%,rgba(255,255,255,.025))] p-6 shadow-[0_28px_100px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:p-9 lg:p-12">
          <motion.div
            initial={{
              opacity: 0,
              y: 24,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.35,
            }}
            transition={{
              duration: 0.65,
              ease: [
                0.22,
                1,
                0.36,
                1,
              ],
            }}
          >
            <SectionHeading
              eyebrow="Why hydewest"
              title="A refined way to discover your next stay"
              description="Built around approved properties, transparent choices and support that stays inside one platform."
              align="center"
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.2,
            }}
            variants={{
              hidden: {},

              visible: {
                transition: {
                  staggerChildren:
                    0.1,
                },
              },
            }}
            className="mt-10 grid gap-4 md:grid-cols-3"
          >
            {WHY_ITEMS.map(
              ({
                title,
                text,
                Icon,
              }) => (
                <motion.article
                  key={title}
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 22,
                    },

                    visible: {
                      opacity: 1,
                      y: 0,

                      transition: {
                        duration:
                          0.58,

                        ease: [
                          0.22,
                          1,
                          0.36,
                          1,
                        ],
                      },
                    },
                  }}
                  whileHover={{
                    y: -5,
                  }}
                  className="rounded-[26px] border border-white/[0.08] bg-[#111827]/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_18px_50px_rgba(0,0,0,.2)]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#ff4d8d]/20 bg-[#ff4d8d]/10 text-xl text-[#ff75a8]">
                    <Icon />
                  </span>

                  <h3 className="mt-5 text-lg font-black text-white">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
                    {text}
                  </p>
                </motion.article>
              )
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}