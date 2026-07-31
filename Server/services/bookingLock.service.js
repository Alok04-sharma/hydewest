const crypto = require("crypto");
const BookingLock = require("../models/bookingLock.model");

const LOCK_TTL_MS = 30 * 1000;

const acquireBookingLock = async (apartmentId) => {
  const token = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  try {
    await BookingLock.create({
      _id: apartmentId,
      token,
      expiresAt,
    });

    return token;
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const reclaimed = await BookingLock.findOneAndUpdate(
    {
      _id: apartmentId,
      expiresAt: { $lte: now },
    },
    {
      $set: {
        token,
        expiresAt,
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!reclaimed) {
    const error = new Error(
      "Another booking request is currently being processed for this property. Please retry in a few seconds."
    );
    error.statusCode = 409;
    error.code = "BOOKING_LOCKED";
    throw error;
  }

  return token;
};

const releaseBookingLock = async (apartmentId, token) => {
  await BookingLock.deleteOne({
    _id: apartmentId,
    token,
  });
};

module.exports = {
  acquireBookingLock,
  releaseBookingLock,
};