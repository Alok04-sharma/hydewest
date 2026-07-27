const Booking = require("../models/booking.model");

const BLOCKING_BOOKING_STATUSES = Object.freeze(["pending", "confirmed"]);

const toPlainObject = (value) => {
  if (!value) return value;
  return typeof value.toObject === "function" ? value.toObject() : { ...value };
};

const normalizeApartmentId = (value) =>
  String(value?._id || value?.id || value || "");

const serializePeriod = (booking) => ({
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
  status: booking.status,
});

const buildAvailabilitySummary = (periods = [], now = new Date()) => {
  const normalizedNow = new Date(now);
  const sortedPeriods = periods
    .map((period) => ({
      checkIn: new Date(period.checkIn),
      checkOut: new Date(period.checkOut),
      status: period.status,
    }))
    .filter(
      (period) =>
        !Number.isNaN(period.checkIn.getTime()) &&
        !Number.isNaN(period.checkOut.getTime()) &&
        period.checkOut > normalizedNow
    )
    .sort((first, second) => first.checkIn - second.checkIn);

  const currentBooking =
    sortedPeriods.find(
      (period) =>
        period.checkIn <= normalizedNow && period.checkOut > normalizedNow
    ) || null;

  const nextBooking =
    sortedPeriods.find((period) => period.checkIn > normalizedNow) || null;

  let nextAvailableAt = new Date(normalizedNow);

  for (const period of sortedPeriods) {
    if (period.checkOut <= nextAvailableAt) continue;

    if (period.checkIn <= nextAvailableAt) {
      nextAvailableAt = new Date(period.checkOut);
      continue;
    }

    break;
  }

  return {
    isCurrentlyBooked: Boolean(currentBooking),
    isAvailableNow: !currentBooking,
    currentBooking: currentBooking ? serializePeriod(currentBooking) : null,
    nextBooking: nextBooking ? serializePeriod(nextBooking) : null,
    nextAvailableAt: currentBooking ? nextAvailableAt : normalizedNow,
    bookedPeriods: sortedPeriods.map(serializePeriod),
  };
};

const getPublicAvailabilityMap = async (
  apartmentIds = [],
  { now = new Date(), periodLimit = 12 } = {}
) => {
  const normalizedIds = apartmentIds
    .map(normalizeApartmentId)
    .filter(Boolean);

  if (!normalizedIds.length) return new Map();

  const bookings = await Booking.find({
    apartment: { $in: normalizedIds },
    isDeleted: false,
    status: { $in: BLOCKING_BOOKING_STATUSES },
    checkOut: { $gt: now },
  })
    .select("apartment checkIn checkOut status")
    .sort({ apartment: 1, checkIn: 1 })
    .lean();

  const grouped = new Map();

  bookings.forEach((booking) => {
    const apartmentId = normalizeApartmentId(booking.apartment);
    const current = grouped.get(apartmentId) || [];

    if (current.length < periodLimit) {
      current.push(booking);
      grouped.set(apartmentId, current);
    }
  });

  return new Map(
    normalizedIds.map((apartmentId) => [
      apartmentId,
      buildAvailabilitySummary(grouped.get(apartmentId) || [], now),
    ])
  );
};

const attachPublicAvailability = async (
  apartments,
  { now = new Date(), periodLimit = 12 } = {}
) => {
  const isArray = Array.isArray(apartments);
  const apartmentList = isArray ? apartments : [apartments];
  const validApartments = apartmentList.filter(Boolean);

  if (!validApartments.length) return isArray ? [] : null;

  const availabilityMap = await getPublicAvailabilityMap(
    validApartments.map((apartment) => apartment._id || apartment.id),
    { now, periodLimit }
  );

  const enriched = validApartments.map((apartment) => {
    const plainApartment = toPlainObject(apartment);
    const apartmentId = normalizeApartmentId(plainApartment);

    return {
      ...plainApartment,
      bookingAvailability:
        availabilityMap.get(apartmentId) || buildAvailabilitySummary([], now),
    };
  });

  return isArray ? enriched : enriched[0];
};

module.exports = {
  BLOCKING_BOOKING_STATUSES,
  buildAvailabilitySummary,
  getPublicAvailabilityMap,
  attachPublicAvailability,
};
