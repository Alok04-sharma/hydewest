import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import listingService from "../../services/listing.service";
import {
  ALL_AMENITIES,
  BED_TYPES,
  PROPERTY_STYLES,
  PROPERTY_TYPES,
  PRICING_UNITS,
  WIZARD_STEPS,
  calculateSuggestedRates,
  createDefaultListing,
  createPresetCoupons,
} from "../../constants/listingWizard";

const DRAFT_KEY = "hydewest_listing_phase1_draft";
const APPLIANCES = ["AC", "TV", "Microwave", "Washing Machine", "Dishwasher", "Refrigerator", "Water Heater", "Induction", "Other"];

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const deepMerge = (base, source) => {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") return source ?? base;
  const output = { ...base };
  Object.entries(source).forEach(([key, value]) => {
    output[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? deepMerge(base?.[key] || {}, value)
        : value;
  });
  return output;
};

const normalizeInitialData = (source = {}) => {
  const merged = deepMerge(createDefaultListing(), source);
  merged.availability = {
    ...merged.availability,
    availableFrom: toDateInput(merged.availability?.availableFrom),
    availableTo: toDateInput(merged.availability?.availableTo),
    blockedDates: (merged.availability?.blockedDates || []).map(toDateInput),
    unavailableDates: (merged.availability?.unavailableDates || []).map(toDateInput),
    specialPrices: (merged.availability?.specialPrices || []).map((item) => ({
      ...item,
      date: toDateInput(item.date),
    })),
  };
  merged.coupons = (merged.coupons || []).map((coupon) => ({
    ...coupon,
    validFrom: toDateInput(coupon.validFrom) || new Date().toISOString().slice(0, 10),
    validUntil: toDateInput(coupon.validUntil),
  }));
  merged.guestCapacity = merged.guestCapacity || {
    adults: Math.max(Number(merged.guests || 1), 1),
    children: 0,
    seniorCitizens: 0,
  };
  if (!merged.bedDetails?.length) {
    merged.bedDetails = [{ type: "Queen", count: Math.max(Number(merged.beds || 1), 1), capacityPerBed: 2 }];
  }
  return merged;
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

function Label({ children, optional = false }) {
  return (
    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[.13em] text-slate-500">
      {children} {optional && <span className="normal-case tracking-normal text-slate-400">(optional)</span>}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 ${className}`}
    >
      {children}
    </select>
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 ${className}`}
    />
  );
}

function Panel({ title, description, children, premium = false, className = "" }) {
  return (
    <section
      className={`rounded-[28px] border p-5 shadow-sm sm:p-6 ${
        premium
          ? "border-amber-300/20 bg-[linear-gradient(145deg,rgba(20,27,45,.97),rgba(11,16,32,.96))] text-white shadow-[0_22px_65px_rgba(0,0,0,.30)]"
          : "border-slate-200 bg-white/90 text-slate-900"
      } ${className}`}
    >
      <h2 className="text-xl font-black">{title}</h2>
      {description && <p className={`mt-1 text-sm leading-6 ${premium ? "text-white/50" : "text-slate-500"}`}>{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Counter({ label, helper, value, min = 0, max = 50, onChange, premium = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${premium ? "border-white/10 bg-white/[.04]" : "border-slate-200 bg-slate-50"}`}>
      <div><p className="font-black">{label}</p>{helper && <p className={`mt-1 text-xs ${premium ? "text-white/45" : "text-slate-500"}`}>{helper}</p>}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(Number(value || 0) - 1, min))} className={`grid h-9 w-9 place-items-center rounded-xl font-black ${premium ? "bg-white/10 text-white" : "bg-white text-slate-700 shadow-sm"}`}>−</button>
        <span className="w-9 text-center text-lg font-black">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(Number(value || 0) + 1, max))} className={`grid h-9 w-9 place-items-center rounded-xl font-black ${premium ? "bg-amber-300 text-slate-950" : "bg-slate-950 text-white"}`}>+</button>
      </div>
    </div>
  );
}

function StepIntro({ step }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-rose-600">Step {step + 1} of {WIZARD_STEPS.length}</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{WIZARD_STEPS[step][0]}</h1>
      <p className="mt-1 text-sm text-slate-500">{WIZARD_STEPS[step][1]}</p>
    </div>
  );
}

function AvailabilityCalendar({ data, onChange, premium }) {
  const [month, setMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [mode, setMode] = useState("blocked");
  const [specialPrice, setSpecialPrice] = useState(data.pricing?.basePrice || 0);

  const monthDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      cells.push({ day, iso: date.toISOString().slice(0, 10) });
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  const updateAvailability = (patch) => onChange({ ...data.availability, ...patch });

  const toggleDate = (iso) => {
    if (mode === "special") {
      const current = [...(data.availability.specialPrices || [])];
      const index = current.findIndex((item) => toDateInput(item.date) === iso);
      if (index >= 0) current.splice(index, 1);
      else current.push({ date: iso, price: Math.max(Number(specialPrice || 1), 1), note: "Manual special price" });
      updateAvailability({ specialPrices: current });
      return;
    }
    const key = mode === "unavailable" ? "unavailableDates" : "blockedDates";
    const current = new Set((data.availability[key] || []).map(toDateInput));
    if (current.has(iso)) current.delete(iso); else current.add(iso);
    updateAvailability({ [key]: [...current].sort() });
  };

  const blocked = new Set((data.availability.blockedDates || []).map(toDateInput));
  const unavailable = new Set((data.availability.unavailableDates || []).map(toDateInput));
  const specials = new Map((data.availability.specialPrices || []).map((item) => [toDateInput(item.date), item.price]));

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Available from</Label><Input type="date" value={data.availability.availableFrom} onChange={(event) => updateAvailability({ availableFrom: event.target.value })} /></div>
        <div><Label>Available to</Label><Input type="date" value={data.availability.availableTo} onChange={(event) => updateAvailability({ availableTo: event.target.value })} /></div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[["blocked", "Block date"], ["unavailable", "Unavailable"], ["special", "Special price"]].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-xl px-3 py-2 text-xs font-black ${mode === value ? premium ? "bg-amber-300 text-slate-950" : "bg-rose-600 text-white" : premium ? "bg-white/10 text-white/65" : "bg-slate-100 text-slate-600"}`}>{label}</button>
        ))}
        {mode === "special" && <Input type="number" min="1" value={specialPrice} onChange={(event) => setSpecialPrice(event.target.value)} className="max-w-[150px] py-2" placeholder="Price" />}
      </div>

      <div className={`mt-4 rounded-[24px] border p-3 ${premium ? "border-white/10 bg-black/15" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-xl px-3 py-2 font-black">‹</button>
          <p className="font-black">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-xl px-3 py-2 font-black">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase opacity-45">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-1">{monthDays.map((cell, index) => {
          if (!cell) return <span key={`empty-${index}`} className="aspect-square" />;
          const special = specials.get(cell.iso);
          const state = unavailable.has(cell.iso) ? "unavailable" : blocked.has(cell.iso) ? "blocked" : special ? "special" : "normal";
          const styles = state === "unavailable" ? "bg-slate-700 text-white" : state === "blocked" ? "bg-rose-500 text-white" : state === "special" ? "bg-amber-300 text-slate-950" : premium ? "bg-white/[.05] text-white/70 hover:bg-white/10" : "bg-white text-slate-700 hover:bg-rose-50";
          return <button type="button" key={cell.iso} title={special ? `Special price ${money(special)}` : state} onClick={() => toggleDate(cell.iso)} className={`aspect-square rounded-xl text-xs font-black transition ${styles}`}><span>{cell.day}</span>{special && <span className="block truncate px-0.5 text-[7px]">₹{special}</span>}</button>;
        })}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold opacity-65"><span>🟥 Blocked</span><span>⬛ Unavailable</span><span>🟨 Special price</span></div>
    </div>
  );
}

const validateStep = (step, data, images) => {
  switch (step) {
    case 1:
      if (!data.location.country || !data.location.state || !data.location.city || !data.location.area || !data.location.address) return "Country, state, city, area and address are required.";
      const hasLatitude = String(data.location.latitude ?? "").trim() !== "";
      const hasLongitude = String(data.location.longitude ?? "").trim() !== "";
      if (hasLatitude !== hasLongitude) return "Enter both latitude and longitude, or leave both empty and continue with the manual address.";
      if (hasLatitude && (!Number.isFinite(Number(data.location.latitude)) || !Number.isFinite(Number(data.location.longitude)))) return "Enter valid coordinates or leave both fields empty.";
      return "";
    case 2: return data.title.trim().length >= 10 ? "" : "Listing name must contain at least 10 characters.";
    case 3: return data.propertyType ? "" : "Choose a property type.";
    case 4: return Number(data.guestCapacity.adults) >= 1 ? "" : "At least one adult must be allowed.";
    case 5: return Number(data.bedrooms) >= 0 ? "" : "Choose the bedroom count.";
    case 6: return data.bedDetails.length && Number(data.maximumSleepingCapacity) >= 1 ? "" : "Add at least one bed type.";
    case 7: return Number(data.bathrooms) >= 1 ? "" : "At least one bathroom is required.";
    case 8: return data.description.trim().length >= 50 ? "" : "Description must contain at least 50 characters.";
    case 9:
      if (Number(data.pricing.rates.day) <= 0) return "Base pricing reference must be greater than zero.";
      if (Number(data.policies.minBookingDays) <= 1 && Number(data.pricing.rates.hour) <= 0) return "Hourly price is required when one-day minimum booking is allowed.";
      if (["night","week","month"].some((unit) => Number(data.pricing.rates[unit]) <= 0)) return "Nightly, weekly and monthly prices are required.";
      if (Number(data.policies.maxBookingDays) < Number(data.policies.minBookingDays)) return "Maximum booking days cannot be lower than minimum booking days.";
      return "";
    case 10: {
      const codes = data.coupons.map((coupon) => coupon.code.trim().toUpperCase()).filter(Boolean);
      return new Set(codes).size === codes.length ? "" : "Coupon codes must be unique.";
    }
    case 11: return images.length >= 3 ? "" : "Upload at least three property images.";
    case 12: return data.amenities.length ? "" : "Select at least one amenity.";
    case 13: return data.policies.checkInTime && data.policies.checkOutTime ? "" : "Check-in and check-out times are required.";
    case 14:
      if (!data.availability.availableFrom || !data.availability.availableTo) return "Availability start and end dates are required.";
      return new Date(data.availability.availableTo) > new Date(data.availability.availableFrom) ? "" : "Available-to date must be after available-from date.";
    default: return "";
  }
};

export default function ListingWizard({ mode = "create", initialData = null, listingId = "" }) {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const premiumHost = Boolean(outletContext.isPremiumHost);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const stepRailRef = useRef(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [priceSuggestionLoading, setPriceSuggestionLoading] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [amenitySearch, setAmenitySearch] = useState("");
  const [customRule, setCustomRule] = useState("");
  const [otherFacility, setOtherFacility] = useState("");
  const [applianceDraft, setApplianceDraft] = useState({ appliance: "AC", instructions: "" });

  const [data, setData] = useState(() => {
    if (initialData) return normalizeInitialData(initialData);
    if (mode === "create") {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
        if (draft) return normalizeInitialData(draft);
      } catch {
        // Ignore invalid local drafts.
      }
    }
    return createDefaultListing();
  });

  const [images, setImages] = useState(() =>
    (initialData?.images || []).map((image, index) => ({
      id: `existing-${image.publicId || index}`,
      kind: "existing",
      url: image.url,
      publicId: image.publicId,
      name: `Existing image ${index + 1}`,
    }))
  );
  const [videos, setVideos] = useState(() =>
    (initialData?.videos || []).map((video, index) => ({
      id: `existing-video-${video.publicId || index}`,
      kind: "existing",
      url: video.url,
      publicId: video.publicId,
      thumbnailUrl: video.thumbnailUrl || "",
      duration: video.duration || 0,
      name: `Existing video ${index + 1}`,
    }))
  );
  const [coverId, setCoverId] = useState(() => {
    const original = initialData?.images || [];
    const selected = original.find((image) => image.isCover) || original[0];
    return selected ? `existing-${selected.publicId || 0}` : "";
  });

  useEffect(() => {
    if (mode === "create") localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data, mode]);

  useEffect(() => {
    stepRailRef.current?.querySelector(`[data-step-index="${step}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => () => {
    images.filter((item) => item.kind === "new").forEach((item) => URL.revokeObjectURL(item.url));
    videos.filter((item) => item.kind === "new").forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const updateRoot = (field, value) => setData((current) => ({ ...current, [field]: value }));
  const updateNested = (section, field, value) => setData((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  const totalGuests = Number(data.guestCapacity.adults || 0) + Number(data.guestCapacity.children || 0) + Number(data.guestCapacity.seniorCitizens || 0);

  useEffect(() => {
    setData((current) => ({ ...current, guests: Math.max(totalGuests, 1), pricing: { ...current.pricing, baseGuestCount: Math.min(Number(current.pricing.baseGuestCount || 1), Math.max(totalGuests, 1)) } }));
  }, [totalGuests]);

  const updateDailyPrice = (value) => {
    const day = Number(value || 0);
    const rates = calculateSuggestedRates(day, {});
    if (Number(data.policies.minBookingDays) > 1) rates.hour = 0;
    setData((current) => ({
      ...current,
      pricing: {
        ...current.pricing,
        basePrice: rates.night,
        pricePerNight: rates.night,
        priceUnit: "night",
        rates,
        autoRateMultipliers: true,
      },
    }));
  };

  const updateMinimumStay = (value) => {
    const minimum = Math.max(Number(value || 1), 1);
    setData((current) => {
      const rates = { ...current.pricing.rates };
      if (minimum > 1) rates.hour = 0;
      else if (Number(rates.hour) <= 0) rates.hour = calculateSuggestedRates(current.pricing.rates.day).hour;
      return { ...current, policies: { ...current.policies, minBookingDays: minimum, maxBookingDays: Math.max(Number(current.policies.maxBookingDays || minimum), minimum) }, pricing: { ...current.pricing, rates, autoRateMultipliers: minimum > 1 ? current.pricing.autoRateMultipliers : current.pricing.autoRateMultipliers } };
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError("Browser Geolocation is not supported. Enter the address and coordinates manually.");
    setLocationLoading(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateNested("location", "latitude", Number(position.coords.latitude.toFixed(7)));
        updateNested("location", "longitude", Number(position.coords.longitude.toFixed(7)));
        setLocationLoading(false);
        toast.success("Current coordinates added. Complete the postal address next.");
      },
      () => { setLocationLoading(false); setError("Location permission was not granted. Continue with manual address and coordinates."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  const generateNames = async () => {
    const location = [data.location.area, data.location.city, data.location.state].filter(Boolean).join(", ");
    if (!location) return setError("Complete the manual address before generating names.");
    try {
      setAiLoading(true); setError("");
      const response = await listingService.generateNameSuggestions({ location, propertyType: data.propertyType, propertyStyle: data.propertyStyle });
      setNameSuggestions(response.data?.suggestions || response.suggestions || []);
    } catch (requestError) { setError(requestError.response?.data?.message || "Name suggestions could not be generated."); }
    finally { setAiLoading(false); }
  };

  const improveDescription = async () => {
    try {
      setAiLoading(true); setError("");
      const response = await listingService.improveDescription({ description: data.description, location: [data.location.area, data.location.city].filter(Boolean).join(", "), propertyType: data.propertyType, amenities: data.amenities });
      updateRoot("description", response.data?.description || response.description || data.description);
      toast.success("Description improved. You can continue editing it.");
    } catch (requestError) { setError(requestError.response?.data?.message || "Description could not be improved."); }
    finally { setAiLoading(false); }
  };

  const requestPriceSuggestion = async () => {
    try {
      setPriceSuggestionLoading(true);
      setError("");
      const response = await listingService.generatePriceSuggestion({
        ...(mode === "edit" && listingId ? { listingId } : {}),
        basePrice: Number(data.pricing.rates.day || 0),
        location: data.location,
      });
      setPriceSuggestion(response.data || response);
      toast.success(mode === "edit" ? "AI suggestion created and added to your notifications." : "AI suggestion generated. You remain in control.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "AI price suggestion could not be generated.");
    } finally {
      setPriceSuggestionLoading(false);
    }
  };

  const resolvePriceSuggestion = async (decision) => {
    if (!priceSuggestion) return;
    try {
      setPriceSuggestionLoading(true);
      if (priceSuggestion.persisted && listingId && priceSuggestion._id) {
        await listingService.resolvePriceSuggestion(listingId, priceSuggestion._id, decision);
      }
      if (decision === "accept") {
        updateDailyPrice(priceSuggestion.suggestedPrice);
        toast.success("Suggested reference price applied. You can still edit every rate.");
      } else {
        toast.success("Suggestion rejected. Current pricing was kept.");
      }
      setPriceSuggestion(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "AI price suggestion could not be updated.");
    } finally {
      setPriceSuggestionLoading(false);
    }
  };

  const addBed = () => updateRoot("bedDetails", [...data.bedDetails, { type: "Single", count: 1, capacityPerBed: 1 }]);
  const updateBed = (index, patch) => {
    setData((current) => ({
      ...current,
      bedDetails: current.bedDetails.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };
  const removeBed = (index) => updateRoot("bedDetails", data.bedDetails.filter((_, itemIndex) => itemIndex !== index));

  useEffect(() => {
    const beds = data.bedDetails.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const capacity = data.bedDetails.reduce((sum, item) => sum + Number(item.count || 0) * Number(item.capacityPerBed || 1), 0);
    setData((current) => current.beds === beds && current.maximumSleepingCapacity === capacity ? current : { ...current, beds: Math.max(beds, 1), maximumSleepingCapacity: Math.max(capacity, 1) });
  }, [data.bedDetails]);

  useEffect(() => {
    const bathroomTotal = Number(data.bathroomDetails.western || 0) + Number(data.bathroomDetails.indian || 0);
    if (bathroomTotal > 0 && bathroomTotal !== data.bathrooms) setData((current) => ({ ...current, bathrooms: bathroomTotal }));
  }, [data.bathroomDetails.western, data.bathroomDetails.indian]);

  const addFiles = (files, type) => {
    const accepted = [...files];
    if (type === "image") {
      const slots = Math.max(10 - images.length, 0);
      const next = accepted.slice(0, slots).map((file) => ({ id: `new-image-${crypto.randomUUID()}`, kind: "new", file, url: URL.createObjectURL(file), name: file.name }));
      setImages((current) => [...current, ...next]);
      if (!coverId && next[0]) setCoverId(next[0].id);
    } else {
      const slots = Math.max(5 - videos.length, 0);
      const next = accepted.slice(0, slots).map((file) => ({ id: `new-video-${crypto.randomUUID()}`, kind: "new", file, url: URL.createObjectURL(file), name: file.name }));
      setVideos((current) => [...current, ...next]);
    }
  };

  const removeMedia = (item, type) => {
    if (item.kind === "new") URL.revokeObjectURL(item.url);
    if (type === "image") {
      const next = images.filter((media) => media.id !== item.id);
      setImages(next);
      if (coverId === item.id) setCoverId(next[0]?.id || "");
    } else setVideos(videos.filter((media) => media.id !== item.id));
  };

  const addCoupon = () => updateRoot("coupons", [...data.coupons, { code: "", label: "Custom Offer", description: "", discountType: "percentage", discountValue: 10, minBookingAmount: 0, maxDiscount: 0, usageLimit: 0, usedCount: 0, premiumOnly: false, paymentMethod: "any", source: "custom", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" }]);
  const updateCoupon = (index, field, value) => updateRoot("coupons", data.coupons.map((coupon, couponIndex) => couponIndex === index ? { ...coupon, [field]: value } : coupon));

  const addAppliance = () => {
    if (!applianceDraft.appliance || applianceDraft.instructions.trim().length < 5) return setError("Add an appliance and clear instructions.");
    updateRoot("applianceGuide", [...data.applianceGuide, { ...applianceDraft, instructions: applianceDraft.instructions.trim() }]);
    setApplianceDraft({ appliance: "AC", instructions: "" }); setError("");
  };

  const addOtherFacility = () => {
    const value = otherFacility.trim(); if (!value) return;
    updateNested("nearbyInformation", "otherFacilities", [...data.nearbyInformation.otherFacilities, value]); setOtherFacility("");
  };

  const goTo = (next) => { setDirection(next > step ? 1 : -1); setStep(next); setError(""); };
  const nextStep = () => { const issue = validateStep(step, data, images); if (issue) return setError(issue); goTo(Math.min(step + 1, WIZARD_STEPS.length - 1)); };

  const buildPayload = () => {
    const payload = new FormData();
    const fields = ["title","description","propertyType","propertyStyle","guests","guestCapacity","bedrooms","beds","bedDetails","maximumSleepingCapacity","bathrooms","bathroomDetails","location","nearbyInformation","applianceGuide","pricing","coupons","amenities","houseRules","availability","policies","timezone"];
    fields.forEach((field) => payload.append(field, typeof data[field] === "object" ? JSON.stringify(data[field]) : String(data[field])));
    const existingImages = images.filter((item) => item.kind === "existing").map((item) => ({ clientKey: item.id, url: item.url, publicId: item.publicId }));
    const newImages = images.filter((item) => item.kind === "new");
    payload.append("existingImages", JSON.stringify(existingImages));
    payload.append("newImageKeys", JSON.stringify(newImages.map((item) => item.id)));
    payload.append("imageOrder", JSON.stringify(images.map((item) => item.id)));
    payload.append("coverImageKey", coverId || images[0]?.id || "");
    newImages.forEach((item) => payload.append("images", item.file));
    const existingVideos = videos.filter((item) => item.kind === "existing").map((item) => ({ clientKey: item.id, url: item.url, publicId: item.publicId, thumbnailUrl: item.thumbnailUrl, duration: item.duration }));
    const newVideos = videos.filter((item) => item.kind === "new");
    payload.append("existingVideos", JSON.stringify(existingVideos));
    payload.append("newVideoKeys", JSON.stringify(newVideos.map((item) => item.id)));
    payload.append("videoOrder", JSON.stringify(videos.map((item) => item.id)));
    newVideos.forEach((item) => payload.append("videos", item.file));
    return payload;
  };

  const submit = async () => {
    for (let index = 0; index < WIZARD_STEPS.length; index += 1) {
      const issue = validateStep(index, data, images);
      if (issue) { goTo(index); setError(issue); return; }
    }
    try {
      setSubmitting(true); setError("");
      const response = mode === "edit" ? await listingService.update(listingId, buildPayload()) : await listingService.create(buildPayload());
      if (!response.success) throw new Error(response.message || "Property could not be saved.");
      localStorage.removeItem(DRAFT_KEY);
      toast.success(response.message || "Property submitted for review.");
      navigate("/host/listings", { replace: true });
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || "Property could not be saved."); }
    finally { setSubmitting(false); }
  };

  const filteredAmenities = ALL_AMENITIES.filter((item) => item.toLowerCase().includes(amenitySearch.toLowerCase()));

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Panel premium={premiumHost} title="Use Browser Geolocation" description="We only capture latitude and longitude. No Google Maps or geocoding API is used."><div className={`rounded-[24px] border p-5 text-center ${premiumHost ? "border-white/10 bg-white/[.04]" : "border-rose-200 bg-rose-50"}`}><span className="text-5xl">📍</span><h3 className="mt-3 text-xl font-black">Add current coordinates</h3><p className={`mx-auto mt-2 max-w-lg text-sm leading-6 ${premiumHost ? "text-white/50" : "text-slate-600"}`}>Allow location access for accurate coordinates, or continue and enter them manually with the postal address.</p><button type="button" onClick={useCurrentLocation} disabled={locationLoading} className={`mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${premiumHost ? "bg-amber-300 text-slate-950" : "bg-slate-950 text-white"}`}><FiMapPin /> {locationLoading ? "Reading location..." : "Use My Current Location"}</button>{data.location.latitude && data.location.longitude && <p className={`mt-4 text-xs font-black ${premiumHost ? "text-emerald-300" : "text-emerald-700"}`}>✓ {data.location.latitude}, {data.location.longitude}</p>}</div></Panel>;
      case 1:
        return <div className="space-y-5"><Panel premium={premiumHost} title="Manual address" description="Required even when Browser Geolocation is used."><div className="grid gap-4 sm:grid-cols-2"><div><Label>Country</Label><Input value={data.location.country} onChange={(e)=>updateNested("location","country",e.target.value)}/></div><div><Label>State</Label><Input value={data.location.state} onChange={(e)=>updateNested("location","state",e.target.value)}/></div><div><Label>City</Label><Input value={data.location.city} onChange={(e)=>updateNested("location","city",e.target.value)}/></div><div><Label>Area</Label><Input value={data.location.area} onChange={(e)=>updateNested("location","area",e.target.value)}/></div><div className="sm:col-span-2"><Label>Full address</Label><Textarea rows={3} value={data.location.address} onChange={(e)=>updateNested("location","address",e.target.value)}/></div><div><Label>PIN code</Label><Input value={data.location.zipCode} onChange={(e)=>updateNested("location","zipCode",e.target.value)}/></div><div><Label>Landmark</Label><Input value={data.location.landmark} onChange={(e)=>updateNested("location","landmark",e.target.value)}/></div><div><Label optional>Latitude</Label><Input type="number" step="any" value={data.location.latitude} onChange={(e)=>updateNested("location","latitude",e.target.value)}/></div><div><Label optional>Longitude</Label><Input type="number" step="any" value={data.location.longitude} onChange={(e)=>updateNested("location","longitude",e.target.value)}/></div></div></Panel><Panel premium={premiumHost} title="Nearby information" description="Host-provided guidance; enter distance or travel time as text."><div className="grid gap-4 sm:grid-cols-2">{[["nearestAirport","Nearest airport"],["railwayStation","Railway station"],["busStand","Bus stand"],["metro","Metro"],["nearbyMarket","Nearby market"],["groceryStore","Grocery store"],["hospital","Hospital"],["medicalStore","Medical store"],["parking","Parking"],["internet","Internet"],["powerBackup","Power backup"]].map(([key,label])=><div key={key}><Label optional>{label}</Label><Input placeholder="e.g. 15 minutes away" value={data.nearbyInformation[key]} onChange={(e)=>updateNested("nearbyInformation",key,e.target.value)}/></div>)}</div><div className="mt-4 flex gap-2"><Input value={otherFacility} onChange={(e)=>setOtherFacility(e.target.value)} placeholder="Other nearby facility"/><button type="button" onClick={addOtherFacility} className="rounded-2xl bg-slate-950 px-4 text-white"><FiPlus/></button></div><div className="mt-3 flex flex-wrap gap-2">{data.nearbyInformation.otherFacilities.map((item)=><button key={item} type="button" onClick={()=>updateNested("nearbyInformation","otherFacilities",data.nearbyInformation.otherFacilities.filter((value)=>value!==item))} className={`rounded-full px-3 py-1.5 text-xs font-bold ${premiumHost?"bg-white/10 text-white":"bg-rose-50 text-rose-700"}`}>{item} ×</button>)}</div></Panel></div>;
      case 2:
        return <Panel premium={premiumHost} title="Premium property name" description="Write your own title or ask OpenRouter for truthful suggestions."><div className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><Label>Listing name</Label><Input value={data.title} maxLength={100} onChange={(e)=>updateRoot("title",e.target.value)} placeholder="e.g. The Amber Courtyard, Jaipur"/></div><div><Label>Property style</Label><Select value={data.propertyStyle} onChange={(e)=>updateRoot("propertyStyle",e.target.value)}>{PROPERTY_STYLES.map((style)=><option key={style}>{style}</option>)}</Select></div></div><button type="button" onClick={generateNames} disabled={aiLoading} className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${premiumHost?"bg-amber-300 text-slate-950":"bg-violet-700 text-white"}`}><span>✨</span>{aiLoading?"Generating...":"Generate name suggestions"}</button>{nameSuggestions.length>0&&<div className="mt-4 grid gap-2 sm:grid-cols-2">{nameSuggestions.map((name)=><button type="button" key={name} onClick={()=>updateRoot("title",name)} className={`rounded-2xl border p-3 text-left text-sm font-black ${premiumHost?"border-white/10 bg-white/[.04] hover:border-amber-300/40":"border-violet-200 bg-violet-50 hover:border-violet-400"}`}>{name}</button>)}</div>}</Panel>;
      case 3:
        return <Panel premium={premiumHost} title="Property type" description="Use the compact grid or dropdown—both update the same field."><div className="max-w-md"><Label>Property type</Label><Select value={data.propertyType} onChange={(e)=>updateRoot("propertyType",e.target.value)}>{PROPERTY_TYPES.map(([type])=><option key={type} value={type}>{type}</option>)}</Select></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{PROPERTY_TYPES.map(([type,icon])=><button type="button" key={type} onClick={()=>updateRoot("propertyType",type)} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-xs font-black ${data.propertyType===type?premiumHost?"border-amber-300 bg-amber-300/15 text-amber-200":"border-rose-500 bg-rose-50 text-rose-700":premiumHost?"border-white/10 bg-white/[.03] text-white/65":"border-slate-200 bg-slate-50 text-slate-600"}`}><span className="text-lg">{icon}</span>{type}</button>)}</div></Panel>;
      case 4:
        return <Panel premium={premiumHost} title="Guest capacity" description="Use selectors for each guest category."><div className="space-y-3"><Counter premium={premiumHost} label="Adults" helper="Age 18 and above" min={1} value={data.guestCapacity.adults} onChange={(value)=>updateNested("guestCapacity","adults",value)}/><Counter premium={premiumHost} label="Children" helper="Age 2–17" value={data.guestCapacity.children} onChange={(value)=>updateNested("guestCapacity","children",value)}/><Counter premium={premiumHost} label="Senior Citizens" helper="Senior travellers" value={data.guestCapacity.seniorCitizens} onChange={(value)=>updateNested("guestCapacity","seniorCitizens",value)}/></div><p className={`mt-4 rounded-2xl p-4 text-sm font-black ${premiumHost?"bg-amber-300/10 text-amber-200":"bg-rose-50 text-rose-700"}`}>Maximum guests: {Math.max(totalGuests,1)}</p></Panel>;
      case 5:
        return <Panel premium={premiumHost} title="Bedrooms" description="Select the total private and shared sleeping rooms."><div className="max-w-sm"><Label>Bedroom count</Label><Select value={data.bedrooms} onChange={(e)=>updateRoot("bedrooms",Number(e.target.value))}>{Array.from({length:21},(_,index)=><option key={index} value={index}>{index===0?"Studio / no separate bedroom":`${index} bedroom${index===1?"":"s"}`}</option>)}</Select></div></Panel>;
      case 6:
        return <Panel premium={premiumHost} title="Bed details" description="Add bed types and let maximum capacity calculate automatically."><div className="space-y-3">{data.bedDetails.map((bed,index)=><div key={`${bed.type}-${index}`} className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1.2fr_.7fr_.8fr_auto] ${premiumHost?"border-white/10 bg-white/[.04]":"border-slate-200 bg-slate-50"}`}><div><Label>Bed type</Label><Select value={bed.type} onChange={(e)=>{const type=e.target.value;const capacity=BED_TYPES.find(([item])=>item===type)?.[1]||1;updateBed(index,{ type, capacityPerBed: capacity })}}>{BED_TYPES.map(([type])=><option key={type} value={type}>{type}</option>)}</Select></div><div><Label>Count</Label><Select value={bed.count} onChange={(e)=>updateBed(index,{ count: Number(e.target.value) })}>{Array.from({length:20},(_,i)=><option key={i+1}>{i+1}</option>)}</Select></div><div><Label>Capacity / bed</Label><Select value={bed.capacityPerBed} onChange={(e)=>updateBed(index,{ capacityPerBed: Number(e.target.value) })}>{[1,2,3,4].map((value)=><option key={value}>{value}</option>)}</Select></div><button type="button" onClick={()=>removeBed(index)} className="mt-6 grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600"><FiTrash2/></button></div>)}</div><button type="button" onClick={addBed} className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${premiumHost?"bg-white/10 text-white":"bg-slate-950 text-white"}`}><FiPlus/>Add bed type</button><div className={`mt-4 grid gap-3 rounded-2xl p-4 sm:grid-cols-2 ${premiumHost?"bg-amber-300/10":"bg-rose-50"}`}><p><span className="block text-[10px] font-black uppercase opacity-50">Total beds</span><strong className="text-2xl">{data.beds}</strong></p><p><span className="block text-[10px] font-black uppercase opacity-50">Maximum sleeping capacity</span><strong className="text-2xl">{data.maximumSleepingCapacity}</strong></p></div></Panel>;
      case 7:
        return <Panel premium={premiumHost} title="Bathroom details" description="Describe types, facilities and accessibility."><div className="grid gap-4 sm:grid-cols-2">{[["western","Western toilets"],["indian","Indian toilets"],["shower","Showers"],["bathtub","Bathtubs"]].map(([key,label])=><div key={key}><Label>{label}</Label><Select value={data.bathroomDetails[key]} onChange={(e)=>updateNested("bathroomDetails",key,Number(e.target.value))}>{Array.from({length:11},(_,i)=><option key={i}>{i}</option>)}</Select></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["hotWater","Hot water"],["accessible","Accessible bathroom"],["sunflowerFriendly","Sunflower-friendly support"]].map(([key,label])=><label key={key} className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-black ${premiumHost?"border-white/10 bg-white/[.04]":"border-slate-200 bg-slate-50"}`}><input type="checkbox" checked={Boolean(data.bathroomDetails[key])} onChange={(e)=>updateNested("bathroomDetails",key,e.target.checked)} className="h-5 w-5 accent-rose-600"/>{label}</label>)}</div><div className="mt-4"><Label optional>Notes</Label><Textarea rows={3} value={data.bathroomDetails.notes} onChange={(e)=>updateNested("bathroomDetails","notes",e.target.value)} placeholder="Hand rails, shower chair, step-free access..."/></div></Panel>;
      case 8:
        return <Panel premium={premiumHost} title="Property description" description="Manual editing always remains available after AI improvement."><Textarea rows={10} maxLength={3000} value={data.description} onChange={(e)=>updateRoot("description",e.target.value)} placeholder="Describe the rooms, atmosphere, view, access and what guests can expect..."/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold opacity-50">{data.description.length} / 3000 characters</span><button type="button" onClick={improveDescription} disabled={aiLoading||data.description.trim().length<30} className={`rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-40 ${premiumHost?"bg-amber-300 text-slate-950":"bg-violet-700 text-white"}`}>✨ {aiLoading?"Improving...":"Improve with OpenRouter"}</button></div></Panel>;
      case 9:
        return (
          <div className="space-y-5">
            <Panel
              premium={premiumHost}
              title="Base pricing reference"
              description="This internal reference generates the guest-facing Hour, Night, Week and Month rates. AI only suggests; the Host always decides."
            >
              <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
                <div className={`rounded-[24px] p-5 ${premiumHost ? "bg-amber-300 text-slate-950" : "bg-gradient-to-br from-rose-600 to-rose-800 text-white"}`}>
                  <Label>Reference amount</Label>
                  <Input type="number" min="1" value={data.pricing.rates.day} onChange={(event) => updateDailyPrice(event.target.value)} className="mt-2 border-white/30 bg-white/90 text-2xl font-black text-slate-950" />
                  <p className="mt-3 text-xs font-bold opacity-70">Use this base reference to generate discounted Hour, Night, Week and Month rates. You can still edit every guest-facing rate.</p>
                  <button type="button" onClick={requestPriceSuggestion} disabled={priceSuggestionLoading || Number(data.pricing.rates.day || 0) <= 0 || !data.location.city} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-45 ${premiumHost ? "bg-slate-950 text-amber-200" : "bg-white text-rose-700"}`}>
                    🤖 {priceSuggestionLoading ? "Checking holiday and weather..." : "Get AI Price Suggestion"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRICING_UNITS.map(([unit, label, helper, icon]) => (
                    <div key={unit} className={`rounded-2xl border p-4 ${unit === "hour" && Number(data.policies.minBookingDays) > 1 ? "opacity-50" : premiumHost ? "border-white/10 bg-white/[.04]" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-center justify-between"><span className="text-xl">{icon}</span><span className="text-[9px] font-black uppercase opacity-45">{helper}</span></div>
                      <Label>{label}</Label>
                      <Input type="number" min={unit === "hour" ? 0 : 1} disabled={unit === "hour" && Number(data.policies.minBookingDays) > 1} value={data.pricing.rates[unit]} onChange={(event) => setData((current) => ({ ...current, pricing: { ...current.pricing, autoRateMultipliers: false, rates: { ...current.pricing.rates, [unit]: Number(event.target.value || 0) }, ...(unit === "night" ? { pricePerNight: Number(event.target.value || 0) } : {}) } }))} />
                      {unit === "hour" && Number(data.policies.minBookingDays) > 1 && <p className="mt-2 text-[10px] font-black text-amber-500">Disabled because minimum booking is more than one day.</p>}
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {priceSuggestion && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`mt-5 rounded-[24px] border p-5 ${premiumHost ? "border-cyan-300/25 bg-cyan-300/10" : "border-violet-200 bg-violet-50"}`}>
                    <p className={`text-[10px] font-black uppercase tracking-[.2em] ${premiumHost ? "text-cyan-200" : "text-violet-700"}`}>🤖 AI Price Suggestion</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-bold opacity-55">Current reference</p><strong className="mt-1 block text-2xl">{money(priceSuggestion.currentPrice || data.pricing.rates.day)}</strong></div><div><p className="text-xs font-bold opacity-55">Suggested reference</p><strong className={`mt-1 block text-2xl ${premiumHost ? "text-cyan-200" : "text-violet-800"}`}>{money(priceSuggestion.suggestedPrice)}</strong></div></div>
                    <p className="mt-4 text-sm font-semibold leading-6 opacity-75">{priceSuggestion.reason}</p>
                    <p className="mt-2 text-[10px] font-bold opacity-45">Inputs used: current price, upcoming public holidays and available OpenWeather forecast. No price changes happen automatically.</p>
                    <div className="mt-4 flex gap-3"><button type="button" onClick={() => resolvePriceSuggestion("accept")} disabled={priceSuggestionLoading} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">Accept</button><button type="button" onClick={() => resolvePriceSuggestion("reject")} disabled={priceSuggestionLoading} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black ${premiumHost ? "bg-white/10 text-white" : "bg-slate-200 text-slate-700"}`}>Reject</button></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>

            <Panel premium={premiumHost} title="Booking and fee rules">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><Label>Minimum booking days</Label><Input type="number" min="1" value={data.policies.minBookingDays} onChange={(event) => updateMinimumStay(event.target.value)} /></div>
                <div><Label>Maximum booking days</Label><Input type="number" min={data.policies.minBookingDays} value={data.policies.maxBookingDays} onChange={(event) => updateNested("policies", "maxBookingDays", Number(event.target.value || 1))} /></div>
                <div><Label>Guests included</Label><Input type="number" min="1" max={data.guests} value={data.pricing.baseGuestCount} onChange={(event) => updateNested("pricing", "baseGuestCount", Number(event.target.value || 1))} /></div>
                <div><Label>Cleaning fee</Label><Input type="number" min="0" value={data.pricing.cleaningFee} onChange={(event) => updateNested("pricing", "cleaningFee", Number(event.target.value || 0))} /></div>
                <div><Label>Service fee</Label><Input type="number" min="0" value={data.pricing.serviceFee} onChange={(event) => updateNested("pricing", "serviceFee", Number(event.target.value || 0))} /></div>
                <div><Label>Extra guest fee</Label><Input type="number" min="0" value={data.pricing.extraGuestFee} onChange={(event) => updateNested("pricing", "extraGuestFee", Number(event.target.value || 0))} /></div>
              </div>
            </Panel>
          </div>
        );
      case 10:
        return <Panel premium={premiumHost} title="Guest coupons" description="Compact cards include recommended and custom offers."><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>updateRoot("coupons",createPresetCoupons())} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black ${premiumHost?"bg-white/10":"bg-slate-100"}`}><FiRefreshCw/>Restore recommended</button><button type="button" onClick={addCoupon} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black ${premiumHost?"bg-amber-300 text-slate-950":"bg-slate-950 text-white"}`}><FiPlus/>Custom coupon</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{data.coupons.map((coupon,index)=><article key={`${coupon.code}-${index}`} className={`rounded-[22px] border p-4 ${premiumHost?"border-white/10 bg-white/[.04]":"border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><Input value={coupon.code} onChange={(e)=>updateCoupon(index,"code",e.target.value.toUpperCase())} placeholder="CODE" className="py-2 font-black"/><Input value={coupon.label} onChange={(e)=>updateCoupon(index,"label",e.target.value)} placeholder="Offer title" className="mt-2 py-2"/></div><button type="button" onClick={()=>updateRoot("coupons",data.coupons.filter((_,itemIndex)=>itemIndex!==index))} className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600"><FiTrash2/></button></div><div className="mt-3 grid grid-cols-2 gap-2"><Select value={coupon.discountType} onChange={(e)=>updateCoupon(index,"discountType",e.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></Select><Input type="number" min="1" value={coupon.discountValue} onChange={(e)=>updateCoupon(index,"discountValue",Number(e.target.value||0))}/><Input type="number" min="0" value={coupon.minBookingAmount} onChange={(e)=>updateCoupon(index,"minBookingAmount",Number(e.target.value||0))} placeholder="Min amount"/><Select value={coupon.paymentMethod||"any"} onChange={(e)=>updateCoupon(index,"paymentMethod",e.target.value)}><option value="any">Any payment</option><option value="upi">UPI only</option><option value="card">Card only</option></Select></div><label className="mt-3 flex items-center gap-2 text-xs font-black"><input type="checkbox" checked={Boolean(coupon.premiumOnly)} onChange={(e)=>updateCoupon(index,"premiumOnly",e.target.checked)} className="h-4 w-4 accent-amber-500"/>Premium Guests only</label></article>)}</div></Panel>;
      case 11:
        return <div className="space-y-5"><Panel premium={premiumHost} title="Property images" description="Minimum 3, maximum 10. Select one image as the cover."><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e)=>addFiles(e.target.files,"image")}/><button type="button" onClick={()=>imageInputRef.current?.click()} className={`flex w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-8 ${premiumHost?"border-amber-300/25 bg-white/[.03]":"border-rose-300 bg-rose-50"}`}><FiUploadCloud className="text-3xl"/><span className="mt-2 font-black">Choose property images</span><span className="mt-1 text-xs opacity-50">JPG, PNG or WebP · {images.length}/10</span></button><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image)=><div key={image.id} className={`relative overflow-hidden rounded-2xl border ${coverId===image.id?"border-amber-400 ring-4 ring-amber-300/20":"border-slate-200"}`}><img src={image.url} alt={image.name} className="aspect-[4/3] w-full object-cover"/><button type="button" onClick={()=>setCoverId(image.id)} className="absolute bottom-2 left-2 rounded-full bg-slate-950/75 px-2.5 py-1 text-[9px] font-black text-white">{coverId===image.id?"Cover ✓":"Set cover"}</button><button type="button" onClick={()=>removeMedia(image,"image")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-red-600"><FiX/></button></div>)}</div></Panel><Panel premium={premiumHost} title="Property videos" description="Optional video tours. Maximum 5 videos."><input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" multiple hidden onChange={(e)=>addFiles(e.target.files,"video")}/><button type="button" onClick={()=>videoInputRef.current?.click()} className={`flex w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-7 ${premiumHost?"border-violet-300/25 bg-white/[.03]":"border-violet-300 bg-violet-50"}`}><span className="text-3xl">🎥</span><span className="mt-2 font-black">Choose video tours</span><span className="mt-1 text-xs opacity-50">MP4, WebM or MOV · {videos.length}/5</span></button><div className="mt-4 grid gap-3 sm:grid-cols-2">{videos.map((video)=><div key={video.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"><video src={video.url} controls className="aspect-video w-full object-cover"/><button type="button" onClick={()=>removeMedia(video,"video")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-white/90 text-red-600"><FiX/></button></div>)}</div></Panel></div>;
      case 12:
        return <Panel premium={premiumHost} title="Amenities" description="Search and choose compact amenities manually—no Vision AI."><div className="relative"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40"/><Input value={amenitySearch} onChange={(e)=>setAmenitySearch(e.target.value)} placeholder="Search amenities..." className="pl-11"/></div><div className="mt-4 flex flex-wrap gap-2">{data.amenities.map((item)=><button type="button" key={item} onClick={()=>updateRoot("amenities",data.amenities.filter((value)=>value!==item))} className={`rounded-full px-3 py-2 text-xs font-black ${premiumHost?"bg-amber-300 text-slate-950":"bg-rose-600 text-white"}`}>{item} ×</button>)}</div><div className="mt-4 max-h-[330px] overflow-y-auto rounded-[24px] border border-current/10 p-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{filteredAmenities.map((item)=>{const selected=data.amenities.includes(item);return <button type="button" key={item} onClick={()=>updateRoot("amenities",selected?data.amenities.filter((value)=>value!==item):[...data.amenities,item])} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-black ${selected?premiumHost?"border-amber-300 bg-amber-300/15 text-amber-200":"border-rose-500 bg-rose-50 text-rose-700":premiumHost?"border-white/10 bg-white/[.03] text-white/60":"border-slate-200 bg-white text-slate-600"}`}>{item}{selected&&<FiCheck/>}</button>})}</div></div></Panel>;
      case 13:
        return <div className="space-y-5"><Panel premium={premiumHost} title="Host rules and timings"><div className="grid gap-4 sm:grid-cols-3"><div><Label>Check-in time</Label><Input type="time" value={data.policies.checkInTime} onChange={(e)=>updateNested("policies","checkInTime",e.target.value)}/></div><div><Label>Check-out time</Label><Input type="time" value={data.policies.checkOutTime} onChange={(e)=>updateNested("policies","checkOutTime",e.target.value)}/></div><div><Label>Cancellation policy</Label><Select value={data.policies.cancellationPolicy} onChange={(e)=>updateNested("policies","cancellationPolicy",e.target.value)}><option value="flexible">Flexible</option><option value="moderate">Moderate</option><option value="strict">Strict</option></Select></div></div><div className="mt-4 flex gap-2"><Input value={customRule} onChange={(e)=>setCustomRule(e.target.value)} placeholder="Add a Host rule"/><button type="button" onClick={()=>{const value=customRule.trim();if(value){updateRoot("houseRules",[...data.houseRules,value]);setCustomRule("")}}} className={`rounded-2xl px-4 ${premiumHost?"bg-amber-300 text-slate-950":"bg-slate-950 text-white"}`}><FiPlus/></button></div><div className="mt-3 space-y-2">{data.houseRules.map((rule,index)=><div key={`${rule}-${index}`} className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-sm font-semibold ${premiumHost?"border-white/10 bg-white/[.04]":"border-slate-200 bg-slate-50"}`}><span>{rule}</span><button type="button" onClick={()=>updateRoot("houseRules",data.houseRules.filter((_,itemIndex)=>itemIndex!==index))} className="text-red-500"><FiTrash2/></button></div>)}</div></Panel><Panel premium={premiumHost} title="Appliance guide" description="These instructions appear on a dedicated Guest page."><div className="grid gap-3 sm:grid-cols-[.45fr_1fr_auto]"><Select value={applianceDraft.appliance} onChange={(e)=>setApplianceDraft((current)=>({...current,appliance:e.target.value}))}>{APPLIANCES.map((item)=><option key={item}>{item}</option>)}</Select><Input value={applianceDraft.instructions} onChange={(e)=>setApplianceDraft((current)=>({...current,instructions:e.target.value}))} placeholder="How should the Guest use it?"/><button type="button" onClick={addAppliance} className={`rounded-2xl px-4 font-black ${premiumHost?"bg-amber-300 text-slate-950":"bg-violet-700 text-white"}`}>Add</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{data.applianceGuide.map((item,index)=><div key={`${item.appliance}-${index}`} className={`rounded-2xl border p-4 ${premiumHost?"border-white/10 bg-white/[.04]":"border-slate-200 bg-slate-50"}`}><div className="flex justify-between"><h3 className="font-black">{item.appliance}</h3><button type="button" onClick={()=>updateRoot("applianceGuide",data.applianceGuide.filter((_,itemIndex)=>itemIndex!==index))} className="text-red-500"><FiTrash2/></button></div><p className="mt-2 text-xs leading-5 opacity-60">{item.instructions}</p></div>)}</div></Panel></div>;
      case 14:
        return <Panel premium={premiumHost} title="Availability calendar" description="Block dates, mark unavailable dates and set manual special prices. No AI pricing is used."><AvailabilityCalendar data={data} onChange={(availability)=>updateRoot("availability",availability)} premium={premiumHost}/></Panel>;
      default: return null;
    }
  };

  const progress = Math.round(((step + 1) / WIZARD_STEPS.length) * 100);

  return (
    <div className={`min-h-screen px-4 py-6 sm:px-6 lg:px-8 ${premiumHost ? "premium-host-page bg-[radial-gradient(circle_at_90%_0,rgba(251,191,36,.10),transparent_30rem),linear-gradient(160deg,#0b1020,#111827_52%,#171208)]" : "bg-slate-50"}`}>
      <div className="mx-auto max-w-7xl">
        <header className={`rounded-[30px] border p-5 sm:p-7 ${premiumHost ? "border-amber-300/20 bg-[#111827]/88 text-white shadow-[0_25px_75px_rgba(0,0,0,.35)]" : "border-slate-200 bg-white shadow-sm"}`}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className={`text-[10px] font-black uppercase tracking-[.2em] ${premiumHost ? "text-amber-300" : "text-rose-600"}`}>{premiumHost ? "Subscribed Host Studio" : "Host listing studio"}</p><h1 className="mt-2 text-3xl font-black">{mode === "edit" ? "Edit your property" : "Create a new property"}</h1><p className={`mt-2 text-sm ${premiumHost ? "text-white/50" : "text-slate-500"}`}>Phase-1 guided listing flow · draft saved automatically</p></div><div className={`rounded-2xl px-4 py-3 text-sm font-black ${premiumHost ? "bg-amber-300 text-slate-950" : "bg-rose-50 text-rose-700"}`}>{progress}% complete</div></div><div className={`mt-5 h-2 overflow-hidden rounded-full ${premiumHost ? "bg-white/10" : "bg-slate-100"}`}><motion.div animate={{ width: `${progress}%` }} className={`h-full rounded-full ${premiumHost ? "bg-gradient-to-r from-amber-300 to-orange-400" : "bg-gradient-to-r from-rose-500 to-violet-600"}`}/></div>
        </header>

        <div ref={stepRailRef} className="no-scrollbar mt-4 flex gap-2 overflow-x-auto py-2">{WIZARD_STEPS.map(([title],index)=>{const active=index===step;const complete=index<step;return <button type="button" key={title} data-step-index={index} disabled={index>step} onClick={()=>index<=step&&goTo(index)} className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-black ${active?premiumHost?"border-amber-300 bg-amber-300 text-slate-950":"border-rose-600 bg-rose-600 text-white":complete?premiumHost?"border-emerald-300/20 bg-emerald-300/10 text-emerald-300":"border-emerald-200 bg-emerald-50 text-emerald-700":premiumHost?"border-white/10 bg-white/[.03] text-white/35":"border-slate-200 bg-white text-slate-400"}`}><span className="grid h-6 w-6 place-items-center rounded-lg bg-current/10">{complete?<FiCheck/>:index+1}</span>{title}</button>})}</div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div><StepIntro step={step}/>{error&&<motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><span>{error}</span><button type="button" onClick={()=>setError("")}><FiX/></button></motion.div>}<AnimatePresence mode="wait" custom={direction}><motion.div key={step} custom={direction} initial={{opacity:0,x:direction*26}} animate={{opacity:1,x:0}} exit={{opacity:0,x:direction*-20}} transition={{duration:.25}}>{renderStep()}</motion.div></AnimatePresence></div>

          <aside className={`rounded-[28px] border p-5 xl:sticky xl:top-5 ${premiumHost ? "border-amber-300/20 bg-[#111827]/90 text-white shadow-2xl" : "border-slate-200 bg-white shadow-lg"}`}><p className={`text-[10px] font-black uppercase tracking-[.18em] ${premiumHost?"text-amber-300":"text-rose-600"}`}>Live summary</p><h2 className="mt-2 line-clamp-2 text-xl font-black">{data.title || "Untitled property"}</h2><p className={`mt-1 text-xs ${premiumHost?"text-white/45":"text-slate-500"}`}>{data.propertyType} · {[data.location.area,data.location.city].filter(Boolean).join(", ")||"Location pending"}</p><div className={`mt-4 grid grid-cols-2 gap-2 text-xs ${premiumHost?"text-white/65":"text-slate-600"}`}><div className="rounded-xl bg-current/[.06] p-3"><strong className="block text-lg">{data.guests}</strong>Guests</div><div className="rounded-xl bg-current/[.06] p-3"><strong className="block text-lg">{data.bedrooms}</strong>Bedrooms</div><div className="rounded-xl bg-current/[.06] p-3"><strong className="block text-lg">{images.length}</strong>Images</div><div className="rounded-xl bg-current/[.06] p-3"><strong className="block text-lg">{money(data.pricing.rates.night)}</strong>Per night</div></div><div className={`mt-4 rounded-2xl p-4 text-xs leading-5 ${premiumHost?"bg-amber-300/10 text-amber-100":"bg-slate-50 text-slate-600"}`}>{Number(data.policies.minBookingDays)>1?`Hourly booking is disabled because the minimum stay is ${data.policies.minBookingDays} days.`:"Hourly booking remains available."}</div>{step===WIZARD_STEPS.length-1&&<button type="button" onClick={submit} disabled={submitting} className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black disabled:opacity-50 ${premiumHost?"bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950":"bg-gradient-to-r from-rose-600 to-violet-700 text-white"}`}>{submitting?"Submitting...":mode==="edit"?"Save and resubmit":"Submit for approval"}</button>}</aside>
        </div>

        <div className={`mt-6 flex items-center justify-between gap-3 rounded-[24px] border p-4 ${premiumHost?"border-white/10 bg-[#111827]/88":"border-slate-200 bg-white"}`}><button type="button" onClick={()=>step===0?navigate("/host/listings"):goTo(step-1)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${premiumHost?"bg-white/10 text-white":"bg-slate-100 text-slate-700"}`}><FiArrowLeft/>{step===0?"Cancel":"Previous"}</button>{step<WIZARD_STEPS.length-1?<button type="button" onClick={nextStep} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${premiumHost?"bg-amber-300 text-slate-950":"bg-slate-950 text-white"}`}>Next<FiArrowRight/></button>:<button type="button" onClick={submit} disabled={submitting} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black disabled:opacity-50 ${premiumHost?"bg-amber-300 text-slate-950":"bg-rose-600 text-white"}`}>{submitting?"Submitting...":"Submit listing"}<FiArrowRight/></button>}</div>
      </div>
    </div>
  );
}