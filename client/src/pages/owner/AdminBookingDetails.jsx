import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiUser,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-blue-200 bg-blue-50 text-blue-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const PAYMENT_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  refunded: "border-purple-200 bg-purple-50 text-purple-700",
};

const formatDate = (value, withTime = false) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getImageUrl = (image) =>
  typeof image === "string" ? image : image?.url || "";

function Badge({ value, styles }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize ${
        styles[value] || styles.pending
      }`}
    >
      {value}
    </span>
  );
}

function PersonCard({ title, person, accent = "purple" }) {
  const accentClasses =
    accent === "pink"
      ? "bg-pink-100 text-pink-700"
      : "bg-purple-100 text-purple-700";

  const avatar =
    typeof person?.avatar === "string"
      ? person.avatar
      : person?.avatar?.url || "";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">{title}</h2>
      <div className="mt-4 flex items-center gap-3">
        <div
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full font-black ${accentClasses}`}
        >
          {avatar ? (
            <img src={avatar} alt={person?.name || title} className="h-full w-full object-cover" />
          ) : (
            person?.name?.charAt(0)?.toUpperCase() || "U"
          )}
        </div>
        <div>
          <p className="font-black text-gray-900">{person?.name || "Unknown User"}</p>
          <p className="text-xs capitalize text-gray-500">{person?.role || title}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <p className="flex items-center gap-2"><FiMail className="text-purple-600" /> {person?.email || "—"}</p>
        <p className="flex items-center gap-2"><FiPhone className="text-purple-600" /> {person?.phone || "Not provided"}</p>
      </div>
    </article>
  );
}

function PriceRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-gray-200 pt-4 text-base font-black text-gray-900" : "text-sm text-gray-600"}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

export default function AdminBookingDetails() {
  const { bookingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBooking = useCallback(
    async (manualRefresh = false) => {
      try {
        manualRefresh ? setRefreshing(true) : setLoading(true);
        setError("");

        const response = await ownerService.getBookingDetails(bookingId);

        if (!response.success) {
          throw new Error(response.message || "Booking load nahi ho saki.");
        }

        setData(response.data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Booking details load nahi ho saki."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId]
  );

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const history = useMemo(() => data?.history || [], [data]);

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-sm font-semibold text-gray-500">Booking details load ho rahi hain...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <FiAlertTriangle className="mx-auto text-4xl text-red-500" />
          <h1 className="mt-4 text-2xl font-black text-gray-900">Booking not found</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Link to="/owner/bookings" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white">
            <FiArrowLeft /> Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const { booking, payments } = data;
  const propertyImage = getImageUrl(booking.apartment?.images?.[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link to="/owner/bookings" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900">
            <FiArrowLeft /> Back to Booking Monitoring
          </Link>

          <button
            type="button"
            onClick={() => loadBooking(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[360px_1fr]">
            <div className="min-h-72 bg-gray-100">
              {propertyImage ? (
                <img src={propertyImage} alt={booking.apartment?.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-72 items-center justify-center text-5xl text-gray-300"><FiHome /></div>
              )}
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={booking.status} styles={STATUS_STYLES} />
                <Badge value={booking.paymentStatus} styles={PAYMENT_STYLES} />
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900">
                {booking.apartment?.title || "Property unavailable"}
              </h1>
              <p className="mt-2 flex items-start gap-2 text-sm text-gray-500"><FiMapPin className="mt-1 shrink-0" /> {booking.apartment?.location?.address}, {booking.apartment?.location?.city}, {booking.apartment?.location?.state}</p>

              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div><p className="text-xs font-semibold text-gray-400">Booking ID</p><p className="mt-1 break-all font-mono text-xs font-bold text-gray-800">{booking._id}</p></div>
                <div><p className="text-xs font-semibold text-gray-400">Created</p><p className="mt-1 font-bold text-gray-800">{formatDate(booking.createdAt, true)}</p></div>
                <div><p className="text-xs font-semibold text-gray-400">Guests</p><p className="mt-1 font-bold text-gray-800">{booking.guestsCount || 0}</p></div>
                <div><p className="text-xs font-semibold text-gray-400">Nights</p><p className="mt-1 font-bold text-gray-800">{booking.pricing?.totalNights || 0}</p></div>
              </div>
            </div>
          </div>
        </section>

        {booking.status === "cancelled" && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <div className="flex gap-3"><FiXCircle className="mt-1 shrink-0" /><div><p className="font-black">Booking Cancelled</p><p className="mt-1">{booking.cancellation?.reason || "No cancellation reason provided."}</p><p className="mt-1 text-xs text-red-600">Cancelled {formatDate(booking.cancellation?.cancelledAt, true)} by {booking.cancellation?.cancelledBy?.name || booking.cancellation?.cancelledBy?.email || "User"}</p></div></div>
          </section>
        )}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900"><FiCalendar className="text-purple-600" /> Stay Information</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs font-semibold text-gray-400">Check-in</p><p className="mt-2 text-lg font-black text-gray-900">{formatDate(booking.checkIn)}</p></div>
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-xs font-semibold text-gray-400">Check-out</p><p className="mt-2 text-lg font-black text-gray-900">{formatDate(booking.checkOut)}</p></div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-200 p-4 text-sm text-gray-600"><FiUsers className="text-purple-600" /> {booking.guestsCount || 0} guests · {booking.pricing?.totalNights || 0} nights</div>
            {booking.message && <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50 p-4"><p className="text-xs font-bold text-purple-700">Guest Message</p><p className="mt-2 text-sm leading-6 text-gray-700">{booking.message}</p></div>}
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900"><FiDollarSign className="text-purple-600" /> Price Breakdown</h2>
            <div className="mt-5 space-y-4">
              <PriceRow label={`${formatCurrency(booking.pricing?.pricePerNight)} × ${booking.pricing?.totalNights || 0} nights`} value={booking.pricing?.subtotal} />
              <PriceRow label="Cleaning Fee" value={booking.pricing?.cleaningFee} />
              <PriceRow label="Service Fee" value={booking.pricing?.serviceFee} />
              <PriceRow label="Total Amount" value={booking.pricing?.totalAmount} strong />
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <PersonCard title="Guest Details" person={booking.guest} />
          <PersonCard title="Host Details" person={booking.host} accent="pink" />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900"><FiClock className="text-purple-600" /> Booking History</h2>
            <p className="mt-1 text-xs text-gray-500">Booking creation, payment, confirmation aur cancellation events.</p>

            <div className="mt-6 space-y-5">
              {history.map((item, index) => (
                <div key={item._id || `${item.type}-${index}`} className="relative flex gap-3">
                  {index < history.length - 1 && <div className="absolute left-3 top-7 h-[calc(100%+0.75rem)] w-px bg-gray-200" />}
                  <div className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white shadow ${item.status === "cancelled" || item.paymentStatus === "failed" ? "bg-red-500" : item.paymentStatus === "paid" || item.status === "confirmed" ? "bg-emerald-500" : "bg-purple-600"}`} />
                  <div className="min-w-0"><p className="font-black text-gray-900">{item.title || String(item.type).replaceAll("_", " ")}</p><p className="mt-1 text-xs leading-5 text-gray-500">{item.description || "Status updated."}</p><p className="mt-1 text-[11px] font-semibold text-gray-400">{formatDate(item.changedAt, true)} · {item.changedBy?.name || item.changedBy?.email || "System"}</p></div>
                </div>
              ))}
            </div>
          </article>

          <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900"><FiCreditCard className="text-purple-600" /> Payment Records</h2>
            <div className="mt-5 space-y-4">
              {payments?.length ? payments.map((payment) => (
                <div key={payment._id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-black text-gray-900">{formatCurrency(payment.amount)}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${payment.status === "success" ? "bg-emerald-50 text-emerald-700" : payment.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{payment.status}</span></div>
                  <dl className="mt-3 space-y-2 text-xs"><div><dt className="text-gray-400">Razorpay Order</dt><dd className="mt-1 break-all font-mono text-gray-700">{payment.razorpayOrderId}</dd></div><div><dt className="text-gray-400">Payment ID</dt><dd className="mt-1 break-all font-mono text-gray-700">{payment.razorpayPaymentId || "—"}</dd></div><div><dt className="text-gray-400">Paid At</dt><dd className="mt-1 font-semibold text-gray-700">{formatDate(payment.paidAt, true)}</dd></div></dl>
                </div>
              )) : <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">No payment record available.</div>}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}