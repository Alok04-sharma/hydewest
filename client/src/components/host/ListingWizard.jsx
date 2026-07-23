import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiImage,
  FiMapPin,
  FiNavigation,
  FiPlus,
  FiSave,
  FiStar,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import listingService from "../../services/listing.service";
import {
  AMENITY_GROUPS,
  PRICING_UNITS,
  PROPERTY_TYPES,
  WIZARD_STEPS,
  createDefaultListing,
  formatPriceUnit,
} from "../../constants/listingWizard";

const DRAFT_KEY = "staynest_listing_draft_v2";

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const normalizeInitialData = (source) => {
  const defaults = createDefaultListing();
  if (!source) return defaults;

  return {
    ...defaults,
    ...source,
    location: { ...defaults.location, ...(source.location || {}) },
    pricing: {
      ...defaults.pricing,
      ...(source.pricing || {}),
      basePrice:
        source.pricing?.basePrice || source.pricing?.pricePerNight || defaults.pricing.basePrice,
    },
    coupons: (source.coupons || []).map((coupon) => ({
      ...coupon,
      code: String(coupon.code || "").toUpperCase(),
      validFrom: toDateInput(coupon.validFrom) || toDateInput(new Date()),
      validUntil: toDateInput(coupon.validUntil),
    })),
    amenities: source.amenities || [],
    houseRules: source.houseRules || [],
    availability: {
      ...defaults.availability,
      ...(source.availability || {}),
      availableFrom: toDateInput(source.availability?.availableFrom) || defaults.availability.availableFrom,
      availableTo: toDateInput(source.availability?.availableTo) || defaults.availability.availableTo,
    },
    policies: { ...defaults.policies, ...(source.policies || {}) },
  };
};

const FieldLabel = ({ children, optional = false }) => (
  <label className="mb-2 block text-sm font-black text-gray-800">
    {children}
    {optional && <span className="ml-2 text-xs font-semibold text-gray-400">Optional</span>}
  </label>
);

const TextInput = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`w-full rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FF385C] focus:ring-4 focus:ring-rose-100 ${className}`}
  />
);

const NumberCounter = ({ label, helper, value, min = 0, max = 50, onChange }) => (
  <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div>
      <p className="font-black text-gray-900">{label}</p>
      <p className="mt-1 text-xs text-gray-500">{helper}</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(Number(value) - 1, min))}
        disabled={Number(value) <= min}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl font-bold text-gray-700 transition hover:border-[#FF385C] hover:text-[#FF385C] disabled:cursor-not-allowed disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-8 text-center text-lg font-black text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(Number(value) + 1, max))}
        disabled={Number(value) >= max}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-xl font-bold text-gray-700 transition hover:border-[#FF385C] hover:text-[#FF385C] disabled:cursor-not-allowed disabled:opacity-30"
      >
        +
      </button>
    </div>
  </div>
);

const StepHeading = ({ title, description }) => (
  <div className="mb-8">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF385C]">StayNest Host Setup</p>
    <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">{title}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">{description}</p>
  </div>
);

const getStepError = (step, data, images) => {
  switch (step) {
    case 0:
      return data.title.trim().length >= 10 ? "" : "Property title must contain at least 10 characters.";
    case 1:
      return data.propertyType ? "" : "Please select a property type.";
    case 2:
      return Number(data.guests) >= 1 ? "" : "At least one guest must be allowed.";
    case 3:
      return Number(data.beds) >= 1 && Number(data.bedrooms) >= 0
        ? ""
        : "Add valid bedroom and bed counts.";
    case 4:
      return Number(data.bathrooms) >= 1 ? "" : "At least one bathroom is required.";
    case 5:
      return data.description.trim().length >= 50
        ? ""
        : "Description must contain at least 50 characters.";
    case 6:
      if (!data.location.city || !data.location.state || !data.location.country || !data.location.address) {
        return "Complete address, city, state and country are required.";
      }
      if (!Number.isFinite(Number(data.location.latitude)) || !Number.isFinite(Number(data.location.longitude))) {
        return "Valid map coordinates are required.";
      }
      return "";
    case 7:
      if (Number(data.pricing.basePrice) <= 0) return "Base price must be greater than zero.";
      if (Number(data.pricing.baseGuestCount) > Number(data.guests)) {
        return "Included guest count cannot exceed maximum guests.";
      }
      return "";
    case 8: {
      const codes = data.coupons.map((coupon) => coupon.code.trim().toUpperCase()).filter(Boolean);
      if (new Set(codes).size !== codes.length) return "Coupon codes must be unique.";
      const invalid = data.coupons.find(
        (coupon) =>
          coupon.code.trim().length < 3 ||
          Number(coupon.discountValue) <= 0 ||
          (coupon.discountType === "percentage" && Number(coupon.discountValue) > 100)
      );
      return invalid ? "Every coupon needs a valid code and discount value." : "";
    }
    case 9:
      return data.amenities.length ? "" : "Select at least one amenity.";
    case 10:
      if (!data.availability.availableFrom || !data.availability.availableTo) {
        return "Availability dates are required.";
      }
      if (new Date(data.availability.availableTo) <= new Date(data.availability.availableFrom)) {
        return "Available-to date must be after available-from date.";
      }
      return "";
    case 11:
      return images.length >= 3 ? "" : "Upload at least three property images.";
    default:
      return "";
  }
};

export default function ListingWizard({ mode = "create", initialData = null, listingId = "" }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [customRule, setCustomRule] = useState("");

  const [data, setData] = useState(() => {
    if (initialData) return normalizeInitialData(initialData);
    if (mode === "create") {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
        if (draft) return normalizeInitialData(draft);
      } catch {
        // Invalid local draft is ignored.
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

  const [coverId, setCoverId] = useState(() => {
    const initialImages = initialData?.images || [];
    const coverIndex = initialImages.findIndex((image) => image.isCover);
    const selected = initialImages[coverIndex >= 0 ? coverIndex : 0];
    return selected ? `existing-${selected.publicId || coverIndex}` : "";
  });

  useEffect(() => {
    if (mode === "create") {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }
  }, [data, mode]);

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.kind === "new" && image.url) URL.revokeObjectURL(image.url);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.round(((step + 1) / WIZARD_STEPS.length) * 100);
  const mapUrl = `https://www.google.com/maps?q=${Number(data.location.latitude) || 0},${Number(data.location.longitude) || 0}&z=15&output=embed`;

  const updateRoot = (field, value) => setData((previous) => ({ ...previous, [field]: value }));
  const updateNested = (group, field, value) =>
    setData((previous) => ({
      ...previous,
      [group]: { ...previous[group], [field]: value },
    }));

  const goToStep = (nextStep) => {
    setDirection(nextStep > step ? "forward" : "backward");
    setError("");
    setStep(Math.max(0, Math.min(nextStep, WIZARD_STEPS.length - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const validationError = getStepError(step, data, images);
    if (validationError) {
      setError(validationError);
      return;
    }
    goToStep(step + 1);
  };

  const addFiles = (files) => {
    const allowed = Array.from(files || []).filter((file) =>
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)
    );
    const remainingSlots = Math.max(10 - images.length, 0);
    const selected = allowed.slice(0, remainingSlots);

    const created = selected.map((file, index) => ({
      id: `new-${Date.now()}-${index}-${file.name}`,
      kind: "new",
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setImages((previous) => {
      const next = [...previous, ...created];
      if (!coverId && next[0]) setCoverId(next[0].id);
      return next;
    });
    setError("");
  };

  const removeImage = (id) => {
    setImages((previous) => {
      const target = previous.find((image) => image.id === id);
      if (target?.kind === "new") URL.revokeObjectURL(target.url);
      const next = previous.filter((image) => image.id !== id);
      if (coverId === id) setCoverId(next[0]?.id || "");
      return next;
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateNested("location", "latitude", Number(position.coords.latitude.toFixed(6)));
        updateNested("location", "longitude", Number(position.coords.longitude.toFixed(6)));
        setError("");
      },
      () => setError("Location access failed. Please enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleAmenity = (amenity) => {
    setData((previous) => ({
      ...previous,
      amenities: previous.amenities.includes(amenity)
        ? previous.amenities.filter((item) => item !== amenity)
        : [...previous.amenities, amenity],
    }));
  };

  const addCoupon = () => {
    setData((previous) => ({
      ...previous,
      coupons: [
        ...previous.coupons,
        {
          code: "",
          discountType: "percentage",
          discountValue: 10,
          minBookingAmount: 0,
          maxDiscount: 0,
          validFrom: new Date().toISOString().split("T")[0],
          validUntil: "",
          usageLimit: 0,
          usedCount: 0,
          isActive: true,
        },
      ],
    }));
  };

  const updateCoupon = (index, field, value) => {
    setData((previous) => ({
      ...previous,
      coupons: previous.coupons.map((coupon, couponIndex) =>
        couponIndex === index
          ? { ...coupon, [field]: field === "code" ? String(value).toUpperCase() : value }
          : coupon
      ),
    }));
  };

  const removeCoupon = (index) => {
    setData((previous) => ({
      ...previous,
      coupons: previous.coupons.filter((_, couponIndex) => couponIndex !== index),
    }));
  };

  const addRule = () => {
    const rule = customRule.trim();
    if (!rule) return;
    setData((previous) => ({
      ...previous,
      houseRules: previous.houseRules.includes(rule)
        ? previous.houseRules
        : [...previous.houseRules, rule],
    }));
    setCustomRule("");
  };

  const buildPayload = () => {
    const payload = new FormData();
    ["title", "description", "propertyType", "guests", "bedrooms", "beds", "bathrooms", "timezone"].forEach(
      (field) => payload.append(field, data[field])
    );
    payload.append("location", JSON.stringify(data.location));
    payload.append("pricing", JSON.stringify(data.pricing));
    payload.append("coupons", JSON.stringify(data.coupons));
    payload.append("amenities", JSON.stringify(data.amenities));
    payload.append("houseRules", JSON.stringify(data.houseRules));
    payload.append("availability", JSON.stringify(data.availability));
    payload.append("policies", JSON.stringify(data.policies));

    const existingImages = images
      .filter((image) => image.kind === "existing")
      .map((image) => ({
        url: image.url,
        publicId: image.publicId,
        clientKey: image.id,
      }));
    const newImages = images.filter((image) => image.kind === "new");

    payload.append("existingImages", JSON.stringify(existingImages));
    payload.append("newImageKeys", JSON.stringify(newImages.map((image) => image.id)));
    payload.append("imageOrder", JSON.stringify(images.map((image) => image.id)));
    payload.append("coverImageKey", coverId || images[0]?.id || "");
    newImages.forEach((image) => payload.append("images", image.file));

    return payload;
  };

  const submitListing = async () => {
    for (let index = 0; index < WIZARD_STEPS.length - 1; index += 1) {
      const validationError = getStepError(index, data, images);
      if (validationError) {
        setStep(index);
        setError(validationError);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      const response =
        mode === "edit"
          ? await listingService.update(listingId, buildPayload())
          : await listingService.create(buildPayload());

      if (!response.success) throw new Error(response.message || "Property could not be saved.");
      if (mode === "create") localStorage.removeItem(DRAFT_KEY);
      setSuccess(response.message || "Property saved successfully.");
      window.setTimeout(() => navigate("/host/listings", { replace: true }), 1500);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || requestError.message || "Property save karne me error aaya."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <StepHeading title="Start with a strong title" description="A clear title helps guests instantly understand the experience you offer." />
            <FieldLabel>Property title</FieldLabel>
            <TextInput
              autoFocus
              value={data.title}
              onChange={(event) => updateRoot("title", event.target.value)}
              placeholder="Example: Peaceful sea-view villa near Candolim Beach"
              maxLength={100}
            />
            <div className="mt-3 flex justify-between text-xs font-semibold text-gray-400">
              <span>Minimum 10 characters</span><span>{data.title.length}/100</span>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <StepHeading title="What kind of place is it?" description="Choose the category guests will use while searching." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROPERTY_TYPES.map(([name, icon, helper]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => updateRoot("propertyType", name)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    data.propertyType === name
                      ? "border-[#FF385C] bg-rose-50 ring-2 ring-rose-100"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl">{icon}</span>
                  <p className="mt-3 font-black text-gray-900">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{helper}</p>
                </button>
              ))}
            </div>
          </>
        );
      case 2:
        return (
          <>
            <StepHeading title="How many guests can stay?" description="Set a comfortable and safe maximum guest capacity." />
            <div className="max-w-xl">
              <NumberCounter
                label="Maximum guests"
                helper="Adults and children combined"
                value={data.guests}
                min={1}
                max={50}
                onChange={(value) => {
                  updateRoot("guests", value);
                  if (data.pricing.baseGuestCount > value) updateNested("pricing", "baseGuestCount", value);
                }}
              />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <StepHeading title="Sleeping arrangements" description="Guests use these details to check whether your space fits their group." />
            <div className="grid max-w-2xl gap-4">
              <NumberCounter label="Bedrooms" helper="Studio properties can use zero" value={data.bedrooms} min={0} onChange={(value) => updateRoot("bedrooms", value)} />
              <NumberCounter label="Beds" helper="Total usable sleeping beds" value={data.beds} min={1} onChange={(value) => updateRoot("beds", value)} />
            </div>
          </>
        );
      case 4:
        return (
          <>
            <StepHeading title="Bathroom details" description="Include private and shared bathrooms available to guests." />
            <div className="max-w-xl">
              <NumberCounter label="Bathrooms" helper="Full or half bathrooms" value={data.bathrooms} min={1} onChange={(value) => updateRoot("bathrooms", value)} />
            </div>
          </>
        );
      case 5:
        return (
          <>
            <StepHeading title="Describe the experience" description="Mention the best features, nearby attractions, room layout and what guests can expect." />
            <textarea
              autoFocus
              value={data.description}
              onChange={(event) => updateRoot("description", event.target.value)}
              rows={12}
              maxLength={3000}
              placeholder="Tell guests what makes this property special..."
              className="w-full resize-none rounded-3xl border border-gray-300 bg-white p-5 text-sm font-medium leading-7 text-gray-900 outline-none transition focus:border-[#FF385C] focus:ring-4 focus:ring-rose-100"
            />
            <div className="mt-3 flex justify-between text-xs font-semibold text-gray-400">
              <span>Minimum 50 characters</span><span>{data.description.length}/3000</span>
            </div>
          </>
        );
      case 6:
        return (
          <>
            <StepHeading title="Where is your property?" description="Add the full address and confirm the map position using latitude and longitude." />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div><FieldLabel>Address</FieldLabel><TextInput value={data.location.address} onChange={(event) => updateNested("location", "address", event.target.value)} placeholder="House number, street and area" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><FieldLabel>City</FieldLabel><TextInput value={data.location.city} onChange={(event) => updateNested("location", "city", event.target.value)} /></div>
                  <div><FieldLabel>State</FieldLabel><TextInput value={data.location.state} onChange={(event) => updateNested("location", "state", event.target.value)} /></div>
                  <div><FieldLabel>Country</FieldLabel><TextInput value={data.location.country} onChange={(event) => updateNested("location", "country", event.target.value)} /></div>
                  <div><FieldLabel>PIN code</FieldLabel><TextInput value={data.location.zipCode} onChange={(event) => updateNested("location", "zipCode", event.target.value)} /></div>
                </div>
                <div><FieldLabel optional>Nearby landmark</FieldLabel><TextInput value={data.location.landmark} onChange={(event) => updateNested("location", "landmark", event.target.value)} placeholder="Metro station, mall, beach or monument" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><FieldLabel>Latitude</FieldLabel><TextInput type="number" step="any" value={data.location.latitude} onChange={(event) => updateNested("location", "latitude", event.target.value)} /></div>
                  <div><FieldLabel>Longitude</FieldLabel><TextInput type="number" step="any" value={data.location.longitude} onChange={(event) => updateNested("location", "longitude", event.target.value)} /></div>
                </div>
                <button type="button" onClick={useCurrentLocation} className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-700 transition hover:bg-purple-100">
                  <FiNavigation /> Use my current location
                </button>
              </div>
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-800"><FiMapPin className="text-[#FF385C]" /> Google Maps preview</div>
                <iframe title="Property map" src={mapUrl} className="h-[430px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          </>
        );
      case 7:
        return (
          <>
            <StepHeading title="Build your pricing" description="Choose the billing unit and add optional charges. Guests will see a transparent price breakdown." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PRICING_UNITS.map(([value, label, helper]) => (
                <button key={value} type="button" onClick={() => updateNested("pricing", "priceUnit", value)} className={`rounded-2xl border p-4 text-left transition ${data.pricing.priceUnit === value ? "border-[#FF385C] bg-rose-50 ring-2 ring-rose-100" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                  <p className="font-black text-gray-900">{label}</p><p className="mt-1 text-[11px] leading-4 text-gray-500">{helper}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-5 rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div><FieldLabel>Base price / {formatPriceUnit(data.pricing.priceUnit)}</FieldLabel><TextInput type="number" min="1" value={data.pricing.basePrice} onChange={(event) => updateNested("pricing", "basePrice", event.target.value)} /></div>
              <div><FieldLabel>Cleaning charge</FieldLabel><TextInput type="number" min="0" value={data.pricing.cleaningFee} onChange={(event) => updateNested("pricing", "cleaningFee", event.target.value)} /></div>
              <div><FieldLabel optional>Platform/service charge</FieldLabel><TextInput type="number" min="0" value={data.pricing.serviceFee} onChange={(event) => updateNested("pricing", "serviceFee", event.target.value)} /></div>
              <div><FieldLabel>Guests included in base price</FieldLabel><TextInput type="number" min="1" max={data.guests} value={data.pricing.baseGuestCount} onChange={(event) => updateNested("pricing", "baseGuestCount", event.target.value)} /></div>
              <div><FieldLabel>Extra guest charge / unit</FieldLabel><TextInput type="number" min="0" value={data.pricing.extraGuestFee} onChange={(event) => updateNested("pricing", "extraGuestFee", event.target.value)} /></div>
              <div><FieldLabel>Currency</FieldLabel><select value={data.pricing.currency} onChange={(event) => updateNested("pricing", "currency", event.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-[#FF385C] focus:ring-4 focus:ring-rose-100"><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option></select></div>
            </div>
          </>
        );
      case 8:
        return (
          <>
            <StepHeading title="Create discount coupons" description="Add multiple offers. Coupon limits are checked by the backend and usage is counted after successful payment." />
            <button type="button" onClick={addCoupon} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-black text-white transition hover:bg-[#FF385C]"><FiPlus /> Add coupon</button>
            <div className="mt-5 space-y-4">
              {data.coupons.length === 0 && <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">No coupons added. This step is optional.</div>}
              {data.coupons.map((coupon, index) => (
                <div key={`${coupon._id || "coupon"}-${index}`} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><h3 className="font-black text-gray-900">Coupon {index + 1}</h3><button type="button" onClick={() => removeCoupon(index)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><FiTrash2 /></button></div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div><FieldLabel>Code</FieldLabel><TextInput value={coupon.code} onChange={(event) => updateCoupon(index, "code", event.target.value.replace(/\s/g, ""))} placeholder="WELCOME20" /></div>
                    <div><FieldLabel>Discount type</FieldLabel><select value={coupon.discountType} onChange={(event) => updateCoupon(index, "discountType", event.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-bold outline-none"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></div>
                    <div><FieldLabel>Discount value</FieldLabel><TextInput type="number" min="1" max={coupon.discountType === "percentage" ? 100 : undefined} value={coupon.discountValue} onChange={(event) => updateCoupon(index, "discountValue", event.target.value)} /></div>
                    <div><FieldLabel>Minimum booking</FieldLabel><TextInput type="number" min="0" value={coupon.minBookingAmount} onChange={(event) => updateCoupon(index, "minBookingAmount", event.target.value)} /></div>
                    <div><FieldLabel optional>Maximum discount</FieldLabel><TextInput type="number" min="0" value={coupon.maxDiscount} onChange={(event) => updateCoupon(index, "maxDiscount", event.target.value)} /></div>
                    <div><FieldLabel>Valid from</FieldLabel><TextInput type="date" value={coupon.validFrom} onChange={(event) => updateCoupon(index, "validFrom", event.target.value)} /></div>
                    <div><FieldLabel optional>Valid until</FieldLabel><TextInput type="date" value={coupon.validUntil || ""} onChange={(event) => updateCoupon(index, "validUntil", event.target.value)} /></div>
                    <div><FieldLabel optional>Usage limit (0 = unlimited)</FieldLabel><TextInput type="number" min="0" value={coupon.usageLimit} onChange={(event) => updateCoupon(index, "usageLimit", event.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case 9:
        return (
          <>
            <StepHeading title="What does your property offer?" description="A detailed amenities list improves guest confidence and search matching." />
            <div className="space-y-6">
              {AMENITY_GROUPS.map((group) => (
                <section key={group.title} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="font-black text-gray-900">{group.title}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((amenity) => {
                      const active = data.amenities.includes(amenity);
                      return <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${active ? "border-[#FF385C] bg-rose-50 text-[#D90B42]" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-white"}`}><span>{amenity}</span>{active && <FiCheck />}</button>;
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        );
      case 10:
        return (
          <>
            <StepHeading title="Rules, timings and availability" description="Set clear expectations before guests book your property." />
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-black text-gray-900">House rules</h3>
                <div className="mt-4 space-y-3">
                  {data.houseRules.map((rule, index) => <div key={`${rule}-${index}`} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700"><span>{rule}</span><button type="button" onClick={() => updateRoot("houseRules", data.houseRules.filter((_, ruleIndex) => ruleIndex !== index))} className="text-red-500"><FiX /></button></div>)}
                </div>
                <div className="mt-4 flex gap-2"><TextInput value={customRule} onChange={(event) => setCustomRule(event.target.value)} placeholder="Add another rule" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addRule(); } }} /><button type="button" onClick={addRule} className="rounded-2xl bg-gray-900 px-4 text-white"><FiPlus /></button></div>
              </section>
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-black text-gray-900">Stay settings</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><FieldLabel>Check-in time</FieldLabel><TextInput type="time" value={data.policies.checkInTime} onChange={(event) => updateNested("policies", "checkInTime", event.target.value)} /></div>
                  <div><FieldLabel>Check-out time</FieldLabel><TextInput type="time" value={data.policies.checkOutTime} onChange={(event) => updateNested("policies", "checkOutTime", event.target.value)} /></div>
                  <div><FieldLabel>Available from</FieldLabel><TextInput type="date" value={data.availability.availableFrom} onChange={(event) => updateNested("availability", "availableFrom", event.target.value)} /></div>
                  <div><FieldLabel>Available to</FieldLabel><TextInput type="date" value={data.availability.availableTo} onChange={(event) => updateNested("availability", "availableTo", event.target.value)} /></div>
                  <div><FieldLabel>Minimum booking days</FieldLabel><TextInput type="number" min="1" value={data.policies.minBookingDays} onChange={(event) => updateNested("policies", "minBookingDays", event.target.value)} /></div>
                  <div><FieldLabel>Maximum booking days</FieldLabel><TextInput type="number" min="1" value={data.policies.maxBookingDays} onChange={(event) => updateNested("policies", "maxBookingDays", event.target.value)} /></div>
                  <div className="sm:col-span-2"><FieldLabel>Cancellation policy</FieldLabel><select value={data.policies.cancellationPolicy} onChange={(event) => updateNested("policies", "cancellationPolicy", event.target.value)} className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-bold outline-none"><option value="flexible">Flexible</option><option value="moderate">Moderate</option><option value="strict">Strict</option></select></div>
                </div>
              </section>
            </div>
          </>
        );
      case 11:
        return (
          <>
            <StepHeading title="Show your property at its best" description="Upload 3–10 clear images. Select one photo as the listing cover." />
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
            <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} className="flex min-h-56 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 text-center transition hover:border-[#FF385C] hover:bg-rose-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl text-[#FF385C] shadow-sm"><FiUploadCloud /></div>
              <p className="mt-4 text-lg font-black text-gray-900">Click to choose photos</p><p className="mt-2 text-sm text-gray-500">or drag and drop JPG, PNG or WEBP files here</p><p className="mt-2 text-xs font-bold text-gray-400">Maximum 10 photos • 5 MB each • Minimum 3 required</p>
            </button>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => <article key={image.id} className={`group relative overflow-hidden rounded-2xl border-2 bg-gray-100 ${coverId === image.id ? "border-[#FF385C] ring-4 ring-rose-100" : "border-transparent"}`}>
                <img src={image.url} alt={image.name} className="aspect-[4/3] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-white"><span className="text-xs font-bold">Photo {index + 1}</span><div className="flex gap-2"><button type="button" onClick={() => setCoverId(image.id)} className={`rounded-full p-2 ${coverId === image.id ? "bg-[#FF385C]" : "bg-black/40 hover:bg-black/60"}`} title="Set cover"><FiStar /></button><button type="button" onClick={() => removeImage(image.id)} className="rounded-full bg-black/40 p-2 hover:bg-red-600" title="Remove"><FiTrash2 /></button></div></div>
                {coverId === image.id && <span className="absolute left-3 top-3 rounded-full bg-[#FF385C] px-3 py-1 text-xs font-black text-white shadow">Cover photo</span>}
              </article>)}
            </div>
          </>
        );
      default:
        return (
          <>
            <StepHeading title="Review your listing" description="Check the key details before sending the listing to Super Admin for approval." />
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <img src={images.find((image) => image.id === coverId)?.url || images[0]?.url} alt="Cover" className="aspect-[16/9] w-full bg-gray-100 object-cover" />
                <div className="p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-[#FF385C]">{data.propertyType}</span><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{data.guests} guests</span></div><h2 className="mt-4 text-2xl font-black text-gray-950">{data.title}</h2><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-500"><FiMapPin /> {data.location.city}, {data.location.state}</p><p className="mt-5 text-sm leading-7 text-gray-600">{data.description}</p></div>
              </section>
              <section className="space-y-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-gray-400">Pricing</p><p className="mt-2 text-3xl font-black text-gray-950">₹{Number(data.pricing.basePrice || 0).toLocaleString("en-IN")}</p><p className="text-sm text-gray-500">per {formatPriceUnit(data.pricing.priceUnit)}</p><div className="mt-4 space-y-2 text-sm text-gray-600"><p>Cleaning: ₹{Number(data.pricing.cleaningFee || 0).toLocaleString("en-IN")}</p><p>Extra guest: ₹{Number(data.pricing.extraGuestFee || 0).toLocaleString("en-IN")} / unit</p><p>{data.coupons.length} coupon(s) configured</p></div></div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-gray-400">Property</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p><strong>{data.bedrooms}</strong><br/><span className="text-gray-500">Bedrooms</span></p><p><strong>{data.beds}</strong><br/><span className="text-gray-500">Beds</span></p><p><strong>{data.bathrooms}</strong><br/><span className="text-gray-500">Bathrooms</span></p><p><strong>{data.amenities.length}</strong><br/><span className="text-gray-500">Amenities</span></p></div></div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><strong>Approval flow:</strong> Saving sends the property to Super Admin. It becomes visible to guests only after approval.</div>
              </section>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <style>{`
        @keyframes wizardForward { from { opacity: 0; transform: translateX(28px) scale(.99); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes wizardBackward { from { opacity: 0; transform: translateX(-28px) scale(.99); } to { opacity: 1; transform: translateX(0) scale(1); } }
        .wizard-forward { animation: wizardForward .38s cubic-bezier(.22,.8,.32,1); }
        .wizard-backward { animation: wizardBackward .38s cubic-bezier(.22,.8,.32,1); }
      `}</style>

      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-wide text-gray-400">{mode === "edit" ? "Edit property" : "Create property"}</p><p className="mt-0.5 text-sm font-black text-gray-900">Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step][0]}</p></div>
            <div className="flex items-center gap-2 text-sm font-black text-[#FF385C]"><FiSave /> {mode === "create" ? "Draft auto-saved" : "Editing saved listing"}</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gradient-to-r from-[#FF385C] to-[#D70466] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm lg:block">
          <div className="space-y-1">
            {WIZARD_STEPS.map(([title], index) => (
              <button key={title} type="button" onClick={() => index <= step && goToStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${index === step ? "bg-gray-900 text-white" : index < step ? "text-emerald-700 hover:bg-emerald-50" : "cursor-default text-gray-400"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${index < step ? "bg-emerald-100 text-emerald-700" : index === step ? "bg-white/15 text-white" : "bg-gray-100"}`}>{index < step ? <FiCheck /> : index + 1}</span>{title}
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          {success && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">🎉 {success}</div>}
          {error && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><FiAlertCircle className="mt-0.5 shrink-0" /> {error}</div>}
          <section key={step} className={`min-h-[560px] rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10 ${direction === "forward" ? "wizard-forward" : "wizard-backward"}`}>
            {renderStep()}
          </section>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <button type="button" onClick={() => step === 0 ? navigate("/host/listings") : goToStep(step - 1)} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-100"><FiArrowLeft /> {step === 0 ? "Cancel" : "Previous"}</button>
            {step < WIZARD_STEPS.length - 1 ? <button type="button" onClick={goNext} className="inline-flex items-center gap-2 rounded-xl bg-[#FF385C] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#E31C5F]">Next <FiArrowRight /></button> : <button type="button" onClick={submitListing} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#FF385C] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Saving property..." : mode === "edit" ? "Save & resubmit" : "Submit for approval"}<FiCheck /></button>}
          </div>
        </main>
      </div>
    </div>
  );
}