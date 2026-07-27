export const PROPERTY_TYPES = [
  ["Apartment", "🏢"],
  ["House", "🏠"],
  ["Villa", "🏡"],
  ["Studio", "🛋️"],
  ["Room", "🛏️"],
  ["Cabin", "🪵"],
  ["Cottage", "🌿"],
  ["Farm House", "🚜"],
  ["Hotel", "🏨"],
  ["Resort", "🌴"],
  ["Hostel", "🎒"],
  ["Guest House", "🛎️"],
  ["Tree House", "🌳"],
  ["Tent", "⛺"],
];

export const PROPERTY_STYLES = [
  "Modern",
  "Luxury",
  "Minimal",
  "Traditional",
  "Rustic",
  "Bohemian",
  "Eco-friendly",
  "Family-friendly",
  "Business-ready",
];

export const BED_TYPES = [
  ["King", 2],
  ["Queen", 2],
  ["Single", 1],
  ["Twin", 1],
  ["Bunk", 2],
  ["Sofa Bed", 2],
];

export const PRICING_UNITS = [
  ["hour", "Hourly", "Short stays", "⏱️"],
  ["night", "Nightly", "Overnight value", "🌙"],
  ["week", "Weekly", "Long-stay saving", "🗓️"],
  ["month", "Monthly", "Extended-stay saving", "🏡"],
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
      return [unit, Number.isFinite(current) && current >= 0 ? current : value];
    })
  );
};

export const createPresetCoupons = () => [
  { code: "WELCOME10", label: "Welcome Offer", description: "10% off for first-time guests.", discountType: "percentage", discountValue: 10, minBookingAmount: 1500, maxDiscount: 1000, usageLimit: 100, usedCount: 0, premiumOnly: false, paymentMethod: "any", source: "preset", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" },
  { code: "STAYMORE12", label: "Long Stay Saver", description: "12% off on qualifying longer stays.", discountType: "percentage", discountValue: 12, minBookingAmount: 7000, maxDiscount: 2500, usageLimit: 100, usedCount: 0, premiumOnly: false, paymentMethod: "any", source: "preset", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" },
  { code: "UPI5", label: "UPI Payment Offer", description: "5% off when the final payment is made using UPI.", discountType: "percentage", discountValue: 5, minBookingAmount: 1500, maxDiscount: 500, usageLimit: 200, usedCount: 0, premiumOnly: false, paymentMethod: "upi", source: "preset", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" },
  { code: "CARD7", label: "Card Payment Offer", description: "7% off when the final payment is made using a card.", discountType: "percentage", discountValue: 7, minBookingAmount: 3000, maxDiscount: 750, usageLimit: 200, usedCount: 0, premiumOnly: false, paymentMethod: "card", source: "preset", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" },
  { code: "PREMIUM15", label: "Premium Member Deal", description: "Extra 15% Host offer for active Premium guests.", discountType: "percentage", discountValue: 15, minBookingAmount: 2500, maxDiscount: 3000, usageLimit: 100, usedCount: 0, premiumOnly: true, paymentMethod: "any", source: "preset", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" },
  { code: "PREMIUM500", label: "Premium Flat Saver", description: "Flat ₹500 off for Premium guests on qualifying stays.", discountType: "fixed", discountValue: 500, minBookingAmount: 5000, maxDiscount: 500, usageLimit: 100, usedCount: 0, premiumOnly: true, paymentMethod: "any", source: "preset", isActive: true, validFrom: new Date().toISOString().slice(0, 10), validUntil: "" },
];

export const AMENITY_GROUPS = [
  { title: "Essentials", items: ["Wifi", "Air Conditioning", "Heating", "Hot Water", "Power Backup", "Dedicated Workspace"] },
  { title: "Kitchen & Dining", items: ["Kitchen", "Refrigerator", "Microwave", "Cooking Basics", "Dining Table", "Coffee Maker", "Dishwasher"] },
  { title: "Entertainment", items: ["TV", "Streaming Services", "Sound System", "Books", "Board Games", "Game Console"] },
  { title: "Outdoor", items: ["Balcony", "Garden", "Patio", "Terrace", "Barbecue", "Outdoor Dining", "Fire Pit"] },
  { title: "Parking & Access", items: ["Free Parking", "Paid Parking", "EV Charger", "Lift", "Wheelchair Access", "Private Entrance"] },
  { title: "Premium", items: ["Swimming Pool", "Hot Tub", "Gym", "Sauna", "Spa", "Lake Access", "Beach Access", "Mountain View"] },
  { title: "Safety", items: ["Smoke Alarm", "Fire Extinguisher", "First Aid Kit", "CCTV Outside", "Security Guard", "Carbon Monoxide Alarm"] },
  { title: "Services", items: ["Daily Housekeeping", "Breakfast Included", "Room Service", "Luggage Drop", "Airport Pickup", "Laundry Service"] },
];

export const ALL_AMENITIES = AMENITY_GROUPS.flatMap((group) => group.items);

export const DEFAULT_HOUSE_RULES = [
  "No smoking inside the property",
  "No parties or events without approval",
  "Pets allowed only with Host approval",
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
    propertyStyle: "Modern",
    guests: 2,
    guestCapacity: { adults: 2, children: 0, seniorCitizens: 0 },
    bedrooms: 1,
    beds: 1,
    bedDetails: [{ type: "Queen", count: 1, capacityPerBed: 2 }],
    maximumSleepingCapacity: 2,
    bathrooms: 1,
    bathroomDetails: { western: 1, indian: 0, shower: 1, bathtub: 0, hotWater: true, accessible: false, sunflowerFriendly: false, notes: "" },
    description: "",
    location: { country: "India", state: "", city: "", area: "", address: "", landmark: "", zipCode: "", latitude: "", longitude: "" },
    nearbyInformation: { nearestAirport: "", railwayStation: "", busStand: "", metro: "", nearbyMarket: "", groceryStore: "", hospital: "", medicalStore: "", parking: "", internet: "", powerBackup: "", otherFacilities: [] },
    applianceGuide: [],
    pricing: { basePrice: rates.night, pricePerNight: rates.night, priceUnit: "night", rates, autoRateMultipliers: true, cleaningFee: 300, serviceFee: 0, extraGuestFee: 500, baseGuestCount: 2, currency: "INR" },
    coupons: createPresetCoupons(),
    amenities: ["Wifi", "Kitchen"],
    houseRules: [...DEFAULT_HOUSE_RULES],
    availability: { availableFrom: toDateInput(today), availableTo: toDateInput(nextYear), blockedDates: [], unavailableDates: [], specialPrices: [] },
    policies: { minBookingDays: 1, maxBookingDays: 365, cancellationPolicy: "moderate", checkInTime: "14:00", checkOutTime: "11:00" },
    timezone: "Asia/Kolkata",
  };
};

export const WIZARD_STEPS = [
  ["Current location", "Use Browser Geolocation or continue manually"],
  ["Address", "Enter the full postal address and nearby information"],
  ["Listing name", "Write a title or generate premium OpenRouter suggestions"],
  ["Property type", "Choose a clean property type and style"],
  ["Guests", "Set Adults, Children and Senior Citizens"],
  ["Bedrooms", "Select the number of bedrooms"],
  ["Bed details", "Choose bed types, quantity and maximum capacity"],
  ["Bathrooms", "Describe bathroom types and accessibility"],
  ["Description", "Write manually or improve it with OpenRouter"],
  ["Pricing", "Keep smart rates and configure minimum booking days"],
  ["Coupons", "Manage compact ready-made and custom offers"],
  ["Media", "Upload images and optional Cloudinary videos"],
  ["Amenities", "Search and select amenities manually"],
  ["Rules & guides", "Set rules, timings and appliance instructions"],
  ["Availability", "Block dates, mark unavailable and add special prices"],
];

export const formatPriceUnit = (unit) => ({ hour: "hour", night: "night", week: "week", month: "month" })[unit] || "night";
