import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import listingService from '../../services/listing.service';

const AMENITIES_OPTIONS = [
  'Wifi', 'Air Conditioning', 'Free Parking', 'Swimming Pool', 
  'Kitchen', 'Washing Machine', 'TV', 'Balcony', 'EV Charger'
];

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'Apartment',
    guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    address: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
    latitude: 28.6139,
    longitude: 77.2090,
    pricePerNight: 2000,
    cleaningFee: 300,
    serviceFee: 150,
    currency: 'INR',
  });

  const [selectedAmenities, setSelectedAmenities] = useState([]);

  useEffect(() => {
    if (id) {
      loadApartmentData();
    }
  }, [id]);

  const loadApartmentData = async () => {
    try {
      setFetching(true);
      setError(null);
      const res = await listingService.getById(id);
      const data = res.data?.data;

      if (data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          propertyType: data.propertyType || 'Apartment',
          guests: data.guests || 1,
          bedrooms: data.bedrooms || 1,
          beds: data.beds || 1,
          bathrooms: data.bathrooms || 1,
          address: data.location?.address || '',
          city: data.location?.city || '',
          state: data.location?.state || '',
          country: data.location?.country || 'India',
          zipCode: data.location?.zipCode || '110001',
          latitude: data.location?.latitude || 28.6139,
          longitude: data.location?.longitude || 77.2090,
          pricePerNight: data.pricing?.pricePerNight || 0,
          cleaningFee: data.pricing?.cleaningFee || 0,
          serviceFee: data.pricing?.serviceFee || 0,
          currency: data.pricing?.currency || 'INR',
        });
        setSelectedAmenities(data.amenities || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Apartment details fetch nahi ho saki.');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmenityToggle = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Payload with complete location fields (latitude/longitude included)
      const payload = {
        title: formData.title,
        description: formData.description,
        propertyType: formData.propertyType,
        guests: Number(formData.guests),
        bedrooms: Number(formData.bedrooms),
        beds: Number(formData.beds),
        bathrooms: Number(formData.bathrooms),
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          zipCode: formData.zipCode,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
        },
        pricing: {
          pricePerNight: Number(formData.pricePerNight),
          cleaningFee: Number(formData.cleaningFee),
          serviceFee: Number(formData.serviceFee),
          currency: formData.currency,
        },
        amenities: selectedAmenities,
      };

      await listingService.update(id, payload);
      setSuccessMessage('✨ Perfect! Aapki listing ki details successfully update ho gayi hain!');
      setTimeout(() => {
        navigate('/host/dashboard');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Listing update karne me error aaya.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-9 w-9 border-4 border-[#FF385C] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-gray-100 relative">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Edit Property Listing ✏️</h1>
          <button
            onClick={() => navigate('/host/dashboard')}
            className="text-xs font-bold text-gray-500 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Screen Success Banner */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fade-in shadow-sm">
            <span className="text-xl">🎉</span>
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          {/* Section 1: Basic Details */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 border-b pb-2">1. Basic Details</h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Property Title</label>
              <input
                type="text"
                required
                minLength={10}
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Property Type</label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-white"
                >
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                  <option value="Villa">Villa</option>
                  <option value="Cabin">Cabin</option>
                  <option value="Farm House">Farm House</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Resort">Resort</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Max Guests</label>
                <input
                  type="number"
                  min="1"
                  name="guests"
                  value={formData.guests}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  min="1"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Beds</label>
                <input
                  type="number"
                  min="1"
                  name="beds"
                  value={formData.beds}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  min="1"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
              <textarea
                required
                minLength={50}
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>
          </div>

          {/* Section 2: Location */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-800 border-b pb-2">2. Location Details</h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                required
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  required
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  required
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-800 border-b pb-2">3. Pricing (INR ₹)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Price Per Night (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  name="pricePerNight"
                  value={formData.pricePerNight}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cleaning Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  name="cleaningFee"
                  value={formData.cleaningFee}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Service Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  name="serviceFee"
                  value={formData.serviceFee}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Amenities */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-base font-bold text-gray-800 border-b pb-2">4. Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITIES_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => handleAmenityToggle(item)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    selectedAmenities.includes(item)
                      ? 'border-[#FF385C] bg-rose-50 text-[#FF385C]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{item}</span>
                  {selectedAmenities.includes(item) && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Save Action */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#FF385C] hover:bg-[#E00B41] text-white font-bold rounded-2xl shadow-lg transition active:scale-98 disabled:opacity-50 text-base"
            >
              {loading ? 'Saving Changes...' : 'Save Updated Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}