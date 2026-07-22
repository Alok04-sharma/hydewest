import React, { useEffect, useState } from 'react';
import bookingService from '../../services/booking.service';

export default function BookingRequests() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHostBookings();
  }, []);

  const fetchHostBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingService.getHostBookings();
      if (res.data?.data) {
        setBookings(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Booking requests load karne me error aaya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Guest Booking Requests 📋</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              View reservations and guest stay details for your hosted properties.
            </p>
          </div>
          <span className="bg-rose-50 text-[#FF385C] font-extrabold px-4 py-2 rounded-full text-xs">
            {bookings.length} Total Reservations
          </span>
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

        {/* Bookings Table / Empty State */}
        {!loading && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {bookings.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-lg font-bold text-gray-800">Koi Booking Request Nahi Hai</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Jab guests aapki properties book karenge, unki details yahan dikhengi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase border-b border-gray-100">
                      <th className="py-3.5 px-6">Property / Guest</th>
                      <th className="py-3.5 px-6">Check In - Check Out</th>
                      <th className="py-3.5 px-6">Guests</th>
                      <th className="py-3.5 px-6">Total Amount</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                    {bookings.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-gray-900 line-clamp-1">
                              {item.apartment?.title || 'Property'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Guest: {item.guest?.name || item.guest?.email || 'Registered Guest'}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs font-semibold">
                          <div>
                            <span className="text-emerald-600">IN:</span> {new Date(item.checkIn).toLocaleDateString()}
                          </div>
                          <div className="mt-0.5">
                            <span className="text-rose-600">OUT:</span> {new Date(item.checkOut).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">{item.guestsCount || 1} Guests</td>
                        <td className="py-4 px-6 font-extrabold text-gray-900">
                          ₹{item.totalAmount?.toLocaleString() || 0}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
                              item.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}