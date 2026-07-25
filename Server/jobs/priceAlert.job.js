const PriceAlert = require("../models/priceAlert.model");
const NOTIFICATION_TYPE = require("../constants/notificationType");
const { createUserNotification } = require("../services/notification.service");

let timer = null;

const processPriceAlerts = async () => {
  const alerts = await PriceAlert.find({
    isActive: true,
    isDeleted: false,
  }).populate({
    path: "apartment",
    select: "title pricing status isDeleted",
  });

  for (const alert of alerts) {
    const apartment = alert.apartment;

    if (!apartment || apartment.isDeleted || apartment.status !== "approved") {
      continue;
    }

    const currentPrice = Number(
      apartment.pricing?.basePrice ||
        apartment.pricing?.pricePerNight ||
        0
    );

    const targetReached =
      currentPrice > 0 &&
      currentPrice <= Number(alert.targetPrice || 0);

    const isNewLowerPrice =
      alert.lastNotifiedPrice === null ||
      alert.lastNotifiedPrice === undefined ||
      currentPrice < Number(alert.lastNotifiedPrice);

    if (targetReached && isNewLowerPrice) {
      await createUserNotification({
        recipient: alert.guest,
        type: NOTIFICATION_TYPE.PRICE_DROP_ALERT,
        title: "Price drop on a saved property",
        message: `${apartment.title} is now available from INR ${currentPrice.toLocaleString("en-IN")}.`,
        entityType: "Apartment",
        entityId: apartment._id,
        actionUrl: `/apartment/${apartment._id}`,
        eventKey: `price-drop:${alert._id}:${currentPrice}`,
        metadata: {
          priceAlertId: alert._id,
          targetPrice: alert.targetPrice,
          currentPrice,
        },
      });

      alert.lastNotifiedAt = new Date();
      alert.lastNotifiedPrice = currentPrice;
    }

    alert.lastSeenPrice = currentPrice;
    await alert.save();
  }
};

const startPriceAlertJob = () => {
  if (timer) {
    return;
  }

  processPriceAlerts().catch((error) => {
    console.error("Price alert job failed:", error);
  });

  timer = setInterval(() => {
    processPriceAlerts().catch((error) => {
      console.error("Price alert job failed:", error);
    });
  }, 6 * 60 * 60 * 1000);
};

module.exports = {
  processPriceAlerts,
  startPriceAlertJob,
};