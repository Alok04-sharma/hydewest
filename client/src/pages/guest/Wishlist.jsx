import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import wishlistService from "../../services/wishlist.service";
import ListingCard from "../../components/listing/ListingCard";
import GuestPageHeader from "../../components/guest/GuestPageHeader";

export default function Wishlist() {
  const [data, setData] = useState({ apartments: [], count: 0, limit: 30, unlimited: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => { try { setLoading(true); const response = await wishlistService.getWishlist(); setData(response.data || data); } catch (requestError) { setError(requestError.response?.data?.message || "Wishlist load nahi hui."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const remove = async (id) => { try { await wishlistService.removeFromWishlist(id); setData((current) => ({ ...current, apartments: current.apartments.filter((item) => item._id !== id), count: Math.max(current.count - 1, 0) })); } catch (requestError) { setError(requestError.response?.data?.message || "Property remove nahi hui."); } };
  return <div className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><GuestPageHeader eyebrow="Wishlist" title="Your saved stays" description={data.unlimited ? "Premium unlimited wishlist active hai." : `${data.count}/${data.limit || 30} free wishlist slots used.`} />{error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}{loading ? <div className="grid min-h-72 place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" /></div> : <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.apartments.map((item, index) => <motion.div key={item._id} className="relative"><ListingCard apartment={item} index={index} /><button onClick={() => remove(item._id)} className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black text-white shadow-lg">Remove</button></motion.div>)}</div>}{!loading && !data.apartments.length && <div className="mt-6 rounded-[30px] border border-dashed border-slate-300 bg-white py-20 text-center"><div className="text-5xl">❤️</div><h2 className="mt-4 text-lg font-black">Wishlist is empty</h2></div>}</div></div>;
}