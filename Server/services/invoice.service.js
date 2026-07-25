const PDFDocument = require("pdfkit");

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
    timeZone: "Asia/Kolkata",
  });
};

const formatMoney = (amount, currency = "INR") =>
  `${currency || "INR"} ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const buildPdf = ({ title, subtitle, invoiceNumber, payer, payment, rows, totals, footer }) =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 48,
      info: { Title: `${title} ${invoiceNumber}`, Author: "StayNest", Subject: subtitle },
    });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const width = document.page.width - 96;
    document.roundedRect(48, 42, width, 92, 18).fill("#fff1f2");
    document.fillColor("#ff385c").font("Helvetica-Bold").fontSize(27).text("StayNest", 70, 66);
    document.fillColor("#475569").font("Helvetica").fontSize(10).text(subtitle, 70, 100);
    document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text(title.toUpperCase(), 360, 63, { width: 160, align: "right" });
    document.fillColor("#64748b").font("Helvetica").fontSize(9).text(invoiceNumber, 350, 96, { width: 170, align: "right" });

    let y = 164;
    document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("BILLED TO", 48, y);
    document.font("Helvetica").fontSize(10).fillColor("#334155").text(payer?.name || "StayNest member", 48, y + 20).text(payer?.email || "Email not available", 48, y + 36);
    document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("PAYMENT DETAILS", 320, y);
    document.font("Helvetica").fontSize(9.5).fillColor("#334155")
      .text(`Paid on: ${formatDate(payment.paidAt || payment.createdAt, true)}`, 320, y + 20)
      .text(`Payment ID: ${payment.razorpayPaymentId || "Not available"}`, 320, y + 36)
      .text(`Order ID: ${payment.razorpayOrderId || "Not available"}`, 320, y + 52);

    y = 260;
    document.roundedRect(48, y, width, 36, 10).fill("#0f172a");
    document.fillColor("#fff").font("Helvetica-Bold").fontSize(10).text("Description", 66, y + 13).text("Details", 315, y + 13).text("Amount", 440, y + 13, { width: 80, align: "right" });
    let rowY = y + 54;
    rows.forEach((row) => {
      document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10.5).text(row.label, 66, rowY, { width: 230 });
      document.fillColor("#64748b").font("Helvetica").fontSize(9).text(row.description || "", 315, rowY, { width: 115 });
      document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10.5).text(formatMoney(row.amount, payment.currency), 440, rowY, { width: 80, align: "right" });
      rowY += 34;
    });

    document.moveTo(48, rowY + 4).lineTo(document.page.width - 48, rowY + 4).strokeColor("#e2e8f0").stroke();
    let totalY = rowY + 28;
    totals.forEach((total, index) => {
      document.fillColor(total.highlight ? "#ff385c" : "#64748b").font(total.highlight ? "Helvetica-Bold" : "Helvetica").fontSize(total.highlight ? 12 : 9.5)
        .text(total.label, 330, totalY + index * 24)
        .text(formatMoney(total.amount, payment.currency), 430, totalY + index * 24, { width: 90, align: "right" });
    });

    const footerY = Math.min(totalY + totals.length * 24 + 42, 690);
    document.roundedRect(48, footerY, width, 72, 14).fill("#f8fafc");
    document.fillColor("#334155").font("Helvetica-Bold").fontSize(10).text("Thank you for choosing StayNest.", 66, footerY + 20);
    document.fillColor("#64748b").font("Helvetica").fontSize(9).text(footer, 66, footerY + 40, { width: width - 36 });
    document.fillColor("#94a3b8").font("Helvetica").fontSize(8).text("StayNest Platform | Computer-generated document", 48, 760, { width, align: "center" });
    document.end();
  });

const createSubscriptionInvoiceBuffer = ({ payment, subscription, payer }) =>
  buildPdf({
    title: "Invoice",
    subtitle: "Subscription payment invoice",
    invoiceNumber: payment.invoiceNumber || `SN-${payment._id}`,
    payer,
    payment,
    rows: [{
      label: subscription?.planName || payment.planName || payment.planCode || "Subscription plan",
      description: `${formatDate(subscription?.startDate || payment.coverageStart)} - ${formatDate(subscription?.expiryDate || payment.coverageEnd)}`,
      amount: payment.amount,
    }],
    totals: [{ label: "Total paid", amount: payment.amount, highlight: true }],
    footer: "Keep this invoice for your subscription payment records.",
  });

const createBookingReceiptBuffer = ({ payment, booking, apartment, payer }) => {
  const pricing = booking.pricing || {};
  const rows = [
    { label: `${apartment?.title || "Property booking"}`, description: `${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`, amount: pricing.subtotal || 0 },
    { label: "Cleaning and service charges", description: `${pricing.totalNights || pricing.unitCount || 1} stay units`, amount: Number(pricing.cleaningFee || 0) + Number(pricing.serviceFee || 0) + Number(pricing.extraGuestCharge || 0) },
  ];
  if (pricing.discountAmount) rows.push({ label: "Host coupon discount", description: pricing.couponCode || "Offer", amount: -Number(pricing.discountAmount) });
  if (pricing.premiumDiscountAmount) rows.push({ label: "Premium member discount", description: "Platform benefit", amount: -Number(pricing.premiumDiscountAmount) });
  if (pricing.loyaltyDiscountAmount) rows.push({ label: "Loyalty points discount", description: `${pricing.loyaltyPointsUsed || 0} points`, amount: -Number(pricing.loyaltyDiscountAmount) });

  return buildPdf({
    title: "Receipt",
    subtitle: "Guest booking payment receipt",
    invoiceNumber: payment.invoiceNumber || `SN-BKG-${payment._id}`,
    payer,
    payment,
    rows,
    totals: [{ label: "Total paid", amount: payment.amount, highlight: true }],
    footer: "This receipt confirms successful payment. Booking rules and cancellation policy continue to apply.",
  });
};

module.exports = { createSubscriptionInvoiceBuffer, createBookingReceiptBuffer };