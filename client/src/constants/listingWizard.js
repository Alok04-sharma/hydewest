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
  ["hour", "Per hour", "Best for workspaces and short stays"],
  ["day", "Per day", "Calendar-day pricing"],
  ["night", "Per night", "Standard stay pricing"],
  ["week", "Per week", "Longer weekly stays"],
  ["month", "Per month", "Monthly rentals"],
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

export const createDefaultListing = () => ({
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
    basePrice: 2000,
    priceUnit: "night",
    cleaningFee: 300,
    serviceFee: 0,
    extraGuestFee: 500,
    baseGuestCount: 2,
    currency: "INR",
  },
  coupons: [],
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
});

export const WIZARD_STEPS = [
  ["Title", "Give your property a memorable name"],
  ["Property type", "Choose the closest property category"],
  ["Guests", "Set the maximum guest capacity"],
  ["Rooms & beds", "Tell guests about sleeping spaces"],
  ["Bathrooms", "Add the bathroom count"],
  ["Description", "Explain what makes the stay special"],
  ["Location", "Address, landmark and map coordinates"],
  ["Pricing", "Set flexible pricing and guest charges"],
  ["Coupons", "Create multiple discount offers"],
  ["Amenities", "Show everything the property offers"],
  ["Rules & availability", "Stay timings, rules and dates"],
  ["Photos", "Upload at least three and select a cover"],
  ["Review", "Review everything before submission"],
];

export const formatPriceUnit = (unit) =>
  ({ hour: "hour", day: "day", night: "night", week: "week", month: "month" })[unit] || "night";