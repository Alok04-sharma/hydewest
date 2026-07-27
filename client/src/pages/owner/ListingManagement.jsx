import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiEye,
  FiHome,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiTrash2,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";
import AdminActionModal from "../../components/owner/AdminActionModal";

const EMPTY_RESULT = {
  listings: [],
  summary: {
    total: 0,
    pending: 0,
    approved: 0,
    suspended: 0,
    removed: 0,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-orange-200 bg-orange-50 text-orange-700",
  removed: "border-red-200 bg-red-50 text-red-700",
  draft: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  inactive: "border-gray-200 bg-gray-100 text-gray-700",
};

const PROPERTY_TYPES = [
  "",
  "Apartment",
  "House",
  "Villa",
  "Cabin",
  "Farm House",
  "Hotel",
  "Resort",
  "Hostel",
  "Guest House",
];

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getImageUrl = (listing) => {
  const firstImage = listing?.images?.[0];
  return typeof firstImage === "string" ? firstImage : firstImage?.url || "";
};

function StatusBadge({ status }) {
  const safeStatus = status || "pending";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${
        STATUS_STYLES[safeStatus] || STATUS_STYLES.inactive
      }`}
    >
      {safeStatus}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, style }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style}`}>
          <Icon />
        </div>
      </div>
    </article>
  );
}

export default function ListingManagement() {
  const [result, setResult] = useState(EMPTY_RESULT);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [propertyType, setPropertyType] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadListings = useCallback(
    async (manualRefresh = false) => {
      try {
        manualRefresh ? setRefreshing(true) : setLoading(true);
        setError("");

        const response = await ownerService.getListings({
          page,
          limit: 10,
          search: debouncedSearch,
          status,
          propertyType,
          sortBy,
        });

        if (!response.success) {
          throw new Error(response.message || "Listings could not be loaded.");
        }

        setResult(response.data || EMPTY_RESULT);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Listing Management data could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, page, propertyType, sortBy, status]
  );

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: `All (${result.summary.total})` },
      { value: "pending", label: `Pending (${result.summary.pending})` },
      { value: "approved", label: `Approved (${result.summary.approved})` },
      { value: "suspended", label: `Suspended (${result.summary.suspended})` },
      { value: "removed", label: `Removed (${result.summary.removed})` },
    ],
    [result.summary]
  );

  const openAction = (type, listing) => {
    setAction(type);
    setSelectedListing(listing);
    setReason("");
  };

  const closeAction = () => {
    if (actionLoading) return;
    setAction(null);
    setSelectedListing(null);
    setReason("");
  };

  const confirmAction = async () => {
    if (!action || !selectedListing) return;

    try {
      setActionLoading(true);
      setError("");

      let response;

      if (action === "approve") {
        response = await ownerService.approveListing(selectedListing._id);
      } else if (action === "suspend") {
        response = await ownerService.suspendListing(
          selectedListing._id,
          reason.trim()
        );
      } else {
        response = await ownerService.removeListing(
          selectedListing._id,
          reason.trim()
        );
      }

      if (!response.success) {
        throw new Error(response.message || "The listing action could not be completed.");
      }

      setNotice(response.message);
      closeAction();
      await loadListings(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "The listing action could not be completed."
      );
    } finally {
      setActionLoading(false);
      setAction(null);
      setSelectedListing(null);
      setReason("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
              <FiShield /> Super Admin Module
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Listing Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Review Host properties, open images and details, approve new listings, and suspend or remove listings that violate platform policies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadListings(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {notice && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => loadListings(true)} className="underline">
              Retry
            </button>
          </div>
        )}

        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="All Listings" value={result.summary.total} icon={FiHome} style="bg-purple-100 text-purple-700" />
          <SummaryCard title="Pending" value={result.summary.pending} icon={FiRefreshCw} style="bg-amber-100 text-amber-700" />
          <SummaryCard title="Approved" value={result.summary.approved} icon={FiCheckCircle} style="bg-emerald-100 text-emerald-700" />
          <SummaryCard title="Suspended" value={result.summary.suspended} icon={FiSlash} style="bg-orange-100 text-orange-700" />
          <SummaryCard title="Removed" value={result.summary.removed} icon={FiTrash2} style="bg-red-100 text-red-700" />
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search title, host, city or address..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={propertyType}
              onChange={(event) => {
                setPropertyType(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type || "all"} value={type}>
                  {type || "All Property Types"}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_low">Price Low-High</option>
              <option value="price_high">Price High-Low</option>
              <option value="most_viewed">Most Viewed</option>
              <option value="most_booked">Most Booked</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-500">Loading listings...</p>
            </div>
          ) : result.listings.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-2xl text-gray-500">
                <FiHome />
              </div>
              <h2 className="mt-4 text-xl font-black text-gray-900">No listings found</h2>
              <p className="mt-2 text-sm text-gray-500">Change the search or filters and try again.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">Property</th>
                      <th className="px-5 py-4 font-bold">Host</th>
                      <th className="px-5 py-4 font-bold">Status</th>
                      <th className="px-5 py-4 font-bold">Price</th>
                      <th className="px-5 py-4 font-bold">Uploaded</th>
                      <th className="px-5 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {result.listings.map((listing) => (
                      <tr key={listing._id} className="transition hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                              {getImageUrl(listing) ? (
                                <img src={getImageUrl(listing)} alt={listing.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-gray-400"><FiHome /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-64 truncate font-black text-gray-900">{listing.title}</p>
                              <p className="mt-1 truncate text-xs text-gray-500">
                                {listing.location?.city}, {listing.location?.state} · {listing.propertyType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-800">{listing.host?.name || "Unknown Host"}</p>
                          <p className="text-xs text-gray-400">{listing.host?.email}</p>
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={listing.adminStatus} /></td>
                        <td className="px-5 py-4 font-black text-gray-900">{formatCurrency(listing.pricing?.pricePerNight)}<span className="text-xs font-medium text-gray-400"> /night</span></td>
                        <td className="px-5 py-4 text-gray-500">{formatDate(listing.createdAt)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link to={`/owner/listings/${listing._id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"><FiEye /> View</Link>
                            {listing.adminStatus === "pending" && <button type="button" onClick={() => openAction("approve", listing)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Approve</button>}
                            {!["suspended", "removed"].includes(listing.adminStatus) && <button type="button" onClick={() => openAction("suspend", listing)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">Suspend</button>}
                            {listing.adminStatus !== "removed" && <button type="button" onClick={() => openAction("remove", listing)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"><FiTrash2 /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:hidden">
                {result.listings.map((listing) => (
                  <article key={listing._id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="h-44 bg-gray-100">
                      {getImageUrl(listing) ? <img src={getImageUrl(listing)} alt={listing.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl text-gray-400"><FiHome /></div>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3"><h2 className="line-clamp-2 font-black text-gray-900">{listing.title}</h2><StatusBadge status={listing.adminStatus} /></div>
                      <p className="mt-2 text-xs text-gray-500">{listing.location?.city}, {listing.location?.state}</p>
                      <p className="mt-1 text-xs text-gray-400">Host: {listing.host?.name || "Unknown"}</p>
                      <p className="mt-3 font-black text-gray-900">{formatCurrency(listing.pricing?.pricePerNight)} <span className="text-xs font-medium text-gray-400">/night</span></p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link to={`/owner/listings/${listing._id}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2.5 text-xs font-bold text-white"><FiEye /> Details</Link>
                        {listing.adminStatus === "pending" && <button type="button" onClick={() => openAction("approve", listing)} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white">Approve</button>}
                        {!["suspended", "removed"].includes(listing.adminStatus) && <button type="button" onClick={() => openAction("suspend", listing)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">Suspend</button>}
                        {listing.adminStatus !== "removed" && <button type="button" onClick={() => openAction("remove", listing)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700"><FiTrash2 /></button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {!loading && result.listings.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row">
              <p className="text-xs font-semibold text-gray-500">
                Page {result.pagination.page} of {result.pagination.totalPages} · {result.pagination.total} matching listings
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={!result.pagination.hasPreviousPage} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">Previous</button>
                <button type="button" disabled={!result.pagination.hasNextPage} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <AdminActionModal
        action={action}
        listing={selectedListing}
        reason={reason}
        setReason={setReason}
        loading={actionLoading}
        onClose={closeAction}
        onConfirm={confirmAction}
      />
    </div>
  );
 }