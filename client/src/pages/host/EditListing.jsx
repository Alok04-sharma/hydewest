import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft } from "react-icons/fi";

import ListingWizard from "../../components/host/ListingWizard";
import listingService from "../../services/listing.service";

export default function EditListing() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadListing = async () => {
      try {
        setLoading(true);
        const response = await listingService.getMineById(id);
        if (!response.success) throw new Error(response.message || "Property load nahi hui.");
        if (active) setListing(response.data);
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Property load karne me error aaya."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadListing();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
        <p className="text-sm font-bold text-gray-500">Property editor load ho raha hai...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <FiAlertTriangle className="mx-auto text-4xl text-red-500" />
          <h1 className="mt-4 text-2xl font-black text-gray-900">Property unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Link
            to="/host/listings"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white"
          >
            <FiArrowLeft /> Back to listings
          </Link>
        </div>
      </div>
    );
  }

  return <ListingWizard mode="edit" listingId={id} initialData={listing} />;
}
