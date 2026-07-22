import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchHostApartmentsThunk } from '../../redux/slices/apartmentSlice';

export default function MyListings() {
  const dispatch = useDispatch();
  const { hostApartments, hostLoading, error } = useSelector(
    (state) => state.apartments || {}
  );

  useEffect(() => {
    dispatch(fetchHostApartmentsThunk());
  }, [dispatch]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            🟢 Approved & Live
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            ⏳ Pending Admin Review
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            ⚪ {status || 'Draft'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-3 py-1 rounded-full">
              Host Dashboard
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">
              My Listed Properties
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your stays, view approval status, or list new places.
            </p>
          </div>

          <Link
            to="/host/listings/new"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all"
          >
            + Add New Listing
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {hostLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : hostApartments.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-white dark:bg-gray-800/80 rounded-3xl border border-gray-200 dark:border-gray-700 p-8">
            <span className="text-5xl">🏡</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-4">
              No Listings Found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              You haven't added any properties to StayNest yet. Start hosting today to earn!
            </p>
            <Link
              to="/host/listings/new"
              className="mt-6 inline-block px-6 py-3 bg-rose-500 text-white font-bold text-sm rounded-2xl shadow-md"
            >
              List Your First Place 🚀
            </Link>
          </div>
        ) : (
          /* Property Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostApartments.map((item) => {
              const coverImg =
                item.images?.[0]?.url ||
                'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800';

              return (
                <div
                  key={item._id}
                  className="bg-white dark:bg-gray-800/80 rounded-3xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-900">
                    <img
                      src={coverImg}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                        {item.propertyType} • {item.location?.city}, {item.location?.state}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-400">Price / night</span>
                        <div className="text-base font-extrabold text-gray-900 dark:text-white">
                          ₹{item.pricing?.pricePerNight}
                        </div>
                      </div>

                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        👥 {item.guests} Guests • 🛏️ {item.bedrooms} Bed
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}