import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiDroplet,
  FiGrid,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiEye,
  FiHome,
  FiMail,
  FiMapPin,
  FiRefreshCw,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";
import AdminActionModal from "../../components/owner/AdminActionModal";

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-orange-200 bg-orange-50 text-orange-700",
  removed: "border-red-200 bg-red-50 text-red-700",
  draft: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  inactive: "border-gray-200 bg-gray-100 text-gray-700",
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

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize ${
        STATUS_STYLES[status] || STATUS_STYLES.inactive
      }`}
    >
      {status}
    </span>
  );
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
          <Icon />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400">{label}</p>
          <p className="mt-1 font-black text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminListingDetails() {
  const { listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");

  const loadListing = useCallback(
    async (manualRefresh = false) => {
      try {
        manualRefresh ? setRefreshing(true) : setLoading(true);
        setError("");

        const response = await ownerService.getListingDetails(listingId);

        if (!response.success) {
          throw new Error(response.message || "Listing load nahi ho saki.");
        }

        setListing(response.data);
        setSelectedImage(0);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Listing details load nahi ho saki."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [listingId]
  );

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const images = useMemo(
    () => (listing?.images || []).map(getImageUrl).filter(Boolean),
    [listing]
  );

  const history = useMemo(() => {
    if (!listing) return [];

    const source = Array.isArray(listing.statusHistory)
      ? [...listing.statusHistory]
      : [];

    if (!source.length) {
      source.push({
        _id: "created",
        status: listing.status,
        action: "listing_created",
        reason: "Listing record created.",
        changedBy: listing.host,
        changedAt: listing.createdAt,
      });
    }

    return source.sort(
      (first, second) =>
        new Date(second.changedAt || 0).getTime() -
        new Date(first.changedAt || 0).getTime()
    );
  }, [listing]);

  const closeAction = () => {
    if (actionLoading) return;
    setAction(null);
    setReason("");
  };

  const confirmAction = async () => {
    if (!listing || !action) return;

    try {
      setActionLoading(true);
      setError("");

      let response;

      if (action === "approve") {
        response = await ownerService.approveListing(listing._id);
      } else if (action === "suspend") {
        response = await ownerService.suspendListing(listing._id, reason.trim());
      } else {
        response = await ownerService.removeListing(listing._id, reason.trim());
      }

      if (!response.success) {
        throw new Error(response.message || "Action complete nahi hua.");
      }

      setNotice(response.message);
      setAction(null);
      setReason("");
      await loadListing(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Listing action complete nahi ho saka."
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-sm font-semibold text-gray-500">Property review load ho raha hai...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <FiAlertTriangle className="mx-auto text-4xl text-red-500" />
          <h1 className="mt-4 text-2xl font-black text-gray-900">Listing not found</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Link to="/owner/listings" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white">
            <FiArrowLeft /> Back to Listings
          </Link>
        </div>
      </div>
    );
  }

  const status = listing.adminStatus || listing.status;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link to="/owner/listings" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900">
            <FiArrowLeft /> Back to Listing Management
          </Link>

          <button
            type="button"
            onClick={() => loadListing(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {notice && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px] lg:p-6">
            <div>
              <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100">
                {images[selectedImage] ? (
                  <img src={images[selectedImage]} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl text-gray-300"><FiHome /></div>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 ${selectedImage === index ? "border-purple-600" : "border-transparent"}`}
                    >
                      <img src={image} alt={`${listing.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={status} />
                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500"><FiEye /> {listing.views || 0}</span>
              </div>

              <h1 className="mt-4 text-2xl font-black leading-tight text-gray-900">{listing.title}</h1>
              <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-gray-500"><FiMapPin className="mt-1 shrink-0" /> {listing.location?.address}, {listing.location?.city}, {listing.location?.state}, {listing.location?.country}</p>
              <p className="mt-4 text-3xl font-black text-gray-900">{formatCurrency(listing.pricing?.pricePerNight)} <span className="text-sm font-semibold text-gray-400">/ night</span></p>

              <div className="mt-6 space-y-2">
                {status === "pending" && <button type="button" onClick={() => setAction("approve")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"><FiCheckCircle /> Approve Listing</button>}
                {!["suspended", "removed"].includes(status) && <button type="button" onClick={() => setAction("suspend")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100"><FiAlertTriangle /> Suspend Listing</button>}
                {status !== "removed" && <button type="button" onClick={() => setAction("remove")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100"><FiTrash2 /> Remove Listing</button>}
              </div>
            </aside>
          </div>
        </section>

        {(listing.moderation?.suspensionReason || listing.moderation?.removalReason) && (
          <section className={`mt-6 rounded-2xl border p-5 text-sm ${status === "removed" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <strong>{status === "removed" ? "Removal reason:" : "Suspension reason:"}</strong>{" "}
            {status === "removed" ? listing.moderation.removalReason : listing.moderation.suspensionReason}
          </section>
        )}

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <DetailCard icon={FiUsers} label="Guests" value={listing.guests || 0} />
          <DetailCard icon={FiHome} label="Bedrooms" value={listing.bedrooms || 0} />
          <DetailCard icon={FiGrid} label="Beds" value={listing.beds || 0} />
          <DetailCard icon={FiDroplet} label="Bathrooms" value={listing.bathrooms || 0} />
          <DetailCard icon={FiDollarSign} label="Cleaning Fee" value={formatCurrency(listing.pricing?.cleaningFee)} />
          <DetailCard icon={FiClock} label="Uploaded" value={formatDate(listing.createdAt)} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-gray-900">Property Description</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">{listing.description}</p>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-gray-900">Amenities</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.amenities?.length ? listing.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">{amenity}</span>) : <p className="text-sm text-gray-500">No amenities provided.</p>}
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-gray-900">Listing Status History</h2>
              <div className="mt-5 space-y-5">
                {history.map((item, index) => (
                  <div key={item._id || `${item.action}-${index}`} className="relative flex gap-3">
                    {index < history.length - 1 && <div className="absolute left-3 top-7 h-[calc(100%+0.75rem)] w-px bg-gray-200" />}
                    <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-purple-600 shadow" />
                    <div>
                      <p className="font-bold capitalize text-gray-900">{String(item.action || item.status).replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{item.reason || "Status updated."}</p>
                      <p className="mt-1 text-[11px] font-semibold text-gray-400">{formatDate(item.changedAt, true)} · {item.changedBy?.name || item.changedBy?.email || "System"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-gray-900">Host Profile</h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-purple-100 font-black text-purple-700">
                  {listing.host?.avatar ? <img src={typeof listing.host.avatar === "string" ? listing.host.avatar : listing.host.avatar?.url} alt={listing.host?.name} className="h-full w-full object-cover" /> : listing.host?.name?.charAt(0)?.toUpperCase() || "H"}
                </div>
                <div><p className="font-black text-gray-900">{listing.host?.name || "Unknown Host"}</p><p className="text-xs text-gray-500">Host since {formatDate(listing.host?.createdAt)}</p></div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><FiMail className="text-purple-600" /> {listing.host?.email || "—"}</p>
                <p className="flex items-center gap-2"><FiUser className="text-purple-600" /> Account: {listing.host?.status || "active"}</p>
              </div>
              {listing.host?._id && <Link to={`/owner/hosts/${listing.host._id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white">View Host Profile</Link>}
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-gray-900">Availability & Policy</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Available From</dt><dd className="font-bold text-gray-900">{formatDate(listing.availability?.availableFrom)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Available To</dt><dd className="font-bold text-gray-900">{formatDate(listing.availability?.availableTo)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Min Stay</dt><dd className="font-bold text-gray-900">{listing.policies?.minBookingDays || 1} nights</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Max Stay</dt><dd className="font-bold text-gray-900">{listing.policies?.maxBookingDays || 365} nights</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Cancellation</dt><dd className="font-bold capitalize text-gray-900">{listing.policies?.cancellationPolicy || "moderate"}</dd></div>
              </dl>
            </article>
          </aside>
        </section>
      </div>

      <AdminActionModal
        action={action}
        listing={listing}
        reason={reason}
        setReason={setReason}
        loading={actionLoading}
        onClose={closeAction}
        onConfirm={confirmAction}
      />
    </div>
  );
}