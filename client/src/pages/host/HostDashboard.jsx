import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import userService from '../../services/user.service';
import listingService from '../../services/listing.service';

export default function HostDashboard() {
  const [stats, setStats] = useState({
    totalApartments: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    inactive: 0,
  });
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHostData();
  }, []);

  const fetchHostData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, listingsRes] = await Promise.all([
        userService.getHostStats(),
        listingService.getHostApartments(),
      ]);

      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
      if (listingsRes.data?.data) {
        setMyListings(listingsRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Dashboard data load nahi ho paya.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (id) => {
    if (window.confirm('Kya aap sach me is listing ko delete karna chahte hain?')) {
      try {
        await listingService.delete(id);
        fetchHostData();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete karne me issue aaya.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Host Dashboard 🗝️</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage your properties, edit listings, and view guest booking requests.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/host/booking-requests"
              className="flex-1 sm:flex-none text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm border border-gray-200 transition"
            >
              📋 Guest Bookings
            </Link>
            <Link
              to="/host/add-listing"
              className="flex-1 sm:flex-none text-center bg-[#FF385C] hover:bg-[#E00B41] text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              ➕ Add New Stay
            </Link>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin h-9 w-9 border-4 border-[#FF385C] border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Analytics Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Stays</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalApartments || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm bg-amber-50/30">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Approval</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-2">{stats.pending || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-emerald-50/30">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Approved / Active</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">{stats.approved || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm bg-rose-50/30">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Rejected</p>
                <p className="text-3xl font-extrabold text-rose-600 mt-2">{stats.rejected || 0}</p>
              </div>
            </div>

            {/* Listings Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Your Property Listings</h2>
                <span className="text-xs font-semibold text-gray-500">{myListings.length} Listed</span>
              </div>

              {myListings.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-gray-500 font-medium text-sm">Aapne abhi tak koi property add nahi ki hai.</p>
                  <Link
                    to="/host/add-listing"
                    className="inline-block mt-3 text-xs font-bold text-[#FF385C] underline"
                  >
                    Pehli Property Abhi Add Karein →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase border-b border-gray-100">
                        <th className="py-3.5 px-6">Property</th>
                        <th className="py-3.5 px-6">Type</th>
                        <th className="py-3.5 px-6">Price / Night</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                      {myListings.map((apt) => (
                        <tr key={apt._id} className="hover:bg-gray-50/50 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={apt.images && apt.images[0] ? apt.images[0].url : 'https://via.placeholder.com/150'}
                                alt={apt.title}
                                className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                              />
                              <div>
                                <p className="font-bold text-gray-900 line-clamp-1">{apt.title}</p>
                                <p className="text-xs text-gray-400">
                                  {apt.location?.city}, {apt.location?.state}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">{apt.propertyType}</td>
                          <td className="py-4 px-6 font-bold text-gray-900">₹{apt.pricing?.pricePerNight}</td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold capitalize ${
                                apt.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : apt.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {apt.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-3">
                            <Link
                              to={`/apartment/${apt._id}`}
                              className="text-gray-500 hover:text-gray-900 text-xs font-bold underline"
                            >
                              View
                            </Link>
                            <Link
                              to={`/host/edit-listing/${apt._id}`}
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold underline"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteListing(apt._id)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}