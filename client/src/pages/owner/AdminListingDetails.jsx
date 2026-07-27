import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiDroplet,
  FiEye,
  FiGrid,
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

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getMediaUrl = (item) =>
  typeof item === "string" ? item : item?.url || "";

const getVideoPoster = (video) =>
  typeof video === "string" ? "" : video?.thumbnailUrl || "";

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
    <div className="flex min-h-[104px] items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex w-full items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-950 sm:text-base">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminListingDetails() {
  const { listingId } = useParams();
  const galleryRef = useRef(null);

  const [listing, setListing] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(0);
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
          throw new Error(response.message || "Listing could not be loaded.");
        }

        setListing(response.data);
        setSelectedMedia(0);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Listing details could not be loaded."
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

  const mediaItems = useMemo(() => {
    const images = (listing?.images || [])
      .map((image, index) => ({
        type: "image",
        url: getMediaUrl(image),
        label: `Image ${index + 1}`,
      }))
      .filter((item) => item.url);

    const videos = (listing?.videos || [])
      .map((video, index) => ({
        type: "video",
        url: getMediaUrl(video),
        poster: getVideoPoster(video),
        label: `Video ${index + 1}`,
      }))
      .filter((item) => item.url);

    return [...images, ...videos];
  }, [listing]);

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

  const scrollToImage = useCallback(
    (index) => {
      if (!galleryRef.current || !mediaItems.length) return;

      const safeIndex = Math.min(Math.max(index, 0), mediaItems.length - 1);
      galleryRef.current.scrollTo({
        left: galleryRef.current.clientWidth * safeIndex,
        behavior: "smooth",
      });
      setSelectedMedia(safeIndex);
    },
    [mediaItems.length]
  );

  const handleGalleryScroll = useCallback(() => {
    if (!galleryRef.current || !mediaItems.length) return;

    const index = Math.round(
      galleryRef.current.scrollLeft / Math.max(galleryRef.current.clientWidth, 1)
    );

    setSelectedMedia(Math.min(Math.max(index, 0), mediaItems.length - 1));
  }, [mediaItems.length]);

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
        throw new Error(response.message || "Action could not be completed.");
      }

      setNotice(response.message);
      setAction(null);
      setReason("");
      await loadListing(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Listing action could not be completed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">
          Loading property review...
        </p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <FiAlertTriangle className="mx-auto text-4xl text-red-500" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Listing not found
          </h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            to="/owner/listings"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <FiArrowLeft />
            Back to Listings
          </Link>
        </div>
      </div>
    );
  }

  const status = listing.adminStatus || listing.status;
  const price =
    listing.pricing?.basePrice || listing.pricing?.pricePerNight || 0;
  const priceUnit = listing.pricing?.priceUnit || "night";
  const address = [
    listing.location?.address,
    listing.location?.area,
    listing.location?.city,
    listing.location?.state,
    listing.location?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0_0,rgba(124,58,237,.08),transparent_28rem),#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            to="/owner/listings"
            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-950"
          >
            <FiArrowLeft />
            Back to Listing Management
          </Link>

          <button
            type="button"
            onClick={() => loadListing(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <article className="min-w-0 overflow-hidden rounded-[30px] border border-slate-200 bg-white p-3 shadow-[0_20px_65px_rgba(15,23,42,.09)] sm:p-5">
            <div className="relative overflow-hidden rounded-[24px] bg-slate-100">
              {mediaItems.length ? (
                <>
                  <div
                    ref={galleryRef}
                    onScroll={handleGalleryScroll}
                    className="no-scrollbar flex aspect-[16/9] snap-x snap-mandatory overflow-x-auto scroll-smooth"
                  >
                    {mediaItems.map((media, index) => (
                      <figure
                        key={`${media.type}-${media.url}-${index}`}
                        className="relative min-w-full snap-center overflow-hidden"
                      >
                        {media.type === "video" ? (
                          <video
                            src={media.url}
                            poster={media.poster || undefined}
                            controls
                            playsInline
                            preload="metadata"
                            className="h-full w-full bg-slate-950 object-contain"
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={`${listing.title} ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/65 to-transparent p-4 pt-14 text-white">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/65">
                            Property media
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {media.type === "video" ? "Video" : "Image"} {index + 1} of {mediaItems.length}
                          </p>
                        </div>
                      </figure>
                    ))}
                  </div>

                  {mediaItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollToImage(selectedMedia - 1)}
                        disabled={selectedMedia === 0}
                        className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl bg-white/90 text-slate-900 shadow-lg backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Previous media"
                      >
                        <FiChevronLeft />
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollToImage(selectedMedia + 1)}
                        disabled={selectedMedia === mediaItems.length - 1}
                        className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl bg-white/90 text-slate-900 shadow-lg backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Next media"
                      >
                        <FiChevronRight />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="grid aspect-[16/9] place-items-center text-center text-slate-300">
                  <div>
                    <FiHome className="mx-auto text-6xl" />
                    <p className="mt-3 text-sm font-bold text-slate-400">
                      No property media uploaded
                    </p>
                  </div>
                </div>
              )}
            </div>

            {mediaItems.length > 1 && (
              <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
                {mediaItems.map((media, index) => (
                  <button
                    key={`${media.type}-${media.url}-thumbnail-${index}`}
                    type="button"
                    onClick={() => scrollToImage(index)}
                    className={`h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 transition sm:h-24 sm:w-36 ${
                      selectedMedia === index
                        ? "border-violet-600 ring-4 ring-violet-100"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {media.type === "video" ? (
                      <div className="relative h-full w-full bg-slate-950">
                        <video
                          src={media.url}
                          poster={media.poster || undefined}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 grid place-items-center text-2xl text-white">▶</span>
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={`${listing.title} thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </article>

          <aside className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-slate-50 p-5 shadow-[0_20px_65px_rgba(76,29,149,.10)] xl:sticky xl:top-6">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={status} />
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                <FiEye />
                {listing.views || 0}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-black leading-tight text-slate-950">
              {listing.title}
            </h1>

            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
              <FiMapPin className="mt-1 shrink-0 text-violet-600" />
              {address || "Address not provided"}
            </p>

            <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">
                Base price
              </p>
              <p className="mt-1 text-3xl font-black text-slate-950">
                {formatCurrency(price)}
                <span className="ml-2 text-sm font-semibold text-slate-400">
                  / {priceUnit}
                </span>
              </p>
            </div>

            <div className="mt-5 space-y-2.5">
              {status === "pending" && (
                <button
                  type="button"
                  onClick={() => setAction("approve")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <FiCheckCircle />
                  Approve Listing
                </button>
              )}

              {!['suspended', 'removed'].includes(status) && (
                <button
                  type="button"
                  onClick={() => setAction("suspend")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100"
                >
                  <FiAlertTriangle />
                  Suspend Listing
                </button>
              )}

              {status !== "removed" && (
                <button
                  type="button"
                  onClick={() => setAction("remove")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
                >
                  <FiTrash2 />
                  Remove Listing
                </button>
              )}
            </div>
          </aside>
        </section>

        {(listing.moderation?.suspensionReason ||
          listing.moderation?.removalReason) && (
          <section
            className={`mt-6 rounded-2xl border p-5 text-sm ${
              status === "removed"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <strong>
              {status === "removed" ? "Removal reason:" : "Suspension reason:"}
            </strong>{" "}
            {status === "removed"
              ? listing.moderation.removalReason
              : listing.moderation.suspensionReason}
          </section>
        )}

        <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <DetailCard icon={FiUsers} label="Guests" value={listing.guests || 0} />
          <DetailCard
            icon={FiHome}
            label="Bedrooms"
            value={listing.bedrooms || 0}
          />
          <DetailCard icon={FiGrid} label="Beds" value={listing.beds || 0} />
          <DetailCard
            icon={FiDroplet}
            label="Bathrooms"
            value={listing.bathrooms || 0}
          />
          <DetailCard
            icon={FiDollarSign}
            label="Cleaning Fee"
            value={formatCurrency(listing.pricing?.cleaningFee)}
          />
          <DetailCard
            icon={FiClock}
            label="Uploaded"
            value={formatDate(listing.createdAt)}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-950">
                Property Description
              </h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                {listing.description || "No description provided."}
              </p>
            </article>

            <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-950">Amenities</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.amenities?.length ? (
                  listing.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"
                    >
                      {amenity}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No amenities provided.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">Host policy review</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Host Rules</h2>
                </div>
                <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                  {listing.houseRules?.length || 0} rules
                </span>
              </div>

              {listing.houseRules?.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {listing.houseRules.map((rule, index) => (
                    <div
                      key={`${rule}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-black text-violet-700">
                        {index + 1}
                      </span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No Host rules were provided.</p>
              )}
            </article>

            <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-950">
                Listing Status History
              </h2>
              <div className="mt-5 space-y-5">
                {history.map((item, index) => (
                  <div
                    key={item._id || `${item.action}-${index}`}
                    className="relative flex gap-3"
                  >
                    {index < history.length - 1 && (
                      <div className="absolute left-3 top-7 h-[calc(100%+0.75rem)] w-px bg-slate-200" />
                    )}
                    <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-violet-600 shadow" />
                    <div>
                      <p className="font-bold capitalize text-slate-950">
                        {String(item.action || item.status).replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.reason || "Status updated."}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {formatDate(item.changedAt, true)} ·{" "}
                        {item.changedBy?.name ||
                          item.changedBy?.email ||
                          "System"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">Host Profile</h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-violet-100 font-black text-violet-700">
                  {listing.host?.avatar ? (
                    <img
                      src={
                        typeof listing.host.avatar === "string"
                          ? listing.host.avatar
                          : listing.host.avatar?.url
                      }
                      alt={listing.host?.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    listing.host?.name?.charAt(0)?.toUpperCase() || "H"
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">
                    {listing.host?.name || "Unknown Host"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Host since {formatDate(listing.host?.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="flex items-center gap-2 break-all">
                  <FiMail className="shrink-0 text-violet-600" />
                  {listing.host?.email || "—"}
                </p>
                <p className="flex items-center gap-2">
                  <FiUser className="text-violet-600" />
                  Account: {listing.host?.status || "active"}
                </p>
              </div>

              {listing.host?._id && (
                <Link
                  to={`/owner/hosts/${listing.host._id}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  View Host Profile
                </Link>
              )}
            </article>

            <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Availability & Policy
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Available From</dt>
                  <dd className="text-right font-bold text-slate-950">
                    {formatDate(listing.availability?.availableFrom)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Available To</dt>
                  <dd className="text-right font-bold text-slate-950">
                    {formatDate(listing.availability?.availableTo)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Min Stay</dt>
                  <dd className="font-bold text-slate-950">
                    {listing.policies?.minBookingDays ||
                      listing.minimumBookingDays ||
                      1}{" "}
                    days
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Max Stay</dt>
                  <dd className="font-bold text-slate-950">
                    {listing.policies?.maxBookingDays || 365} days
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Cancellation</dt>
                  <dd className="font-bold capitalize text-slate-950">
                    {listing.policies?.cancellationPolicy || "moderate"}
                  </dd>
                </div>
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
