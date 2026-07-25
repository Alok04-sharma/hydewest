export const PROPERTY_TYPES = [
  ["Apartment", "🏢", "Modern flats and serviced apartments"],
  ["House", "🏠", "Independent homes for families"],
  ["Villa", "🏡", "Premium private stays"],
  ["Studio", "🛋️", "Compact open-plan spaces"],
  ["Room", "🛏️", "Private room inside a property"],
  ["Cabin", "🪵", "Nature-focused wooden stays"],
  ["Cottage", "🌿", "Charming countryside homes"],
  ["Farm House", "🚜", "Spacious farm experiences"],
  ["Hotel", "🏨", "Professional hospitality rooms"],
  ["Resort", "🌴", "Leisure and vacation properties"],
  ["Hostel", "🎒", "Budget social accommodation"],
  ["Guest House", "🛎️", "Comfortable hosted stays"],
  ["Tree House", "🌳", "Unique elevated stays"],
  ["Tent", "⛺", "Camping and glamping spaces"],
];

export const PRICING_UNITS = [
  ["hour", "Hourly", "Best for short stays up to 24 hours", "⏱️"],
  ["night", "Nightly", "A better value than paying for many hours", "🌙"],
  ["day", "Daily", "Host's main price and pricing reference", "☀️"],
  ["week", "Weekly", "Built-in long-stay saving", "🗓️"],
  ["month", "Monthly", "Highest saving for extended stays", "🏡"],
];

export const RATE_MULTIPLIERS = Object.freeze({
  hour: 0.08,
  night: 0.9,
  day: 1,
  week: 6,
  month: 24,
});

const roundRate = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount < 100) return Math.max(Math.round(amount), 1);
  return Math.max(Math.round(amount / 10) * 10, 1);
};

export const calculateSuggestedRates = (dayPrice, currentRates = {}) => {
  const day = roundRate(dayPrice);
  const generated = {
    hour: roundRate(day * RATE_MULTIPLIERS.hour),
    night: roundRate(day * RATE_MULTIPLIERS.night),
    day,
    week: roundRate(day * RATE_MULTIPLIERS.week),
    month: roundRate(day * RATE_MULTIPLIERS.month),
  };

  return Object.fromEntries(
    Object.entries(generated).map(([unit, value]) => {
      const current = Number(currentRates?.[unit]);
      return [unit, Number.isFinite(current) && current > 0 ? current : value];
    })
  );
};

export const createPresetCoupons = () => [
  {
    code: "WELCOME10",
    label: "Welcome Offer",
    description: "10% off for guests trying this stay.",
    discountType: "percentage",
    discountValue: 10,
    minBookingAmount: 1500,
    maxDiscount: 1000,
    usageLimit: 100,
    usedCount: 0,
    premiumOnly: false,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  },
  {
    code: "STAYMORE12",
    label: "Long Stay Saver",
    description: "12% off on higher-value stays.",
    discountType: "percentage",
    discountValue: 12,
    minBookingAmount: 7000,
    maxDiscount: 2500,
    usageLimit: 100,
    usedCount: 0,
    premiumOnly: false,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  },
  {
    code: "UPI5",
    label: "UPI Payment Offer",
    description: "5% off when the guest pays using UPI.",
    discountType: "percentage",
    discountValue: 5,
    minBookingAmount: 1500,
    maxDiscount: 500,
    usageLimit: 200,
    usedCount: 0,
    premiumOnly: false,
    paymentMethod: "upi",
    source: "preset",
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  },
  {
    code: "CARD7",
    label: "Card Payment Offer",
    description: "7% off when the guest pays using a card.",
    discountType: "percentage",
    discountValue: 7,
    minBookingAmount: 3000,
    maxDiscount: 750,
    usageLimit: 200,
    usedCount: 0,
    premiumOnly: false,
    paymentMethod: "card",
    source: "preset",
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  },
  {
    code: "PREMIUM15",
    label: "Premium Member Deal",
    description: "Extra 15% host offer for active Premium guests.",
    discountType: "percentage",
    discountValue: 15,
    minBookingAmount: 2500,
    maxDiscount: 3000,
    usageLimit: 100,
    usedCount: 0,
    premiumOnly: true,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  },
  {
    code: "PREMIUM500",
    label: "Premium Flat Saver",
    description: "Flat ₹500 off for Premium guests on qualifying stays.",
    discountType: "fixed",
    discountValue: 500,
    minBookingAmount: 5000,
    maxDiscount: 500,
    usageLimit: 100,
    usedCount: 0,
    premiumOnly: true,
    paymentMethod: "any",
    source: "preset",
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: "",
  },
];

export const AMENITY_GROUPS = [
  {
    title: "Essentials",
    items: ["Wifi", "Air Conditioning", "Heating", "Hot Water", "Power Backup", "Dedicated Workspace"],
  },
  {
    title: "Kitchen & Dining",
    items: ["Kitchen", "Refrigerator", "Microwave", "Cooking Basics", "Dining Table", "Coffee Maker", "Dishwasher"],
  },
  {
    title: "Entertainment",
    items: ["TV", "Streaming Services", "Sound System", "Books", "Board Games", "Game Console"],
  },
  {
    title: "Outdoor",
    items: ["Balcony", "Garden", "Patio", "Terrace", "Barbecue", "Outdoor Dining", "Fire Pit"],
  },
  {
    title: "Parking & Access",
    items: ["Free Parking", "Paid Parking", "EV Charger", "Lift", "Wheelchair Access", "Private Entrance"],
  },
  {
    title: "Premium",
    items: ["Swimming Pool", "Hot Tub", "Gym", "Sauna", "Spa", "Lake Access", "Beach Access", "Mountain View"],
  },
  {
    title: "Safety",
    items: ["Smoke Alarm", "Fire Extinguisher", "First Aid Kit", "CCTV Outside", "Security Guard", "Carbon Monoxide Alarm"],
  },
  {
    title: "Services",
    items: ["Daily Housekeeping", "Breakfast Included", "Room Service", "Luggage Drop", "Airport Pickup", "Laundry Service"],
  },
];

export const DEFAULT_HOUSE_RULES = [
  "No smoking inside the property",
  "No parties or events without approval",
  "Pets allowed only with host approval",
  "Quiet hours after 10:00 PM",
];

const today = new Date();
const nextYear = new Date(today);
nextYear.setFullYear(today.getFullYear() + 1);
const toDateInput = (date) => date.toISOString().split("T")[0];

export const createDefaultListing = () => {
  const rates = calculateSuggestedRates(2000);

  return {
    title: "",
    propertyType: "Apartment",
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    description: "",
    location: {
      country: "India",
      state: "",
      city: "",
      address: "",
      landmark: "",
      zipCode: "",
      latitude: 28.6139,
      longitude: 77.209,
    },
    pricing: {
      basePrice: rates.day,
      pricePerNight: rates.night,
      priceUnit: "day",
      rates,
      autoRateMultipliers: true,
      cleaningFee: 300,
      serviceFee: 0,
      extraGuestFee: 500,
      baseGuestCount: 2,
      currency: "INR",
    },
    coupons: createPresetCoupons(),
    amenities: ["Wifi", "Kitchen"],
    houseRules: [...DEFAULT_HOUSE_RULES],
    availability: {
      availableFrom: toDateInput(today),
      availableTo: toDateInput(nextYear),
      blockedDates: [],
    },
    policies: {
      minBookingDays: 1,
      maxBookingDays: 365,
      cancellationPolicy: "moderate",
      checkInTime: "14:00",
      checkOutTime: "11:00",
    },
    timezone: "Asia/Kolkata",
  };
};

export const WIZARD_STEPS = [
  ["Title", "Give your property a memorable name"],
  ["Property type", "Choose the closest property category"],
  ["Guests", "Set the maximum guest capacity"],
  ["Rooms & beds", "Tell guests about sleeping spaces"],
  ["Bathrooms", "Add the bathroom count"],
  ["Description", "Explain what makes the stay special"],
  ["Location", "Address, landmark and map coordinates"],
  ["Pricing", "Enter one daily price and review smart long-stay rates"],
  ["Coupons", "Use ready-made offers or create your own"],
  ["Amenities", "Show everything the property offers"],
  ["Rules & availability", "Stay timings, rules and dates"],
  ["Photos", "Upload at least three and select a cover"],
  ["Review", "Review everything before submission"],
];

export const formatPriceUnit = (unit) =>
  ({ hour: "hour", day: "day", night: "night", week: "week", month: "month" })[unit] || "day";