import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ownerService from "../../services/owner.service";

const number = (value) => Number(value || 0).toLocaleString("en-GB");

function DemandTable({ title, rows, keyName }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5"><h2 className="text-lg font-black text-slate-950">{title}</h2></div>
      <div className="overflow-x-auto"><table className="min-w-[720px] text-left text-sm"><thead><tr className="text-[10px] font-black uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Location</th><th className="px-5 py-3">Searches</th><th className="px-5 py-3">Listings</th><th className="px-5 py-3">Bookings</th><th className="px-5 py-3">Unique users</th></tr></thead><tbody>{rows.map((row)=><tr key={row.key} className="border-t border-slate-100"><td className="px-5 py-4 font-black text-slate-900">{row[keyName] || "—"}</td><td className="px-5 py-4 font-black text-violet-700">{number(row.searchCount)}</td><td className="px-5 py-4">{number(row.availableListings)}</td><td className="px-5 py-4">{number(row.totalBookings)}</td><td className="px-5 py-4">{number(row.uniqueSearchers)}</td></tr>)}</tbody></table></div>
    </section>
  );
}

export default function SearchAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { let active=true; ownerService.getSearchAnalytics().then((response)=>{if(active)setData(response.data||{});}).catch((requestError)=>{if(active)setError(requestError.response?.data?.message||"Search analytics could not be loaded.");}).finally(()=>{if(active)setLoading(false);}); return()=>{active=false;}; }, []);
  const summary = data?.summary || {};
  const cards = useMemo(()=>[
    ["Total Searches", summary.totalSearches, "🔍"],
    ["Tracked Search Groups", summary.trackedSearchRows, "📊"],
    ["Logged-in Guests", summary.loggedInGuests, "👤"],
    ["Demand Recommendations", data?.recommendations?.length || 0, "🎯"],
  ],[data,summary]);

  if (loading) return <div className="grid min-h-[70vh] place-items-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" /></div>;
  return <div className="min-h-screen bg-gradient-to-br from-[#faf7ff] to-[#f5efff] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><header><p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-700">Search Analytics</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-5xl">Where guests want more stays.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">MongoDB aggregation combines search demand with available listings and completed paid bookings. No external maps or geocoding APIs are used.</p></header>{error&&<p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p>}<section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,icon])=><motion.article key={label} whileHover={{y:-4}} className="rounded-[26px] border border-violet-200 bg-white p-5 shadow-sm"><span className="text-2xl">{icon}</span><p className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><strong className="mt-2 block text-3xl font-black text-slate-950">{number(value)}</strong></motion.article>)}</section>{data?.recommendations?.length>0&&<section className="mt-6 rounded-[30px] border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 sm:p-7"><h2 className="text-xl font-black text-slate-950">Admin Recommendations</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.recommendations.map((row)=><article key={`${row.locationType}-${row.location}`} className="rounded-2xl border border-amber-200 bg-white/80 p-4"><div className="flex items-center justify-between gap-3"><strong className="text-slate-950">{row.location}</strong><span className="rounded-full bg-amber-200 px-2 py-1 text-[9px] font-black uppercase text-amber-900">{row.locationType}</span></div><p className="mt-2 text-sm font-black text-orange-700">High Search Demand - Need More Hosts</p><p className="mt-2 text-xs text-slate-500">{number(row.searchCount)} searches · {number(row.availableListings)} listings · {number(row.totalBookings)} bookings</p></article>)}</div></section>}<div className="mt-7 grid gap-6"><DemandTable title="Most Searched Cities" rows={data?.mostSearchedCities||[]} keyName="city"/><DemandTable title="Most Searched Areas" rows={data?.mostSearchedAreas||[]} keyName="area"/><DemandTable title="Most Searched PIN Codes" rows={data?.mostSearchedPinCodes||[]} keyName="pinCode"/></div></div></div>;
}
