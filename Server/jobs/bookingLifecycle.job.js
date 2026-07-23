const Booking = require("../models/booking.model");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");

let timer = null;
const processBookingLifecycle = async () => {
  const now = new Date();
  const checkInWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const checkOutWindowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const checkIns = await Booking.find({ status: "confirmed", checkIn: { $gt: now, $lte: checkInWindowEnd }, "reminders.checkInSentAt": null, isDeleted: false });
  for (const booking of checkIns) {
    await createUserNotification({ recipient: booking.host, type: NOTIFICATION_TYPE.CHECKIN_REMINDER, title: "Guest check-in reminder", message: "A guest is checking in within the next 24 hours.", entityType: "Booking", entityId: booking._id, actionUrl: `/host/bookings/${booking._id}`, eventKey: `host-checkin-${booking._id}` });
    booking.reminders.checkInSentAt = now;
    await booking.save();
  }

  const checkOuts = await Booking.find({ status: "confirmed", checkOut: { $gt: now, $lte: checkOutWindowEnd }, "reminders.checkOutSentAt": null, isDeleted: false });
  for (const booking of checkOuts) {
    await createUserNotification({ recipient: booking.host, type: NOTIFICATION_TYPE.CHECKOUT_REMINDER, title: "Guest checkout reminder", message: "A guest is checking out within the next 3 hours.", entityType: "Booking", entityId: booking._id, actionUrl: `/host/bookings/${booking._id}`, eventKey: `host-checkout-${booking._id}` });
    booking.reminders.checkOutSentAt = now;
    await booking.save();
  }

  const completed = await Booking.find({ status: "confirmed", checkOut: { $lte: now }, isDeleted: false });
  for (const booking of completed) {
    booking.status = "completed";
    booking.history.push({ type: "auto_checkout", title: "Stay completed", description: "Booking automatically completed after checkout.", status: "completed", paymentStatus: booking.paymentStatus, changedAt: now });
    await createUserNotification({ recipient: booking.host, type: NOTIFICATION_TYPE.ROOM_AVAILABLE, title: "Property available again", message: "Checkout is complete and the property is now available for new dates.", entityType: "Booking", entityId: booking._id, actionUrl: "/host/availability", eventKey: `room-available-${booking._id}` });
    booking.reminders.roomAvailableSentAt = now;
    await booking.save();
  }
};

const startBookingLifecycleJob = () => {
  if (timer) return;
  processBookingLifecycle().catch(console.error);
  timer = setInterval(() => processBookingLifecycle().catch(console.error), 15 * 60 * 1000);
};
module.exports = { startBookingLifecycleJob, processBookingLifecycle };