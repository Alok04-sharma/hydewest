import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCopy,
  FiDroplet,
  FiHeart,
  FiHome,
  FiMapPin,
  FiMoon,
  FiShare2,
  FiShield,
  FiStar,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  clearSelectedListing,
  fetchListingById,
} from "../../redux/slices/listingSlice";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85";

const money = (value, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function DetailChip({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-lg text-[#FF385C]">
        <Icon aria-hidden="true" />
      </span>

      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>

        <span className="mt-1 block truncate text-sm font-black text-slate-900">
          {value}
        </span>
      </span>
    </div>
  );
}

function ListingDetailsSkeleton() {
  return (
    <div className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="skeleton-shimmer h-8 w-2/3 rounded-full sm:w-1/2" />

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.45fr_.55fr]">
        <div className="skeleton-shimmer aspect-[16/10] rounded-[30px]" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="skeleton-shimmer min-h-40 rounded-[24px]" />
          <div className="skeleton-shimmer min-h-40 rounded-[24px]" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="skeleton-shimmer h-24 rounded-[28px]" />
          <div className="skeleton-shimmer h-52 rounded-[28px]" />
        </div>

        <div className="skeleton-shimmer h-80 rounded-[28px]" />
      </div>
    </div>
  );
}

export default function ListingDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const {
    selectedListing: apartment,
    loading,
    error,
  } = useSelector((state) => state.listing);

  const { isAuthenticated } = useSelector((state) => state.auth);

  const [activeImage, setActiveImage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchListingById(id));
    }

    return () => {
      dispatch(clearSelectedListing());
    };
  }, [dispatch, id]);

  const images = useMemo(() => {
    const normalizedImages = Array.isArray(apartment?.images)
      ? apartment.images
          .map((image, index) => {
            if (typeof image === "string") {
              return {
                url: image,
                publicId: image,
                isCover: index === 0,
                order: index,
              };
            }

            return {
              ...image,
              url: image?.url,
              order: Number(image?.order ?? index),
            };
          })
          .filter((image) => Boolean(image.url))
      : [];

    if (normalizedImages.length === 0) {
      return [
        {
          url: FALLBACK_IMAGE,
          publicId: "fallback-image",
          isCover: true,
          order: 0,
        },
      ];
    }

    return normalizedImages.sort((firstImage, secondImage) => {
      if (firstImage.isCover && !secondImage.isCover) {
        return -1;
      }

      if (!firstImage.isCover && secondImage.isCover) {
        return 1;
      }

      return (
        Number(firstImage.order || 0) -
        Number(secondImage.order || 0)
      );
    });
  }, [apartment]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: apartment?.title || "StayNest property",
          text: `Check out ${
            apartment?.title || "this property"
          } on StayNest`,
          url: window.location.href,
        });

        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      }
    } catch {
      // User may cancel the share window or deny clipboard permission.
    }
  };

  if (loading) {
    return <ListingDetailsSkeleton />;
  }

  if (error || !apartment) {
    return (
      <div className="grid min-h-[68vh] place-items-center px-4 py-12">
        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="w-full max-w-lg rounded-[32px] border border-red-200 bg-white p-8 text-center shadow-xl"
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-50 text-3xl">
            🏠
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-950">
            This stay is unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "The listing may have been removed, suspended or is no longer public."}
          </p>

          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-[#FF385C]"
          >
            <FiArrowLeft aria-hidden="true" />
            Back to approved stays
          </Link>
        </motion.div>
      </div>
    );
  }

  const locationText = [
    apartment.location?.address,
    apartment.location?.landmark,
    apartment.location?.city,
    apartment.location?.state,
    apartment.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const shortLocation = [
    apartment.location?.city,
    apartment.location?.state,
  ]
    .filter(Boolean)
    .join(", ");

  const price = Number(
    apartment.pricing?.basePrice ||
      apartment.pricing?.pricePerNight ||
      0
  );

  const priceUnit = apartment.pricing?.priceUnit || "night";
  const currency = apartment.pricing?.currency || "INR";

  const hostAvatar =
    typeof apartment.host?.avatar === "string"
      ? apartment.host.avatar
      : apartment.host?.avatar?.url || "";

  const rawLatitude = apartment.location?.latitude;
  const rawLongitude = apartment.location?.longitude;

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  const hasValidCoordinates =
    rawLatitude !== undefined &&
    rawLatitude !== null &&
    rawLatitude !== "" &&
    rawLongitude !== undefined &&
    rawLongitude !== null &&
    rawLongitude !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  return (
    <div className="min-h-screen bg-transparent pb-14">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-[#FF385C]"
            >
              <FiArrowLeft aria-hidden="true" />
              Back to stays
            </Link>

            <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              {apartment.title || "StayNest property"}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <FiStar
                  aria-hidden="true"
                  className="fill-current"
                />

                {Number(apartment.rating || 0) > 0
                  ? Number(apartment.rating).toFixed(1)
                  : "New"}

                <span className="text-slate-400">
                  ({Number(apartment.totalReviews || 0)} reviews)
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5">
                <FiMapPin aria-hidden="true" />

                {shortLocation || "Location not specified"}
              </span>

              {apartment.isFeatured && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                  Featured
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <motion.button
              type="button"
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.96,
              }}
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-[#FF385C]"
            >
              {copied ? (
                <FiCopy aria-hidden="true" />
              ) : (
                <FiShare2 aria-hidden="true" />
              )}

              {copied ? "Copied" : "Share"}
            </motion.button>

            <motion.button
              type="button"
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.96,
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-[#FF385C]"
            >
              <FiHeart aria-hidden="true" />
              Save
            </motion.button>
          </div>
        </div>

        {/* Image gallery */}
        <section className="mt-6 grid gap-3 overflow-hidden rounded-[30px] lg:grid-cols-[1.45fr_.55fr]">
          <motion.button
            type="button"
            whileHover={{
              scale: 1.005,
            }}
            onClick={() => setActiveImage(images[0].url)}
            className="group relative aspect-[16/10] overflow-hidden bg-slate-200 text-left lg:aspect-auto lg:min-h-[520px]"
          >
            <img
              src={images[0].url}
              alt={apartment.title || "Property cover"}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />

            <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-800 shadow-lg backdrop-blur">
              Cover photo
            </span>
          </motion.button>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {images.slice(1, 3).map((image, index) => (
              <motion.button
                type="button"
                whileHover={{
                  scale: 1.01,
                }}
                key={image.publicId || image.url || index}
                onClick={() => setActiveImage(image.url)}
                className="group relative min-h-40 overflow-hidden bg-slate-200 text-left"
              >
                <img
                  src={image.url}
                  alt={`${apartment.title || "Property"} ${index + 2}`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />

                {index === 1 && images.length > 3 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                    +{images.length - 3} photos
                  </span>
                )}
              </motion.button>
            ))}

            {images.length === 1 && (
              <>
                <div className="grid min-h-40 place-items-center bg-gradient-to-br from-rose-50 to-violet-50 px-4 text-center text-sm font-black text-slate-400">
                  More photos coming soon
                </div>

                <div className="grid min-h-40 place-items-center bg-gradient-to-br from-slate-50 to-rose-50 px-4 text-center text-sm font-black text-slate-400 lg:hidden">
                  Property gallery
                </div>
              </>
            )}

            {images.length === 2 && (
              <div className="grid min-h-40 place-items-center bg-gradient-to-br from-rose-50 to-violet-50 px-4 text-center text-sm font-black text-slate-400">
                More photos coming soon
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_370px] xl:gap-10">
          <div className="min-w-0 space-y-7">
            {/* Host information */}
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF385C]">
                    {apartment.propertyType ||
                      apartment.category ||
                      "Property"}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Hosted by{" "}
                    {apartment.host?.name || "StayNest Host"}
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {Number(apartment.guests || 1)} guests
                    {" · "}
                    {Number(apartment.bedrooms || 0)} bedrooms
                    {" · "}
                    {Number(apartment.beds || 1)} beds
                    {" · "}
                    {Number(apartment.bathrooms || 1)} bathrooms
                  </p>
                </div>

                <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[22px] bg-gradient-to-br from-rose-500 to-orange-400 text-xl font-black text-white shadow-lg">
                  {hostAvatar ? (
                    <img
                      src={hostAvatar}
                      alt={apartment.host?.name || "Host"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    apartment.host?.name
                      ?.charAt(0)
                      ?.toUpperCase() || "H"
                  )}

                  <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
              </div>
            </section>

            {/* Property facts */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <DetailChip
                icon={FiUsers}
                label="Guests"
                value={Number(apartment.guests || 1)}
              />

              <DetailChip
                icon={FiMoon}
                label="Beds"
                value={Number(apartment.beds || 1)}
              />

              <DetailChip
                icon={FiHome}
                label="Bedrooms"
                value={Number(apartment.bedrooms || 0)}
              />

              <DetailChip
                icon={FiDroplet}
                label="Bathrooms"
                value={Number(apartment.bathrooms || 1)}
              />
            </section>

            {/* Description */}
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black text-slate-950">
                About this place
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm font-medium leading-7 text-slate-600 sm:text-base">
                {apartment.description ||
                  "The host has not added a property description yet."}
              </p>
            </section>

            {/* Amenities */}
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">
                    Comfort and essentials
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    What this place offers
                  </h2>
                </div>

                <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                  {Number(apartment.amenities?.length || 0)} amenities
                </span>
              </div>

              {Array.isArray(apartment.amenities) &&
              apartment.amenities.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {apartment.amenities.map((amenity, index) => (
                    <div
                      key={`${amenity}-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
                        <FiCheck aria-hidden="true" />
                      </span>

                      <span className="break-words">{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Amenities have not been listed yet.
                </p>
              )}
            </section>

            {/* Timings and rules */}
            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black text-slate-950">
                  Stay timings
                </h2>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <span className="inline-flex items-center gap-2 font-bold text-slate-500">
                      <FiClock aria-hidden="true" />
                      Check-in
                    </span>

                    <strong className="text-slate-950">
                      {apartment.policies?.checkInTime || "14:00"}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <span className="inline-flex items-center gap-2 font-bold text-slate-500">
                      <FiClock aria-hidden="true" />
                      Check-out
                    </span>

                    <strong className="text-slate-950">
                      {apartment.policies?.checkOutTime || "11:00"}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <span className="inline-flex items-center gap-2 font-bold text-slate-500">
                      <FiCalendar aria-hidden="true" />
                      Available from
                    </span>

                    <strong className="text-right text-slate-950">
                      {formatDate(
                        apartment.availability?.availableFrom
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black text-slate-950">
                  House rules
                </h2>

                <div className="mt-5 space-y-3">
                  {(Array.isArray(apartment.houseRules) &&
                  apartment.houseRules.length > 0
                    ? apartment.houseRules
                    : ["Respect the property and neighbourhood."]
                  ).map((rule, index) => (
                    <div
                      key={`${rule}-${index}`}
                      className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600"
                    >
                      <FiShield
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-[#FF385C]"
                      />

                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF385C]">
                  Location
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Where you will stay
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {locationText ||
                    "The exact location will be provided by the host."}
                </p>
              </div>

              {hasValidCoordinates && (
                <iframe
                  title={`${apartment.title || "Property"} map`}
                  loading="lazy"
                  className="h-72 w-full border-0 sm:h-96"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    longitude - 0.02
                  }%2C${latitude - 0.02}%2C${
                    longitude + 0.02
                  }%2C${
                    latitude + 0.02
                  }&layer=mapnik&marker=${latitude}%2C${longitude}`}
                />
              )}
            </section>
          </div>

          {/* Price card */}
          <aside className="lg:sticky lg:top-24">
            <motion.div
              initial={{
                opacity: 0,
                x: 18,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
            >
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                  Starting price
                </p>

                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-black">
                    {money(price, currency)}
                  </span>

                  <span className="pb-1 text-xs font-bold text-white/55">
                    / {priceUnit}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-white/65">
                  <FiShield
                    aria-hidden="true"
                    className="shrink-0 text-emerald-400"
                  />

                  <span>Approved and verified by StayNest</span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Check-in
                    </p>

                    <p className="mt-1 text-xs font-black text-slate-900">
                      {apartment.policies?.checkInTime || "14:00"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Check-out
                    </p>

                    <p className="mt-1 text-xs font-black text-slate-900">
                      {apartment.policies?.checkOutTime || "11:00"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-y border-slate-100 py-4 text-sm">
                  <div className="flex justify-between gap-3 text-slate-500">
                    <span>Cleaning charge</span>

                    <strong className="text-right text-slate-900">
                      {money(
                        apartment.pricing?.cleaningFee,
                        currency
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-slate-500">
                    <span>Extra guest charge</span>

                    <strong className="text-right text-slate-900">
                      {money(
                        apartment.pricing?.extraGuestFee,
                        currency
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3 text-slate-500">
                    <span>Cancellation</span>

                    <strong className="text-right capitalize text-slate-900">
                      {apartment.policies?.cancellationPolicy ||
                        "Moderate"}
                    </strong>
                  </div>
                </div>

                <Link
                  to={isAuthenticated ? "/profile" : "/login"}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF385C] to-rose-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <FiUser aria-hidden="true" />

                  {isAuthenticated
                    ? "Continue to booking"
                    : "Login to book"}
                </Link>

                <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
                  You will review the complete price before payment.
                </p>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {activeImage && (
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
            className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/95 p-4 backdrop-blur"
            onClick={() => setActiveImage(null)}
          >
            <motion.button
              type="button"
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              onClick={() => setActiveImage(null)}
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Close image preview"
            >
              <FiX aria-hidden="true" />
            </motion.button>

            <motion.img
              initial={{
                opacity: 0,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              src={activeImage}
              alt={apartment.title || "Property preview"}
              className="max-h-[88vh] max-w-[94vw] rounded-[28px] object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}