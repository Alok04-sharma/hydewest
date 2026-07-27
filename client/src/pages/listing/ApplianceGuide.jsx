import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import listingService from "../../services/listing.service";

const applianceIcon = (name = "") => {
  const key = name.toLowerCase();
  if (key.includes("air") || key === "ac") return "❄️";
  if (key.includes("tv") || key.includes("television")) return "📺";
  if (key.includes("microwave")) return "♨️";
  if (key.includes("washing")) return "🧺";
  if (key.includes("dishwasher")) return "🍽️";
  return "🔌";
};

export default function ApplianceGuide() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listingService
      .getPublicById(id)
      .then((response) => active && setListing(response.data || response))
      .catch(
        (requestError) =>
          active &&
          setError(
            requestError.response?.data?.message ||
              "Appliance guide could not be loaded."
          )
      );
    return () => {
      active = false;
    };
  }, [id]);

  const guides = useMemo(
    () =>
      Array.isArray(listing?.applianceGuide)
        ? listing.applianceGuide.filter(
            (item) => item?.appliance && item?.instructions
          )
        : [],
    [listing]
  );

  if (error) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-6">
        <p className="rounded-3xl bg-red-50 p-6 font-bold text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_0,rgba(124,58,237,.12),transparent_28rem),#f8fafc] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          to={`/apartment/${id}`}
          className="text-xs font-black text-violet-700"
        >
          ← Back to property
        </Link>

        <header className="mt-4 rounded-[32px] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-7 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">
            In-stay help
          </p>
          <h1 className="mt-2 text-3xl font-black">Appliance Guide</h1>
          <p className="mt-2 text-sm text-white/60">
            Simple Host instructions for {listing.title}.
          </p>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {guides.map((guide, index) => (
            <motion.article
              key={guide._id || `${guide.appliance}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-lg"
            >
              <span className="text-3xl">
                {applianceIcon(guide.appliance)}
              </span>
              <h2 className="mt-3 text-xl font-black text-slate-950">
                {guide.appliance}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                {guide.instructions}
              </p>
            </motion.article>
          ))}

          {guides.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center md:col-span-2">
              <p className="text-3xl">🔌</p>
              <h2 className="mt-3 text-xl font-black">
                No appliance instructions yet
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                The Host has not added special operating instructions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}