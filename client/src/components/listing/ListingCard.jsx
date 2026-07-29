import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiArrowUpRight,
  FiCheckCircle,
  FiHeart,
  FiMapPin,
  FiStar,
} from "react-icons/fi";
import wishlistService from "../../services/wishlist.service";

const UNIT_LABELS = {
  hour: "hr",
  night: "night",
  week: "week",
  month: "month",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=85";

const getPrice = (
  apartment,
  unit
) => {
  const pricing =
    apartment?.pricing || {};

  return Number(
    pricing.rates?.[unit] ||
      (unit === "night"
        ? pricing.pricePerNight
        : 0) ||
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
  homeLuxury = false,
}) {
  const navigate = useNavigate();

  const {
    isAuthenticated,
    user,
  } = useSelector(
    (state) => state.auth
  );

  const [saved, setSaved] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [imageIndex, setImageIndex] =
    useState(0);

  const [hovered, setHovered] =
    useState(false);

  const [visible, setVisible] =
    useState(false);

  const cardRef = useRef(null);

  const images = useMemo(() => {
    const rows = Array.isArray(
      apartment?.images
    )
      ? [...apartment.images]
      : [];

    rows.sort(
      (a, b) =>
        Number(Boolean(b.isCover)) -
          Number(Boolean(a.isCover)) ||
        Number(a.order || 0) -
          Number(b.order || 0)
    );

    const urls = rows
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.url
      )
      .filter(Boolean);

    return urls.length
      ? urls.slice(0, 8)
      : [FALLBACK_IMAGE];
  }, [apartment]);

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        ([entry]) =>
          setVisible(
            entry.isIntersecting
          ),
        {
          rootMargin: "160px",
        }
      );

    if (cardRef.current) {
      observer.observe(
        cardRef.current
      );
    }

    return () =>
      observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      !visible ||
      hovered ||
      document.hidden ||
      images.length < 2
    ) {
      return undefined;
    }

    const timer = window.setInterval(
      () => {
        setImageIndex(
          (current) =>
            (current + 1) %
            images.length
        );
      },
      3600 + (index % 4) * 300
    );

    return () =>
      window.clearInterval(timer);
  }, [
    visible,
    hovered,
    images.length,
    index,
  ]);

  if (!apartment) {
    return null;
  }

  const price = getPrice(
    apartment,
    priceUnit
  );

  const location =
    [
      apartment.location?.city,
      apartment.location?.state,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Location not provided";

  const exclusive = Boolean(
    apartment.premium?.isExclusive
  );

  const premiumActive = Boolean(
    membership?.isActive
  );

  const premiumCard = Boolean(
    premiumActive && premiumSearch
  );

  const premiumDiscount = Number(
    apartment.premium
      ?.discountPercent || 0
  );

  const premiumPrice = Math.max(
    price -
      price *
        (premiumDiscount / 100),
    0
  );

  // Listing card amenities: sirf actual listing amenities ko varied preview mein dikhaya jayega.
  const allAmenities = Array.isArray(
    apartment.amenities
  )
    ? apartment.amenities.filter(
        Boolean
      )
    : [];

  let amenitySummary = "";

  if (allAmenities.length === 1) {
    amenitySummary =
      allAmenities[0];
  } else if (
    allAmenities.length === 2
  ) {
    amenitySummary = `${
      allAmenities[index % 2]
    } · ${
      allAmenities.length
    } amenities`;
  } else if (
    allAmenities.length > 2
  ) {
    const startIndex =
      index % allAmenities.length;

    const preview = [
      allAmenities[startIndex],
      allAmenities[
        (startIndex + 1) %
          allAmenities.length
      ],
    ];

    amenitySummary = `${preview.join(
      " · "
    )} · +${
      allAmenities.length - 2
    } more`;
  }

  // Listing card title sizing: fixed card size ko change kiye bina long titles fit honge.
  const titleLength = String(
    apartment.title || ""
  ).length;

  const homeTitleTypography =
    titleLength > 110
      ? "text-[8px] leading-[0.68rem]"
      : titleLength > 86
        ? "text-[10px] leading-[0.82rem]"
        : titleLength > 68
          ? "text-[11px] leading-[0.9rem]"
          : titleLength > 52
            ? "text-xs leading-4"
            : titleLength > 38
              ? "text-sm leading-[1.1rem]"
              : "text-lg leading-6";

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      return navigate("/login");
    }

    if (
      String(
        user?.role || "guest"
      ) !== "guest"
    ) {
      return undefined;
    }

    try {
      setSaving(true);

      if (saved) {
        await wishlistService.removeFromWishlist(
          apartment._id
        );
      } else {
        await wishlistService.addToWishlist(
          apartment._id
        );
      }

      setSaved(
        (value) => !value
      );
    } catch (error) {
      if (
        error.response?.status ===
        403
      ) {
        navigate("/guest/premium");
      }
    } finally {
      setSaving(false);
    }

    return undefined;
  };

  if (homeLuxury) {
    return (
      <motion.article
        ref={cardRef}
        variants={{
          hidden: {
            opacity: 0,
            y: 24,
            scale: 0.985,
          },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              duration: 0.6,
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
          y: -8,
        }}
        onHoverStart={() =>
          setHovered(true)
        }
        onHoverEnd={() =>
          setHovered(false)
        }
        className="home-luxury-card group h-full min-w-0"
      >
        <Link
          to={`/apartment/${apartment._id}`}
          className="flex h-full min-h-[440px] flex-col overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#111827]/95 shadow-[0_18px_55px_rgba(0,0,0,.24)] transition duration-300 hover:border-[#ff4d8d]/25 hover:shadow-[0_30px_80px_rgba(0,0,0,.38)]"
        >
          <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-900">
            <AnimatePresence
              initial={false}
              mode="popLayout"
            >
              <motion.img
                key={`${images[imageIndex]}-${imageIndex}`}
                src={images[imageIndex]}
                alt={apartment.title}
                loading="lazy"
                initial={{
                  opacity: 0,
                  scale: 1.035,
                }}
                animate={{
                  opacity: 1,
                  scale: hovered
                    ? 1.075
                    : 1.015,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.72,
                  ease: [
                    0.22,
                    1,
                    0.36,
                    1,
                  ],
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-[#090b17]/88 via-transparent to-black/12" />

            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              {(apartment.isFeatured ||
                exclusive) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#090b17]/72 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-white shadow-lg backdrop-blur-xl">
                  <FiCheckCircle className="text-[#ff75a8]" />

                  {exclusive
                    ? "Premium stay"
                    : "Featured"}
                </span>
              )}
            </div>

            {String(
              user?.role || "guest"
            ) === "guest" && (
              <motion.button
                type="button"
                disabled={saving}
                onClick={toggle}
                whileHover={{
                  scale: 1.08,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border text-lg shadow-xl backdrop-blur-xl transition ${
                  saved
                    ? "border-[#ff4d8d]/45 bg-[#ff4d8d] text-white"
                    : "border-white/15 bg-[#090b17]/68 text-white hover:bg-white/15"
                }`}
                aria-label={
                  saved
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
              >
                <FiHeart
                  className={
                    saved
                      ? "fill-current"
                      : ""
                  }
                />
              </motion.button>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1">
                {images
                  .slice(0, 5)
                  .map((_, dot) => (
                    <span
                      key={dot}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        dot ===
                        imageIndex %
                          Math.min(
                            images.length,
                            5
                          )
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/38"
                      }`}
                    />
                  ))}
              </div>
            )}

            <div className="absolute bottom-3 left-3 rounded-full border border-white/12 bg-[#090b17]/68 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-white/82 backdrop-blur-xl">
              {apartment.propertyType ||
                "Property"}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Full listing title: existing fixed title area ke andar responsive text size use hoga. */}
                <h3
                  title={apartment.title}
                  className={`h-[3.3rem] overflow-hidden break-words font-black tracking-[-0.025em] text-white ${homeTitleTypography}`}
                >
                  {apartment.title}
                </h3>

                <p className="mt-2 flex items-center gap-1.5 truncate text-xs font-semibold text-slate-400">
                  <FiMapPin className="shrink-0 text-[#ff75a8]" />

                  <span className="truncate">
                    {location}
                  </span>
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/15 bg-amber-300/[0.08] px-2.5 py-1.5 text-xs font-black text-amber-200">
                <FiStar className="fill-current" />

                {Number(
                  apartment.rating || 0
                ) > 0
                  ? Number(
                      apartment.rating
                    ).toFixed(1)
                  : "New"}
              </span>
            </div>

            {/* Guest, room aur bath chips listing cards se remove kar diye gaye hain. */}

            {/* Amenity preview: actual amenities ko rotate karke cards par varied information dikhayega. */}
            {amenitySummary && (
              <p className="mt-4 line-clamp-1 text-[11px] font-semibold text-slate-500">
                {amenitySummary}
              </p>
            )}

            <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/[0.07] pt-5">
              <motion.div
                initial={{
                  opacity: 0.65,
                  y: 4,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.4,
                }}
                className="min-w-0"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                  From
                </p>

                <p className="mt-1">
                  <span className="text-xl font-black tracking-tight text-white">
                    ₹
                    {Number(
                      price
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span className="ml-1 text-xs font-bold text-slate-500">
                    /{" "}
                    {UNIT_LABELS[
                      priceUnit
                    ] || priceUnit}
                  </span>
                </p>
              </motion.div>

              <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff4d8d] to-[#8b5cf6] px-4 text-xs font-black text-white shadow-[0_12px_30px_rgba(255,77,141,.2)] transition duration-300 group-hover:shadow-[0_16px_38px_rgba(255,77,141,.3)]">
                View stay

                <FiArrowUpRight className="transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      ref={cardRef}
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: Math.min(
          index * 0.035,
          0.28
        ),
      }}
      whileHover={{
        y: -7,
      }}
      onHoverStart={() =>
        setHovered(true)
      }
      onHoverEnd={() =>
        setHovered(false)
      }
      className="group h-full min-w-0"
    >
      <Link
        to={`/apartment/${apartment._id}`}
        className={`flex h-full min-h-[390px] flex-col overflow-hidden rounded-[26px] border shadow-[0_14px_40px_rgba(15,23,42,.08)] transition hover:shadow-[0_24px_65px_rgba(15,23,42,.15)] ${
          premiumCard
            ? "border-amber-300/20 bg-[linear-gradient(155deg,#141b2d_0%,#0c111d_62%,#1f1609_100%)] text-white"
            : "border-slate-200 bg-white hover:border-rose-200"
        }`}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-200">
          <AnimatePresence
            initial={false}
            mode="popLayout"
          >
            <motion.img
              key={`${images[imageIndex]}-${imageIndex}`}
              src={images[imageIndex]}
              alt={apartment.title}
              loading="lazy"
              initial={{
                opacity: 0,
                x: 22,
                scale: 1.03,
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: hovered
                  ? 1.055
                  : 1,
              }}
              exit={{
                opacity: 0,
                x: -18,
              }}
              transition={{
                duration: 0.7,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 to-transparent" />

          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 flex gap-1">
              {images
                .slice(0, 5)
                .map((_, dot) => (
                  <span
                    key={dot}
                    className={`h-1.5 rounded-full transition-all ${
                      dot ===
                      imageIndex %
                        Math.min(
                          images.length,
                          5
                        )
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/45"
                    }`}
                  />
                ))}
            </div>
          )}

          {String(
            user?.role || "guest"
          ) === "guest" && (
            <button
              type="button"
              disabled={saving}
              onClick={toggle}
              className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-2xl text-xl shadow-lg backdrop-blur ${
                premiumCard
                  ? saved
                    ? "bg-amber-300 text-slate-950"
                    : "bg-slate-950/75 text-amber-100"
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
              {premiumActive
                ? "👑 Premium Exclusive"
                : "🔒 Premium Exclusive"}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[.18em] ${
                  premiumCard
                    ? "text-amber-300"
                    : premiumActive
                      ? "text-amber-700"
                      : "text-[#FF385C]"
                }`}
              >
                {apartment.propertyType ||
                  "Property"}
              </p>

              {/* Full listing title: fixed card area ke andar adaptive font size use hoga. */}
              <h3
                title={apartment.title}
                className={`mt-1 h-[3.25rem] overflow-hidden break-words font-black ${homeTitleTypography} ${
                  premiumCard
                    ? "text-white"
                    : "text-slate-950"
                }`}
              >
                {apartment.title}
              </h3>

              <p
                className={`mt-1 truncate text-xs font-semibold ${
                  premiumCard
                    ? "text-amber-50/45"
                    : "text-slate-400"
                }`}
              >
                📍 {location}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                premiumCard
                  ? "bg-amber-300/10 text-amber-300"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              ⭐{" "}
              {Number(
                apartment.rating || 0
              ) > 0
                ? Number(
                    apartment.rating
                  ).toFixed(1)
                : "New"}
            </span>
          </div>

          {/* Guest, room aur bath summary sabhi listing cards se remove kar diya gaya hai. */}

          <div
            className={`mt-auto flex items-end justify-between gap-3 border-t pt-4 ${
              premiumCard
                ? "border-amber-300/12"
                : "border-slate-100"
            }`}
          >
            <div className="min-w-0">
              {premiumActive &&
              premiumDiscount > 0 ? (
                <>
                  <p
                    className={`text-[10px] font-bold line-through ${
                      premiumCard
                        ? "text-white/35"
                        : "text-slate-400"
                    }`}
                  >
                    ₹
                    {Number(
                      price
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </p>

                  <span
                    className={`text-xl font-black ${
                      premiumCard
                        ? "text-amber-300"
                        : "text-amber-800"
                    }`}
                  >
                    ₹
                    {Number(
                      premiumPrice
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </>
              ) : (
                <span
                  className={`text-xl font-black ${
                    premiumCard
                      ? "text-white"
                      : "text-slate-950"
                  }`}
                >
                  ₹
                  {Number(
                    price
                  ).toLocaleString(
                    "en-IN"
                  )}
                </span>
              )}

              <span
                className={`ml-1 text-xs font-bold ${
                  premiumCard
                    ? "text-white/40"
                    : "text-slate-400"
                }`}
              >
                /{" "}
                {UNIT_LABELS[
                  priceUnit
                ] || priceUnit}
              </span>
            </div>

            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white ${
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