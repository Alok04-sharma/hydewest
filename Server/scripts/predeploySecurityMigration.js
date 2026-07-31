require("dotenv").config();

const mongoose = require("mongoose");
const { validateEnv } = require("../config/env");
const connectDB = require("../config/db");

const OTP = require("../models/otp.model");
const Payment = require("../models/payment.model");
const SubscriptionPayment = require("../models/subscriptionPayment.model");
const GuestMembershipPayment = require("../models/guestMembershipPayment.model");
const Notification = require("../models/notification.model");
const BookingLock = require("../models/bookingLock.model");

const assertNoDuplicates = async ({ Model, field, label }) => {
  const duplicates = await Model.aggregate([
    {
      $match: {
        [field]: { $type: "string", $ne: "" },
        isDeleted: { $ne: true },
      },
    },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  if (duplicates.length) {
    const values = duplicates.map((item) => item._id).join(", ");
    throw new Error(
      `${label} contains duplicate ${field} values. Resolve them before creating unique indexes: ${values}`
    );
  }
};

const dedupeNotifications = async () => {
  const groups = await Notification.aggregate([
    {
      $match: {
        dedupeKey: { $type: "string", $ne: "" },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: { recipient: "$recipient", dedupeKey: "$dedupeKey" },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;

  for (const group of groups) {
    const duplicateIds = group.ids.slice(1);
    if (!duplicateIds.length) continue;

    const result = await Notification.updateMany(
      { _id: { $in: duplicateIds } },
      {
        $set: {
          dedupeKey: "",
          isDeleted: true,
        },
      }
    );
    removed += Number(result.modifiedCount || 0);
  }

  return removed;
};

const sameKey = (left, right) =>
  JSON.stringify(left || {}) === JSON.stringify(right || {});

const dropConflictingIndex = async ({ Model, key }) => {
  const indexes = await Model.collection.indexes();

  for (const index of indexes) {
    if (!sameKey(index.key, key) || index.name === "_id_") continue;

    // Recreate the index from the model so uniqueness and partial filters are
    // guaranteed to match this release, even if an older index was also unique.
    console.log(`Recreating index ${Model.modelName}.${index.name}`);
    await Model.collection.dropIndex(index.name);
  }
};

const run = async () => {
  validateEnv();
  await connectDB();

  console.log("Running security database migration...");

  // OTP records are temporary. Removing legacy/plaintext records is safer than
  // attempting to transform authentication secrets in place.
  const otpResult = await OTP.deleteMany({});
  console.log(`Removed ${otpResult.deletedCount || 0} temporary OTP record(s).`);

  await assertNoDuplicates({
    Model: Payment,
    field: "razorpayOrderId",
    label: "Booking payments",
  });
  await assertNoDuplicates({
    Model: Payment,
    field: "razorpayPaymentId",
    label: "Booking payments",
  });
  await assertNoDuplicates({
    Model: SubscriptionPayment,
    field: "razorpayOrderId",
    label: "Host subscription payments",
  });
  await assertNoDuplicates({
    Model: SubscriptionPayment,
    field: "razorpayPaymentId",
    label: "Host subscription payments",
  });
  await assertNoDuplicates({
    Model: GuestMembershipPayment,
    field: "razorpayOrderId",
    label: "Guest Premium payments",
  });
  await assertNoDuplicates({
    Model: GuestMembershipPayment,
    field: "razorpayPaymentId",
    label: "Guest Premium payments",
  });

  const dedupedNotifications = await dedupeNotifications();
  console.log(`Archived ${dedupedNotifications} duplicate notification(s).`);

  await dropConflictingIndex({
    Model: Payment,
    key: { razorpayOrderId: 1 },
  });
  await dropConflictingIndex({
    Model: Payment,
    key: { razorpayPaymentId: 1 },
  });
  await dropConflictingIndex({
    Model: SubscriptionPayment,
    key: { razorpayOrderId: 1 },
  });
  await dropConflictingIndex({
    Model: SubscriptionPayment,
    key: { razorpayPaymentId: 1 },
  });
  await dropConflictingIndex({
    Model: GuestMembershipPayment,
    key: { razorpayOrderId: 1 },
  });
  await dropConflictingIndex({
    Model: GuestMembershipPayment,
    key: { razorpayPaymentId: 1 },
  });
  await dropConflictingIndex({
    Model: Notification,
    key: { recipient: 1, dedupeKey: 1 },
  });

  for (const Model of [
    OTP,
    Payment,
    SubscriptionPayment,
    GuestMembershipPayment,
    Notification,
    BookingLock,
  ]) {
    console.log(`Creating indexes for ${Model.modelName}...`);
    await Model.createIndexes();
  }

  console.log("Security database migration completed successfully.");
};

run()
  .catch((error) => {
    console.error("Security migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close(false).catch(() => null);
  });