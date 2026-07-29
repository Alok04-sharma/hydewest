import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import listingService from "../../services/listing.service";
import bookingService from "../../services/booking.service";
import wishlistService from "../../services/wishlist.service";
import guestMembershipService from "../../services/guestMembership.service";
import chatService from "../../services/chat.service";
import guestService from "../../services/guest.service";
import { fetchUserProfile } from "../../redux/slices/authSlice";
import UberRideButton from "../../components/common/UberRideButton";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85";

const BOOKING_UNITS = [
  {
    value: "hour",
    label: "Hour",
    plural: "Hours",
    short: "hr",
    icon: "⏱️",
    description: "Short daytime use",
  },
  {
    value: "night",
    label: "Night",
    plural: "Nights",
    short: "night",
    icon: "🌙",
    description: "Best overnight value",
  },
  {
    value: "week",
    label: "Week",
    plural: "Weeks",
    short: "week",
    icon: "🗓️",
    description: "Long-stay savings",
  },
  {
    value: "month",
    label: "Month",
    plural: "Months",
    short: "month",
    icon: "📆",
    description: "Maximum monthly value",
  },
];

const BOOKING_PURPOSES = [
  { value: "leisure", label: "Leisure or vacation", icon: "🌴" },
  { value: "business", label: "Business or work", icon: "💼" },
  { value: "family_visit", label: "Family or personal visit", icon: "👨‍👩‍👧" },
  { value: "other", label: "Other purpose", icon: "✍️" },
];

const RATE_MULTIPLIERS = Object.freeze({
  hour: 0.08,
  night: 0.9,
  day: 1,
  week: 6,
  month: 24,
});

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const positiveNumber = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const inferDailyRate = (pricing = {}) => {
  const rates = pricing.rates || {};

  if (positiveNumber(rates.day)) return positiveNumber(rates.day);

  const basePrice = positiveNumber(pricing.basePrice);
  const legacyUnit = String(pricing.priceUnit || "").toLowerCase();

  if (basePrice && RATE_MULTIPLIERS[legacyUnit]) {
    return basePrice / RATE_MULTIPLIERS[legacyUnit];
  }

  const nightRate =
    positiveNumber(rates.night) || positiveNumber(pricing.pricePerNight);

  if (nightRate) return nightRate / RATE_MULTIPLIERS.night;
  if (positiveNumber(rates.hour)) {
    return positiveNumber(rates.hour) / RATE_MULTIPLIERS.hour;
  }
  if (positiveNumber(rates.week)) {
    return positiveNumber(rates.week) / RATE_MULTIPLIERS.week;
  }
  if (positiveNumber(rates.month)) {
    return positiveNumber(rates.month) / RATE_MULTIPLIERS.month;
  }

  return basePrice;
};

const getRate = (apartment, unit) => {
  const pricing = apartment?.pricing || {};
  const explicitRate = positiveNumber(pricing.rates?.[unit]);

  if (explicitRate) return explicitRate;

  const dailyRate = inferDailyRate(pricing);
  return Math.max(Math.round(dailyRate * (RATE_MULTIPLIERS[unit] || 1)), 0);
};

const getLocalDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const getLocalDateTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const toLocalInputValue = (date, includeTime) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, includeTime ? 16 : 10);
};

const getMinimumCount = (unit, minimumDays) => {
  const days = Math.max(Number(minimumDays || 1), 1);

  if (unit === "hour") {
    return days > 1 ? days * 24 : 1;
  }
  if (unit === "week") {
    return Math.max(Math.ceil(days / 7), 1);
  }
  if (unit === "month") {
    return Math.max(Math.ceil(days / 30), 1);
  }

  return days;
};

const calculateCheckout = (checkIn, bookingUnit, unitCount) => {
  if (!checkIn) return "";

  const count = Math.max(Number(unitCount || 1), 1);
  const isHourly = bookingUnit === "hour";
  const start = new Date(isHourly ? checkIn : `${checkIn}T12:00:00`);

  if (Number.isNaN(start.getTime())) return "";

  const end = new Date(start);

  if (bookingUnit === "hour") {
    end.setHours(end.getHours() + count);
  } else if (bookingUnit === "week") {
    end.setDate(end.getDate() + count * 7);
  } else if (bookingUnit === "month") {
    end.setMonth(end.getMonth() + count);
  } else {
    end.setDate(end.getDate() + count);
  }

  return toLocalInputValue(end, isHourly);
};

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not selected";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not selected";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
};

const getDateRangeConflict = (checkIn, checkOut, bookedPeriods = []) => {
  if (!checkIn || !checkOut) return null;

  const requestedStart = new Date(checkIn);
  const requestedEnd = new Date(checkOut);

  if (
    Number.isNaN(requestedStart.getTime()) ||
    Number.isNaN(requestedEnd.getTime())
  ) {
    return null;
  }

  return (
    bookedPeriods.find((period) => {
      const bookedStart = new Date(period.checkIn);
      const bookedEnd = new Date(period.checkOut);

      return bookedStart < requestedEnd && bookedEnd > requestedStart;
    }) || null
  );
};

const couponValueText = (coupon) =>
  coupon?.discountType === "fixed"
    ? `${money(coupon.discountValue)} OFF`
    : `${Number(coupon?.discountValue || 0)}% OFF`;

function InfoPill({ icon, title, value, premium }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        premium
          ? "border-amber-300/20 bg-[#111827]/88 shadow-[0_18px_55px_rgba(0,0,0,.22)]"
          : "border-rose-200/70 bg-rose-50/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0">
          <span
            className={`block text-[9px] font-black uppercase tracking-[0.16em] ${
              premium ? "text-amber-200/55" : "text-slate-400"
            }`}
          >
            {title}
          </span>
          <span
            className={`mt-1 block truncate text-sm font-black ${
              premium ? "text-white" : "text-slate-950"
            }`}
          >
            {value}
          </span>
        </span>
      </div>
    </div>
  );
}

function CouponCard({
  coupon,
  selected,
  premiumActive,
  premiumTheme,
  onApply,
  onUpgrade,
}) {
  const premiumLocked = Boolean(coupon.premiumOnly && !premiumActive);
  const locked = Boolean(coupon.isLocked || coupon.canApply === false);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      className={`rounded-2xl border p-3 transition ${
        selected
          ? premiumTheme
            ? "border-amber-300 bg-amber-300/15"
            : "border-[#c01042] bg-rose-100/75"
          : premiumTheme
            ? "border-amber-300/15 bg-[#0f172a]/88"
            : "border-rose-200/65 bg-[#fff7f8]/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${
            premiumTheme
              ? "bg-amber-300 text-slate-950"
              : "bg-slate-950 text-white"
          }`}
        >
          {coupon.code}
        </span>
        <strong
          className={`text-xs ${
            premiumTheme ? "text-emerald-300" : "text-emerald-700"
          }`}
        >
          {couponValueText(coupon)}
        </strong>
      </div>

      <p
        className={`mt-2 text-xs font-black ${
          premiumTheme ? "text-white" : "text-slate-900"
        }`}
      >
        {coupon.label || "Host offer"}
      </p>
      <p
        className={`mt-1 text-[10px] leading-4 ${
          premiumTheme ? "text-white/45" : "text-slate-500"
        }`}
      >
        {premiumLocked
          ? "Premium membership required."
          : coupon.lockedReason || coupon.description || "Eligible booking offer."}
      </p>

      <button
        type="button"
        onClick={() => {
          if (premiumLocked) onUpgrade();
          else if (!locked || selected) onApply(coupon.code);
        }}
        className={`mt-3 w-full rounded-xl px-3 py-2 text-[10px] font-black transition ${
          premiumLocked
            ? "bg-amber-300 text-slate-950"
            : selected
              ? "bg-emerald-600 text-white"
              : locked
                ? premiumTheme
                  ? "cursor-not-allowed bg-white/[0.06] text-white/30"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
                : premiumTheme
                  ? "bg-white/10 text-amber-200 hover:bg-amber-300 hover:text-slate-950"
                  : "bg-slate-950 text-white hover:bg-[#c01042]"
        }`}
      >
        {premiumLocked
          ? "Unlock Premium"
          : selected
            ? "Remove coupon"
            : locked
              ? "Not eligible yet"
              : "Apply coupon"}
      </button>
    </motion.article>
  );
}

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [apartment, setApartment] = useState(null);
  const [membership, setMembership] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMedia, setActiveMedia] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingConflict, setBookingConflict] = useState(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [priceAlertSaving, setPriceAlertSaving] = useState(false);
  const [priceAlertNotice, setPriceAlertNotice] = useState("");

  const [form, setForm] = useState({
    bookingUnit: "night",
    unitCount: 1,
    checkIn: "",
    checkOut: "",
    guestsCount: 1,
    couponCode: "",
    paymentMethod: "any",
    loyaltyPointsToRedeem: 0,
    bookingInsurance: false,
    bookingPurpose: "leisure",
    bookingPurposeDetails: "",
    message: "",
  });

  const role = String(user?.role || "").toLowerCase();
  const isGuest = role === "guest";

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const listingResponse = await listingService.getPublicById(id);

        if (!active) return;
        setApartment(listingResponse.data);

        if (isAuthenticated && isGuest) {
          const [membershipResponse, wishlistResponse] = await Promise.allSettled([
            guestMembershipService.getMyMembership(),
            wishlistService.getWishlist(),
          ]);

          if (membershipResponse.status === "fulfilled") {
            setMembership(membershipResponse.value.data || null);
          }

          if (wishlistResponse.status === "fulfilled") {
            setWishlistIds(
              new Set(
                (wishlistResponse.value.data?.apartments || []).map(
                  (item) => item._id
                )
              )
            );
          }
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Property details load nahi hui."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [id, isAuthenticated, isGuest]);

  const images = useMemo(() => {
    const normalized = (apartment?.images || [])
      .map((image, index) =>
        typeof image === "string"
          ? { url: image, order: index }
          : { ...image, order: Number(image.order ?? index) }
      )
      .filter((image) => image.url)
      .sort(
        (first, second) =>
          Number(Boolean(second.isCover)) - Number(Boolean(first.isCover)) ||
          first.order - second.order
      );

    return normalized.length ? normalized : [{ url: FALLBACK_IMAGE }];
  }, [apartment]);

  const videos = useMemo(
    () =>
      (apartment?.videos || [])
        .map((video, index) =>
          typeof video === "string"
            ? { url: video, order: index, type: "video" }
            : { ...video, order: Number(video.order ?? index), type: "video" }
        )
        .filter((video) => video.url)
        .sort((first, second) => first.order - second.order),
    [apartment]
  );

  const mediaItems = useMemo(
    () => [
      ...images.map((image) => ({ ...image, type: "image" })),
      ...videos,
    ],
    [images, videos]
  );

  const premiumActive = Boolean(membership?.isActive);
  const exclusiveLocked = Boolean(
    apartment?.premium?.isExclusive && !premiumActive
  );
  const wished = wishlistIds.has(id);
  const minimumStayDays = Math.max(
    Number(apartment?.policies?.minBookingDays || 1),
    1
  );
  const maximumStayDays = Math.max(
    Number(apartment?.policies?.maxBookingDays || 365),
    minimumStayDays
  );

  const bookingAvailability = apartment?.bookingAvailability || {};
  const bookedPeriods = Array.isArray(bookingAvailability.bookedPeriods)
    ? bookingAvailability.bookedPeriods
    : [];
  const currentReservedPeriod = bookingAvailability.currentBooking || null;
  const upcomingReservedPeriods = bookedPeriods
    .filter((period) => new Date(period.checkOut) > new Date())
    .slice(0, 4);
  const selectedUnit =
    BOOKING_UNITS.find((item) => item.value === form.bookingUnit) ||
    BOOKING_UNITS[1];
  const selectedRate = getRate(apartment, form.bookingUnit);
  const isHourly = form.bookingUnit === "hour";
  const minimumInput = isHourly ? getLocalDateTime() : getLocalDate();
  const minimumUnitCount = getMinimumCount(
    form.bookingUnit,
    minimumStayDays
  );

  useEffect(() => {
    if (!apartment) return;

    const count = getMinimumCount("night", minimumStayDays);

    setForm((current) => ({
      ...current,
      unitCount: Math.max(Number(current.unitCount || 1), count),
    }));
  }, [apartment, minimumStayDays]);

  useEffect(() => {
    const calculatedCheckout = calculateCheckout(
      form.checkIn,
      form.bookingUnit,
      form.unitCount
    );

    setForm((current) =>
      current.checkOut === calculatedCheckout
        ? current
        : { ...current, checkOut: calculatedCheckout }
    );
    setQuote(null);
  }, [form.checkIn, form.bookingUnit, form.unitCount]);

  const rawCoupons = useMemo(() => {
    if (quote?.availableCoupons?.length) return quote.availableCoupons;

    return (apartment?.coupons || []).map((coupon) => ({
      ...coupon,
      code: String(coupon.code || "").toUpperCase(),
      canApply: !coupon.premiumOnly || premiumActive,
      isLocked: Boolean(coupon.premiumOnly && !premiumActive),
      lockedReason:
        coupon.premiumOnly && !premiumActive
          ? "Premium membership required."
          : "Choose your stay and calculate the price to validate this coupon.",
    }));
  }, [apartment, premiumActive, quote]);

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setQuote(null);
    setBookingConflict(null);
    setError("");
  };

  const changeBookingUnit = (unit) => {
    const nextCount = getMinimumCount(unit, minimumStayDays);

    setForm((current) => ({
      ...current,
      bookingUnit: unit,
      unitCount: nextCount,
      checkOut: calculateCheckout(current.checkIn, unit, nextCount),
      couponCode: "",
      paymentMethod: "any",
    }));
    setQuote(null);
    setBookingConflict(null);
    setError("");
  };

  const changeUnitCount = (difference) => {
    setForm((current) => {
      const next = Math.max(
        Number(current.unitCount || minimumUnitCount) + difference,
        minimumUnitCount
      );

      return {
        ...current,
        unitCount: next,
        checkOut: calculateCheckout(current.checkIn, current.bookingUnit, next),
      };
    });
    setQuote(null);
    setBookingConflict(null);
  };

  const buildPayload = (overrides = {}) => ({
    apartmentId: id,
    ...form,
    ...overrides,
    unitCount: Number(overrides.unitCount ?? form.unitCount),
    guestsCount: Number(overrides.guestsCount ?? form.guestsCount),
    loyaltyPointsToRedeem: Number(
      overrides.loyaltyPointsToRedeem ?? form.loyaltyPointsToRedeem ?? 0
    ),
  });

  const ensureGuestAccount = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return null;
    }

    let activeUser = user;

    if (!activeUser) {
      try {
        activeUser = await dispatch(fetchUserProfile()).unwrap();
      } catch {
        setError("Your session could not be verified. Please login again.");
        return null;
      }
    }

    const activeRole = String(activeUser?.role || "").toLowerCase();

    if (activeRole !== "guest") {
      setError("Booking can only be created from a Guest account.");
      return null;
    }

    return activeUser;
  };

  const useSuggestedCheckIn = (value) => {
    if (!value) return;

    const nextCheckIn = toLocalInputValue(new Date(value), isHourly);

    setForm((current) => ({
      ...current,
      checkIn: nextCheckIn,
      checkOut: calculateCheckout(
        nextCheckIn,
        current.bookingUnit,
        current.unitCount
      ),
    }));
    setQuote(null);
    setBookingConflict(null);
    setError("");
  };

  const calculate = async (overrides = {}) => {
    const activeGuest = await ensureGuestAccount();
    if (!activeGuest) return null;

    if (!form.checkIn || !form.checkOut) {
      setError("Please select check-in and stay duration first.");
      return null;
    }

    const localConflict = getDateRangeConflict(
      overrides.checkIn || form.checkIn,
      overrides.checkOut || form.checkOut,
      bookedPeriods
    );

    if (localConflict) {
      setBookingConflict({
        blockedPeriod: localConflict,
        suggestedCheckIn: localConflict.checkOut,
      });
      setError("This property is already booked for the selected dates. Please choose another date.");
      return null;
    }

    try {
      setQuoting(true);
      setError("");
      const response = await bookingService.getQuote(buildPayload(overrides));
      const nextQuote = response.data;
      setQuote(nextQuote);
      setBookingConflict(null);
      return nextQuote;
    } catch (requestError) {
      const conflictData = requestError.response?.data?.data;
      setQuote(null);
      setBookingConflict(
        conflictData?.code === "BOOKING_DATE_CONFLICT" ? conflictData : null
      );
      setError(
        requestError.response?.data?.message || "The booking price could not be calculated."
      );
      return null;
    } finally {
      setQuoting(false);
    }
  };

  const applyCoupon = async (code) => {
    const nextCode = form.couponCode === code ? "" : code;
    const selectedCoupon = rawCoupons.find((coupon) => coupon.code === nextCode);
    const requiredMethod = ["upi", "card"].includes(
      selectedCoupon?.paymentMethod
    )
      ? selectedCoupon.paymentMethod
      : "any";

    setForm((current) => ({
      ...current,
      couponCode: nextCode,
      paymentMethod: requiredMethod,
    }));

    if (form.checkIn && form.checkOut) {
      await calculate({
        couponCode: nextCode,
        paymentMethod: requiredMethod,
      });
    }
  };

  const confirmBooking = async () => {
    if (form.bookingPurpose === "other" && form.bookingPurposeDetails.trim().length < 3) {
      setError("Please briefly describe your booking purpose.");
      return;
    }

    if (exclusiveLocked) {
      navigate("/guest/premium");
      return;
    }

    const freshQuote = quote || (await calculate());
    if (!freshQuote) return;

    try {
      setBooking(true);
      setError("");
      const response = await bookingService.createBooking(buildPayload());
      navigate(`/guest/checkout/${response.data._id}`);
    } catch (requestError) {
      const conflictData = requestError.response?.data?.data;
      setBookingConflict(
        conflictData?.code === "BOOKING_DATE_CONFLICT" ? conflictData : null
      );
      setError(
        requestError.response?.data?.message || "Booking create nahi hui."
      );
    } finally {
      setBooking(false);
    }
  };

  const toggleWishlist = async () => {
    if (!isAuthenticated) return navigate("/login");

    try {
      if (wished) {
        await wishlistService.removeFromWishlist(id);
        setWishlistIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      } else {
        await wishlistService.addToWishlist(id);
        setWishlistIds((current) => new Set([...current, id]));
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Wishlist update nahi hui."
      );
    }
  };

  const startChat = async () => {
    if (!isAuthenticated) return navigate("/login");

    try {
      const response = await chatService.startConversation(id);
      navigate(`/guest/messages/${response.data._id}`);
    } catch (requestError) {
      if (requestError.response?.status === 403) {
        navigate("/guest/premium");
      } else {
        setError(requestError.response?.data?.message || "Chat start nahi hui.");
      }
    }
  };

  const enablePriceAlert = async () => {
    if (!isAuthenticated) return navigate("/login");
    if (!premiumActive) return navigate("/guest/premium");

    try {
      setPriceAlertSaving(true);
      setError("");
      const targetPrice = Math.max(Math.floor(selectedRate * 0.9), 1);
      await guestService.createPriceAlert({ apartmentId: id, targetPrice });
      setPriceAlertNotice(`Price alert active at ${money(targetPrice)}.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Price alert save nahi hua."
      );
    } finally {
      setPriceAlertSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto min-h-[75vh] max-w-7xl px-4 py-10">
        <div className="skeleton-shimmer h-10 w-2/3 rounded-full" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
          <div className="skeleton-shimmer h-[520px] rounded-[32px]" />
          <div className="skeleton-shimmer h-[520px] rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <div className="max-w-lg rounded-[30px] border border-red-200 bg-red-50/80 p-8 text-center">
          <div className="text-5xl">🏠</div>
          <h1 className="mt-4 text-2xl font-black">Property unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || "This listing is no longer public."}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const locationText = [
    apartment.location?.address,
    apartment.location?.landmark,
    apartment.location?.city,
    apartment.location?.state,
  ]
    .filter(Boolean)
    .join(", ");

  const cardTheme = premiumActive
    ? "border-amber-300/25 bg-[radial-gradient(circle_at_92%_0%,rgba(251,191,36,.18),transparent_18rem),linear-gradient(160deg,#161d30_0%,#0b1020_55%,#201506_100%)] text-white shadow-[0_30px_95px_rgba(0,0,0,.48)]"
    : "border-rose-200/70 bg-[radial-gradient(circle_at_100%_0%,rgba(255,56,92,.12),transparent_18rem),linear-gradient(160deg,#fff8f8_0%,#fcecef_100%)] text-slate-950 shadow-[0_28px_80px_rgba(86,20,42,.15)]";

  return (
    <div
      className={`min-h-screen pb-14 ${
        premiumActive
          ? "bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.16),transparent_30rem),radial-gradient(circle_at_5%_42%,rgba(180,83,9,.08),transparent_28rem),linear-gradient(180deg,#070b14_0%,#0b1020_48%,#111827_100%)]"
          : "bg-[radial-gradient(circle_at_8%_0%,rgba(255,56,92,.10),transparent_30rem),linear-gradient(180deg,#fff1f3_0%,#eef2f7_100%)]"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col justify-between gap-4 rounded-[28px] border p-5 sm:flex-row sm:items-start sm:p-6 ${
            premiumActive
              ? "border-amber-300/15 bg-[linear-gradient(145deg,rgba(17,24,39,.94),rgba(20,16,10,.92))] shadow-[0_20px_60px_rgba(0,0,0,.24)]"
              : "border-rose-200/60 bg-rose-50/45"
          }`}
        >
          <div>
            <Link
              to="/"
              className={`text-xs font-black ${
                premiumActive ? "text-amber-300" : "text-[#bd123f]"
              }`}
            >
              ← Back to properties
            </Link>
            <h1
              className={`mt-3 text-3xl font-black tracking-tight sm:text-5xl ${
                premiumActive ? "text-white" : "text-slate-950"
              }`}
            >
              {apartment.title}
            </h1>
            <p
              className={`mt-2 text-sm font-semibold ${
                premiumActive ? "text-white/50" : "text-slate-600"
              }`}
            >
              ⭐ {Number(apartment.rating || 0).toFixed(1)} · 📍 {locationText}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <UberRideButton
              compact
              latitude={apartment.location?.latitude}
              longitude={apartment.location?.longitude}
              nickname={apartment.title}
              className={premiumActive ? "bg-amber-300 !text-slate-950 hover:bg-amber-200" : ""}
            />
            <button
              type="button"
              onClick={toggleWishlist}
              className={`rounded-2xl border px-4 py-2.5 text-xs font-black ${
                premiumActive
                  ? "border-amber-300/25 bg-[#182033]/95 text-amber-100"
                  : "border-rose-200 bg-rose-50 text-slate-700"
              }`}
            >
              {wished ? "♥ Saved" : "♡ Save"}
            </button>
            <button
              type="button"
              onClick={startChat}
              className={`rounded-2xl px-4 py-2.5 text-xs font-black ${
                premiumActive
                  ? "bg-amber-300 text-slate-950"
                  : "bg-slate-950 text-white"
              }`}
            >
              {premiumActive ? "💬 Chat with Host" : "🔒 Premium chat"}
            </button>
          </div>
        </div>

        <section
          className={`mt-6 overflow-hidden rounded-[30px] border p-3 ${
            premiumActive
              ? "border-amber-300/20 bg-[#0f172a] shadow-[0_24px_70px_rgba(0,0,0,.35)]"
              : "border-rose-200/60 bg-rose-50/50"
          }`}
        >
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth">
            {mediaItems.map((media, index) => (
              <motion.button
                type="button"
                key={media.publicId || media.url || index}
                whileHover={{ y: -3 }}
                onClick={() => setActiveMedia(media)}
                className={`group relative shrink-0 snap-start overflow-hidden rounded-[24px] bg-slate-200 ${
                  index === 0
                    ? "h-[320px] w-[88%] sm:h-[440px] sm:w-[72%] lg:h-[520px] lg:w-[58%]"
                    : "h-[320px] w-[78%] sm:h-[440px] sm:w-[46%] lg:h-[520px] lg:w-[34%]"
                }`}
              >
                {media.type === "video" ? (
                  <>
                    <video
                      src={media.url}
                      poster={media.thumbnailUrl || undefined}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-slate-950/20">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-2xl text-slate-950 shadow-2xl">▶</span>
                    </span>
                    <span className="absolute left-4 top-4 rounded-full bg-slate-950/75 px-3 py-1.5 text-[10px] font-black uppercase text-white backdrop-blur">Video tour</span>
                  </>
                ) : (
                  <img
                    src={media.url}
                    alt={`${apartment.title} ${index + 1}`}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/65 to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-slate-900">
                  {index === 0 ? "Cover" : `${index + 1} / ${mediaItems.length}`}
                </span>
              </motion.button>
            ))}
          </div>
          {mediaItems.length > 3 && (
            <p className={`mt-3 text-center text-[10px] font-black uppercase tracking-[.16em] ${premiumActive ? "text-amber-200/55" : "text-slate-500"}`}>
              Swipe or scroll to explore all {mediaItems.length} photos and videos
            </p>
          )}
        </section>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6">
            <section
              className={`rounded-[30px] border p-6 ${
                premiumActive
                  ? "border-amber-300/20 bg-[#111827]/88 shadow-[0_18px_55px_rgba(0,0,0,.22)] text-white"
                  : "border-rose-200/65 bg-rose-50/55"
              }`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  premiumActive ? "text-amber-300" : "text-[#bd123f]"
                }`}
              >
                {apartment.propertyType || "Property"}
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Hosted by {apartment.host?.name || "hydewest Host"}
              </h2>
              <p
                className={`mt-2 text-sm ${
                  premiumActive ? "text-white/50" : "text-slate-600"
                }`}
              >
                {apartment.guests || 1} guests · {apartment.bedrooms || 0} bedrooms · {apartment.beds || 1} beds · {apartment.bathrooms || 1} bathrooms
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <InfoPill icon="👥" title="Guests" value={apartment.guests || 1} premium={premiumActive} />
              <InfoPill icon="🛏️" title="Beds" value={apartment.beds || 1} premium={premiumActive} />
              <InfoPill icon="🚪" title="Bedrooms" value={apartment.bedrooms || 0} premium={premiumActive} />
              <InfoPill icon="🚿" title="Bathrooms" value={apartment.bathrooms || 1} premium={premiumActive} />
            </section>

            <section
              className={`rounded-[30px] border p-6 ${
                premiumActive
                  ? "border-amber-300/20 bg-[#111827]/88 shadow-[0_18px_55px_rgba(0,0,0,.22)] text-white"
                  : "border-rose-200/65 bg-rose-50/55"
              }`}
            >
              <h2 className="text-xl font-black">About this property</h2>
              <p
                className={`mt-4 whitespace-pre-line text-sm leading-7 ${
                  premiumActive ? "text-white/60" : "text-slate-600"
                }`}
              >
                {apartment.description}
              </p>
            </section>

            <section
              className={`rounded-[30px] border p-6 ${
                premiumActive
                  ? "border-amber-300/20 bg-[#111827]/88 shadow-[0_18px_55px_rgba(0,0,0,.22)] text-white"
                  : "border-rose-200/65 bg-rose-50/55"
              }`}
            >
              <h2 className="text-xl font-black">Amenities</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(apartment.amenities || []).map((amenity) => (
                  <div
                    key={amenity}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                      premiumActive
                        ? "border-amber-300/15 bg-[#0f172a]/92 text-amber-50/80"
                        : "border-rose-200/60 bg-[#fff8f8]/70 text-slate-700"
                    }`}
                  >
                    ✓ {amenity}
                  </div>
                ))}
              </div>
            </section>

            <section
              className={`rounded-[30px] border p-6 ${
                premiumActive
                  ? "border-amber-300/20 bg-[#111827]/88 text-white shadow-[0_18px_55px_rgba(0,0,0,.22)]"
                  : "border-rose-200/65 bg-rose-50/55"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[.18em] ${premiumActive ? "text-amber-300" : "text-[#bd123f]"}`}>Around the apartment</p>
                  <h2 className="mt-1 text-xl font-black">Apartment information</h2>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${premiumActive ? "bg-amber-300/10 text-amber-200" : "bg-rose-100 text-rose-700"}`}>Host provided</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["✈️", "Nearest airport", apartment.nearbyInformation?.nearestAirport],
                  ["🚆", "Railway station", apartment.nearbyInformation?.railwayStation],
                  ["🚌", "Bus stand", apartment.nearbyInformation?.busStand],
                  ["🚇", "Metro", apartment.nearbyInformation?.metro],
                  ["🛍️", "Nearby market", apartment.nearbyInformation?.nearbyMarket],
                  ["🛒", "Grocery store", apartment.nearbyInformation?.groceryStore],
                  ["🏥", "Hospital", apartment.nearbyInformation?.hospital],
                  ["💊", "Medical store", apartment.nearbyInformation?.medicalStore],
                  ["🅿️", "Parking", apartment.nearbyInformation?.parking],
                  ["📶", "Internet", apartment.nearbyInformation?.internet],
                  ["🔋", "Power backup", apartment.nearbyInformation?.powerBackup],
                ].filter((item) => item[2]).map(([icon, label, value]) => (
                  <div key={label} className={`rounded-2xl border p-4 ${premiumActive ? "border-white/10 bg-white/[.04]" : "border-rose-200/60 bg-white/55"}`}>
                    <span className="text-xl">{icon}</span><p className="mt-2 text-[9px] font-black uppercase tracking-wider opacity-45">{label}</p><p className="mt-1 text-sm font-black">{value}</p>
                  </div>
                ))}
              </div>
              {(apartment.nearbyInformation?.otherFacilities || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">{apartment.nearbyInformation.otherFacilities.map((item) => <span key={item} className={`rounded-full px-3 py-1.5 text-xs font-bold ${premiumActive ? "bg-amber-300/10 text-amber-100" : "bg-rose-100 text-slate-700"}`}>{item}</span>)}</div>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Link to={`/apartment/${id}/rules`} className={`group rounded-[26px] border p-5 transition hover:-translate-y-1 ${premiumActive ? "border-amber-300/20 bg-[#111827]/88 text-white" : "border-rose-200/65 bg-rose-50/55"}`}>
                <span className="text-2xl">📜</span><h2 className="mt-3 text-lg font-black">Host Rules</h2><p className="mt-1 text-xs opacity-55">Read all stay, check-in and property rules.</p><span className={`mt-4 inline-flex text-xs font-black ${premiumActive ? "text-amber-300" : "text-rose-700"}`}>Open rules →</span>
              </Link>
              <Link to={`/apartment/${id}/appliance-guide`} className={`group rounded-[26px] border p-5 transition hover:-translate-y-1 ${premiumActive ? "border-amber-300/20 bg-[#111827]/88 text-white" : "border-rose-200/65 bg-rose-50/55"}`}>
                <span className="text-2xl">🔌</span><h2 className="mt-3 text-lg font-black">Appliance Guide</h2><p className="mt-1 text-xs opacity-55">Instructions for AC, TV, kitchen and laundry appliances.</p><span className={`mt-4 inline-flex text-xs font-black ${premiumActive ? "text-amber-300" : "text-rose-700"}`}>Open guide →</span>
              </Link>
            </section>

            <section
              className={`grid gap-4 rounded-[30px] border p-6 sm:grid-cols-2 ${
                premiumActive
                  ? "border-amber-300/20 bg-[#111827]/88 shadow-[0_18px_55px_rgba(0,0,0,.22)] text-white"
                  : "border-rose-200/65 bg-rose-50/55"
              }`}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-55">Check-in</p>
                <p className="mt-1 font-black">{apartment.policies?.checkInTime || "14:00"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-55">Check-out</p>
                <p className="mt-1 font-black">{apartment.policies?.checkOutTime || "11:00"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-55">Minimum stay</p>
                <p className="mt-1 font-black">{minimumStayDays} day(s)</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-55">Maximum stay</p>
                <p className="mt-1 font-black">{maximumStayDays} day(s)</p>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-5">
            <motion.section
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              className={`overflow-hidden rounded-[32px] border ${cardTheme}`}
            >
              <div
                className={`border-b p-5 sm:p-6 ${
                  premiumActive ? "border-amber-300/15" : "border-rose-200/65"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        premiumActive ? "text-amber-300" : "text-[#bd123f]"
                      }`}
                    >
                      {premiumActive ? "👑 Premium reservation" : "Reserve this stay"}
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-3xl font-black">{money(selectedRate)}</span>
                      <span className="pb-1 text-xs font-bold opacity-50">/{selectedUnit.short}</span>
                    </div>
                  </div>
                  {premiumActive && (
                    <span className="rounded-full bg-amber-300 px-3 py-1.5 text-[9px] font-black uppercase text-slate-950">
                      Member pricing
                    </span>
                  )}
                </div>

                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold ${
                    premiumActive
                      ? "border-amber-300/15 bg-amber-300/10 text-amber-100"
                      : "border-rose-200 bg-rose-100/60 text-slate-700"
                  }`}
                >
                  Host rule: minimum {minimumStayDays} day(s), maximum {maximumStayDays} day(s).
                </div>

                {upcomingReservedPeriods.length > 0 && (
                  <div
                    className={`mt-3 rounded-2xl border p-4 ${
                      premiumActive
                        ? "border-orange-300/20 bg-orange-400/10"
                        : "border-rose-200 bg-rose-50/85"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${premiumActive ? "text-rose-200" : "text-rose-700"}`}>
                          Reserved periods
                        </p>
                        <p className="mt-1 text-[10px] font-semibold opacity-60">
                          These periods are already booked. You can choose dates before or after them.
                        </p>
                      </div>
                      <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[9px] font-black text-white">
                        {upcomingReservedPeriods.length} blocked
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {upcomingReservedPeriods.map((period, index) => (
                        <div
                          key={`${period.checkIn}-${period.checkOut}-${index}`}
                          className={`flex flex-col justify-between gap-1 rounded-xl border px-3 py-2 text-[10px] font-bold sm:flex-row sm:items-center ${
                            premiumActive
                              ? "border-white/10 bg-black/15 text-amber-50"
                              : "border-rose-200 bg-white/70 text-slate-700"
                          }`}
                        >
                          <span>
                            {formatDate(period.checkIn, true)} → {formatDate(period.checkOut, true)}
                          </span>
                          <span className="font-black text-rose-500">Unavailable</span>
                        </div>
                      ))}
                    </div>

                    {currentReservedPeriod && (
                      <button
                        type="button"
                        onClick={() =>
                          useSuggestedCheckIn(
                            bookingAvailability.nextAvailableAt ||
                              currentReservedPeriod.checkOut
                          )
                        }
                        className={`mt-3 w-full rounded-xl px-3 py-2 text-[10px] font-black ${
                          premiumActive
                            ? "bg-amber-300 text-slate-950"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        Use next available time · {formatDate(
                          bookingAvailability.nextAvailableAt ||
                            currentReservedPeriod.checkOut,
                          true
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {error && (
                  <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                    <p>{error}</p>
                    {bookingConflict?.suggestedCheckIn && (
                      <button
                        type="button"
                        onClick={() =>
                          useSuggestedCheckIn(bookingConflict.suggestedCheckIn)
                        }
                        className="mt-2 rounded-xl bg-red-500 px-3 py-2 text-[10px] font-black text-white"
                      >
                        Book after {formatDate(
                          bookingConflict.suggestedCheckIn,
                          true
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${
                        premiumActive
                          ? "bg-amber-300 text-slate-950"
                          : "bg-[#bd123f] text-white"
                      }`}
                    >
                      1
                    </span>
                    <div>
                      <h3 className="text-sm font-black">Choose your stay type</h3>
                      <p className="text-[10px] opacity-45">Rates change automatically by duration.</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {BOOKING_UNITS.map((unit) => {
                      const selected = form.bookingUnit === unit.value;
                      const rate = getRate(apartment, unit.value);

                      return (
                        <button
                          key={unit.value}
                          type="button"
                          onClick={() => changeBookingUnit(unit.value)}
                          className={`rounded-2xl border p-2.5 text-left transition ${
                            selected
                              ? premiumActive
                                ? "border-amber-300 bg-amber-300/15"
                                : "border-[#bd123f] bg-rose-100/75"
                              : premiumActive
                                ? "border-white/10 bg-white/[0.04] hover:border-amber-300/40"
                                : "border-rose-200/65 bg-[#fff8f8]/70 hover:border-rose-300"
                          }`}
                        >
                          <span className="text-lg">{unit.icon}</span>
                          <span className="mt-1 block text-[10px] font-black">{unit.label}</span>
                          <span
                            className={`mt-0.5 block text-[9px] font-bold ${
                              premiumActive ? "text-amber-300" : "text-[#bd123f]"
                            }`}
                          >
                            {money(rate)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`mt-3 flex items-center justify-between rounded-2xl border p-3 ${
                      premiumActive
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-rose-200/65 bg-[#fff8f8]/70"
                    }`}
                  >
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider opacity-45">Duration</p>
                      <p className="mt-1 text-sm font-black">
                        {form.unitCount} {Number(form.unitCount) === 1 ? selectedUnit.label : selectedUnit.plural}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeUnitCount(-1)}
                        disabled={Number(form.unitCount) <= minimumUnitCount}
                        className={`grid h-9 w-9 place-items-center rounded-xl text-lg font-black disabled:opacity-25 ${
                          premiumActive
                            ? "bg-[#202b43] text-white hover:bg-amber-300 hover:text-slate-950"
                            : "bg-rose-100 text-slate-700 hover:bg-[#bd123f] hover:text-white"
                        }`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={minimumUnitCount}
                        value={form.unitCount}
                        onChange={(event) =>
                          updateForm(
                            "unitCount",
                            Math.max(Number(event.target.value || 1), minimumUnitCount)
                          )
                        }
                        className={`h-9 w-16 rounded-xl border bg-transparent text-center text-sm font-black outline-none ${
                          premiumActive
                            ? "border-amber-300/20 text-white"
                            : "border-rose-200 text-slate-900"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => changeUnitCount(1)}
                        className={`grid h-9 w-9 place-items-center rounded-xl text-lg font-black ${
                          premiumActive
                            ? "bg-[#202b43] text-white hover:bg-amber-300 hover:text-slate-950"
                            : "bg-rose-100 text-slate-700 hover:bg-[#bd123f] hover:text-white"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${
                        premiumActive
                          ? "bg-amber-300 text-slate-950"
                          : "bg-[#bd123f] text-white"
                      }`}
                    >
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-black">Choose check-in</h3>
                      <p className="text-[10px] opacity-45">Check-out is calculated automatically.</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label>
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider opacity-50">Check-in</span>
                      <input
                        type={isHourly ? "datetime-local" : "date"}
                        min={minimumInput}
                        value={form.checkIn}
                        onChange={(event) => updateForm("checkIn", event.target.value)}
                        className={`w-full rounded-2xl border px-3 py-3 text-xs font-bold outline-none ${
                          premiumActive
                            ? "border-amber-300/20 bg-[#0c1220] text-white [color-scheme:dark]"
                            : "border-rose-200 bg-[#fff8f8]/80 text-slate-900"
                        }`}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider opacity-50">Auto check-out</span>
                      <div
                        className={`min-h-[42px] rounded-2xl border px-3 py-3 text-xs font-bold ${
                          premiumActive
                            ? "border-amber-300/15 bg-[#0f172a]/88 text-white/70"
                            : "border-rose-200 bg-rose-100/45 text-slate-700"
                        }`}
                      >
                        {formatDate(form.checkOut, isHourly)}
                      </div>
                    </label>
                  </div>

                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider opacity-50">Guests</span>
                    <select
                      value={form.guestsCount}
                      onChange={(event) => updateForm("guestsCount", event.target.value)}
                      className={`w-full rounded-2xl border px-3 py-3 text-xs font-bold outline-none ${
                        premiumActive
                          ? "border-amber-300/15 bg-[#171208] text-white"
                          : "border-rose-200 bg-[#fff8f8]/80 text-slate-900"
                      }`}
                    >
                      {Array.from({ length: apartment.guests || 1 }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>{count} guest{count > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-4">
                    <span className="mb-2 block text-[9px] font-black uppercase tracking-wider opacity-50">Purpose of booking</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BOOKING_PURPOSES.map((purpose) => {
                        const selected = form.bookingPurpose === purpose.value;

                        return (
                          <button
                            key={purpose.value}
                            type="button"
                            onClick={() => updateForm("bookingPurpose", purpose.value)}
                            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                              selected
                                ? premiumActive
                                  ? "border-amber-300 bg-amber-300/15 text-white"
                                  : "border-[#bd123f] bg-rose-100/75 text-slate-950"
                                : premiumActive
                                  ? "border-white/10 bg-white/[0.04] text-white/70 hover:border-amber-300/35"
                                  : "border-rose-200/65 bg-[#fff8f8]/70 text-slate-700 hover:border-rose-300"
                            }`}
                          >
                            <span className="text-xl" aria-hidden="true">{purpose.icon}</span>
                            <span className="text-xs font-black">{purpose.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider opacity-50">
                        {form.bookingPurpose === "other" ? "Describe your purpose" : "Additional note for the Host (optional)"}
                      </span>
                      <textarea
                        rows={3}
                        maxLength={300}
                        value={form.bookingPurposeDetails}
                        onChange={(event) => updateForm("bookingPurposeDetails", event.target.value)}
                        placeholder={form.bookingPurpose === "other" ? "Tell the Host why you are booking this stay..." : "Share any useful context with the Host..."}
                        className={`w-full resize-none rounded-2xl border px-3 py-3 text-xs font-semibold outline-none ${
                          premiumActive
                            ? "border-amber-300/15 bg-[#0f172a]/88 text-white placeholder:text-white/30"
                            : "border-rose-200 bg-[#fff8f8]/80 text-slate-900 placeholder:text-slate-400"
                        }`}
                      />
                      <span className="mt-1 block text-right text-[9px] font-bold opacity-35">{form.bookingPurposeDetails.length}/300</span>
                    </label>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setCouponOpen((current) => !current)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                      premiumActive
                        ? "border-amber-300/15 bg-[#0f172a]/88"
                        : "border-rose-200/65 bg-[#fff8f8]/70"
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-black">🎟️ Available coupons</span>
                      <span className="mt-0.5 block text-[10px] opacity-45">{rawCoupons.length} offers · Premium offers stay visible</span>
                    </span>
                    <motion.span animate={{ rotate: couponOpen ? 180 : 0 }}>⌄</motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {couponOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {rawCoupons.map((coupon) => (
                            <CouponCard
                              key={coupon.code}
                              coupon={coupon}
                              selected={form.couponCode === coupon.code}
                              premiumActive={premiumActive}
                              premiumTheme={premiumActive}
                              onApply={applyCoupon}
                              onUpgrade={() => navigate("/guest/premium")}
                            />
                          ))}
                          {!rawCoupons.length && (
                            <p className="rounded-2xl border border-dashed border-current/15 p-4 text-xs opacity-50 sm:col-span-2">No Host coupons are active for this property.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {premiumActive && (
                  <label className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${premiumActive ? "border-amber-300/15 bg-amber-300/10" : ""}`}>
                    <span>
                      <span className="block text-xs font-black">🛡️ Premium booking protection</span>
                      <span className="mt-0.5 block text-[10px] opacity-45">Add protection metadata to this booking.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.bookingInsurance}
                      onChange={(event) => updateForm("bookingInsurance", event.target.checked)}
                      className="h-5 w-5 accent-amber-400"
                    />
                  </label>
                )}

                {quote && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-[24px] border p-4 ${
                      premiumActive
                        ? "border-amber-300/20 bg-[#080d17]/80"
                        : "border-rose-200 bg-[#fff8f8]/75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-45">Stay total</p>
                        <p className="mt-1 text-sm font-black">{quote.unitCount} × {quote.bookingUnit} at {money(quote.basePrice)}</p>
                      </div>
                      {quote.unitSavingsPercent > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[9px] font-black text-emerald-400">SAVE {quote.unitSavingsPercent}%</span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="opacity-55">Base stay</span><strong>{money(quote.subtotal)}</strong></div>
                      {quote.extraGuestCharge > 0 && <div className="flex justify-between"><span className="opacity-55">Extra guest</span><strong>{money(quote.extraGuestCharge)}</strong></div>}
                      {quote.cleaningFee > 0 && <div className="flex justify-between"><span className="opacity-55">Cleaning</span><strong>{money(quote.cleaningFee)}</strong></div>}
                      {quote.serviceFee > 0 && <div className="flex justify-between"><span className="opacity-55">Service</span><strong>{money(quote.serviceFee)}</strong></div>}
                      {quote.discountAmount > 0 && <div className="flex justify-between text-emerald-400"><span>Coupon saving</span><strong>− {money(quote.discountAmount)}</strong></div>}
                      {quote.premiumDiscountAmount > 0 && <div className="flex justify-between text-amber-300"><span>Premium saving</span><strong>− {money(quote.premiumDiscountAmount)}</strong></div>}
                    </div>

                    <div className="mt-4 flex items-end justify-between border-t border-current/10 pt-4">
                      <span>
                        <span className="block text-[9px] font-black uppercase tracking-wider opacity-45">Payable now</span>
                        <strong className="mt-1 block text-2xl">{money(quote.totalAmount)}</strong>
                      </span>
                      {quote.expectedPoints > 0 && <span className="text-right text-[10px] font-bold text-emerald-400">+{quote.expectedPoints} reward points</span>}
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-[.85fr_1.4fr] gap-2">
                  <button
                    type="button"
                    onClick={() => calculate()}
                    disabled={quoting || !form.checkIn}
                    className={`rounded-2xl border px-4 py-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 ${
                      premiumActive
                        ? "border-amber-300/25 bg-[#182033] text-amber-100 hover:bg-[#202b43]"
                        : "border-rose-200 bg-rose-100/65 text-slate-700 hover:bg-rose-200/70"
                    }`}
                  >
                    {quoting ? "Checking..." : "Check price"}
                  </button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmBooking}
                    disabled={booking || quoting || !form.checkIn}
                    className={`rounded-2xl px-4 py-3 text-xs font-black shadow-lg disabled:cursor-not-allowed disabled:opacity-40 ${
                      premiumActive
                        ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 text-slate-950 shadow-amber-950/30"
                        : "bg-gradient-to-r from-[#ff385c] to-[#a90836] text-white shadow-rose-200"
                    }`}
                  >
                    {booking
                      ? "Creating booking..."
                      : exclusiveLocked
                        ? "Unlock Premium to book"
                        : quote
                          ? `Continue · ${money(quote.totalAmount)}`
                          : "Reserve and continue"}
                  </motion.button>
                </div>

                <p className="text-center text-[9px] font-semibold opacity-40">Payment method will be selected securely on Razorpay Checkout.</p>

                {premiumActive && (
                  <button
                    type="button"
                    onClick={enablePriceAlert}
                    disabled={priceAlertSaving}
                    className="w-full rounded-2xl border border-amber-300/15 bg-[#0f172a]/88 px-4 py-3 text-xs font-black text-amber-200"
                  >
                    {priceAlertSaving ? "Saving alert..." : priceAlertNotice || "📉 Alert me when the price drops"}
                  </button>
                )}
              </div>
            </motion.section>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {bookingConflict && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[115] grid place-items-center bg-slate-950/65 p-4 backdrop-blur" onClick={() => setBookingConflict(null)}>
            <motion.div initial={{ scale: .94, y: 14 }} animate={{ scale: 1, y: 0 }} onClick={(event) => event.stopPropagation()} className={`w-full max-w-md rounded-[30px] border p-6 shadow-2xl ${premiumActive ? "border-amber-300/25 bg-[#111827] text-white" : "border-rose-200 bg-white text-slate-900"}`}>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-2xl">📅</div>
              <h2 className="mt-4 text-xl font-black">Selected dates are unavailable</h2>
              <p className="mt-2 text-sm leading-6 opacity-65">This property is already booked for the selected dates. Please choose another date.</p>
              {bookingConflict.blockedPeriod && <p className={`mt-4 rounded-2xl p-3 text-xs font-bold ${premiumActive ? "bg-white/[.05] text-amber-100" : "bg-rose-50 text-rose-800"}`}>{formatDate(bookingConflict.blockedPeriod.checkIn, true)} → {formatDate(bookingConflict.blockedPeriod.checkOut, true)}</p>}
              <div className="mt-5 flex gap-2"><button type="button" onClick={() => setBookingConflict(null)} className="flex-1 rounded-2xl border border-current/15 px-4 py-3 text-xs font-black">Choose dates</button>{bookingConflict.suggestedCheckIn && <button type="button" onClick={() => { useSuggestedCheckIn(bookingConflict.suggestedCheckIn); setBookingConflict(null); }} className={`flex-1 rounded-2xl px-4 py-3 text-xs font-black ${premiumActive ? "bg-amber-300 text-slate-950" : "bg-rose-600 text-white"}`}>Book after this stay</button>}</div>
            </motion.div>
          </motion.div>
        )}
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/95 p-4 backdrop-blur" onClick={() => setActiveMedia(null)}>
            <button type="button" onClick={() => setActiveMedia(null)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-xl text-white">×</button>
            {activeMedia.type === "video" ? <motion.video initial={{ scale: .95 }} animate={{ scale: 1 }} src={activeMedia.url} controls autoPlay className="max-h-[90vh] max-w-[95vw] rounded-[26px]" onClick={(event) => event.stopPropagation()} /> : <motion.img initial={{ scale: .95 }} animate={{ scale: 1 }} src={activeMedia.url} alt={apartment.title} className="max-h-[90vh] max-w-[95vw] rounded-[26px] object-contain" onClick={(event) => event.stopPropagation()} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}