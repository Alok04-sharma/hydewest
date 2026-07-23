import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiEdit2,
  FiEye,
  FiHome,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import listingService from "../../services/listing.service";

const STATUS_STYLE = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  rejected: "bg-orange-50 text-orange-700 border-orange-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-blue-50 text-blue-700 border-blue-200",
};

const priceLabel = (listing) => {
  const price = Number(
    listing.pricing?.basePrice || listing.pricing?.pricePerNight || 0
  ).toLocaleString("en-IN");
  return `₹${price} / ${listing.pricing?.priceUnit || "night"}`;
};

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const loadListings = useCallback(async (manual = false) => {
    try {
      manual ? setRefreshing(true) : setLoading(true);
      setError("");
      const response = await listingService.getMine();
      if (!response.success) throw new Error(response.message || "Listings load nahi hui.");
      setListings(response.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Listings load karne me error aaya."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesStatus = status === "all" || listing.status === status;
      const matchesSearch =
        !keyword ||
        String(listing.title || "").toLowerCase().includes(keyword) ||
        String(listing.location?.city || "").toLowerCase().includes(keyword) ||
        String(listing.propertyType || "").toLowerCase().includes(keyword);
      return matchesStatus && matchesSearch;
    });
  }, [listings, search, status]);

  const counts = useMemo(
    () =>
      listings.reduce(
        (result, listing) => {
          result.total += 1;
          result[listing.status] = (result[listing.status] || 0) + 1;
          return result;
        },
        { total: 0, approved: 0, pending: 0, suspended: 0 }
      ),
    [listings]
  );

  const handleDelete = async (listing) => {
    const confirmed = window.confirm(
      `“${listing.title}” ko remove karna hai? Historical bookings safe rahengi.`
    );
    if (!confirmed) return;

    try {
      const response = await listingService.remove(listing._id);
      if (!response.success) throw new Error(response.message || "Delete failed.");
      setListings((previous) => previous.filter((item) => item._id !== listing._id));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Property delete nahi ho saki."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF385C]">Host workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">My properties</h1>
            <p className="mt-2 text-sm text-gray-500">Create, edit and monitor every StayNest listing from one place.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadListings(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <Link
              to="/host/add-listing"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF385C] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#E31C5F]"
            >
              <FiPlus /> Add property
            </Link>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Total", counts.total, "bg-purple-100 text-purple-700"],
            ["Active", counts.approved, "bg-emerald-100 text-emerald-700"],
            ["Pending", counts.pending, "bg-amber-100 text-amber-700"],
            ["Suspended", counts.suspended, "bg-red-100 text-red-700"],
          ].map(([label, value, style]) => (
            <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style}`}><FiHome /></div>
              <p className="mt-4 text-3xl font-black text-gray-950">{value}</p>
              <p className="text-sm font-semibold text-gray-500">{label} listings</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, city or property type..."
              className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#FF385C] focus:ring-4 focus:ring-rose-100"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#FF385C]"
          >
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
            <option value="inactive">Inactive</option>
          </select>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        <section className="mt-6">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center rounded-3xl border border-gray-200 bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <FiHome className="mx-auto text-4xl text-gray-400" />
              <h2 className="mt-4 text-xl font-black text-gray-900">No properties found</h2>
              <p className="mt-2 text-sm text-gray-500">Filters change karein ya apni pehli property add karein.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((listing) => (
                <article key={listing._id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative">
                    <img
                      src={listing.images?.[0]?.url}
                      alt={listing.title}
                      className="aspect-[16/10] w-full bg-gray-100 object-cover"
                    />
                    <span className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-black capitalize ${STATUS_STYLE[listing.status] || STATUS_STYLE.inactive}`}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-gray-950">{listing.title}</h2>
                        <p className="mt-1 text-sm text-gray-500">{listing.location?.city}, {listing.location?.state}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-gray-950">{priceLabel(listing)}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-semibold text-gray-500">
                      <span>{listing.propertyType}</span><span>{listing.views || 0} views</span><span>{listing.bookingCount || 0} bookings</span>
                    </div>
                    {listing.status === "suspended" && listing.moderation?.suspensionReason && (
                      <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700">{listing.moderation.suspensionReason}</div>
                    )}
                    <div className="mt-5 flex gap-2">
                      {listing.status === "approved" && (
                        <Link to={`/apartment/${listing._id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-50"><FiEye /> View</Link>
                      )}
                      {listing.status !== "suspended" && (
                        <Link to={`/host/edit-listing/${listing._id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-xs font-black text-white hover:bg-[#FF385C]"><FiEdit2 /> Edit</Link>
                      )}
                      <button type="button" onClick={() => handleDelete(listing)} className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-red-600 hover:bg-red-100"><FiTrash2 /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
