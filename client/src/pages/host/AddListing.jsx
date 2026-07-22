import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import listingService from '../../services/listing.service';

const AMENITIES_OPTIONS = [
  'Wifi', 'Air Conditioning', 'Free Parking', 'Swimming Pool', 
  'Kitchen', 'Washing Machine', 'TV', 'Balcony', 'EV Charger'
];

export default function AddListing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

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
    zipCode: '400001',
    latitude: 28.6139,
    longitude: 77.2090,
    pricePerNight: 2000,
    cleaningFee: 300,
    serviceFee: 150,
    currency: 'INR',
    availableFrom: new Date().toISOString().split('T')[0],
    availableTo: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    timezone: 'Asia/Kolkata',
  });

  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

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

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImageFiles(filesArray);
      if (filesArray.length < 3) {
        setError('Kripya kam se kam 3 photos select karein.');
      } else {
        setError(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // STRICT VALIDATION: Minimum 3 Photos required
    if (imageFiles.length < 3) {
      setError('⚠️ Kripya property ki kam se kam 3 photos select karein!');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('propertyType', formData.propertyType);
      payload.append('guests', Number(formData.guests));
      payload.append('bedrooms', Number(formData.bedrooms));
      payload.append('beds', Number(formData.beds));
      payload.append('bathrooms', Number(formData.bathrooms));
      payload.append('timezone', formData.timezone);

      // Location fields
      payload.append('location[address]', formData.address);
      payload.append('location[city]', formData.city);
      payload.append('location[state]', formData.state);
      payload.append('location[country]', formData.country);
      payload.append('location[zipCode]', formData.zipCode);
      payload.append('location[latitude]', Number(formData.latitude));
      payload.append('location[longitude]', Number(formData.longitude));

      // Pricing fields
      payload.append('pricing[pricePerNight]', Number(formData.pricePerNight));
      payload.append('pricing[cleaningFee]', Number(formData.cleaningFee));
      payload.append('pricing[serviceFee]', Number(formData.serviceFee));
      payload.append('pricing[currency]', formData.currency);

      // Dates
      payload.append('availability[availableFrom]', formData.availableFrom);
      payload.append('availability[availableTo]', formData.availableTo);

      // Amenities
      selectedAmenities.forEach((amenity) => {
        payload.append('amenities[]', amenity);
      });

      // Images (All selected files)
      imageFiles.forEach((file) => {
        payload.append('images', file);
      });

      await listingService.create(payload);

      // Display Exciting Inline Screen Banner instead of browser alert popup
      setShowSuccessBanner(true);

      // Auto redirect to Host Dashboard after 2 seconds
      setTimeout(() => {
        navigate('/host/dashboard');
      }, 2200);

    } catch (err) {
      setError(err.response?.data?.message || 'Property create karne mein error aaya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-gray-100 relative">
        
        {/* EXCITING SCREEN BANNER (REPLACES LOCALHOST POPUP) */}
        {showSuccessBanner && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg animate-bounce">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">
                  Woohoo! Your {formData.propertyType} is now listed!
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100 mt-0.5 font-medium">
                  Property standard review ke liye Owner Approval Queue me bhej di gayi hai. Redirecting to Dashboard...
                </p>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Host a New Property 🏡</h1>
        <p className="text-xs sm:text-sm text-gray-500 mb-8">
          Apne apartment, villa ya room ka detail bharein taaki guests book kar sakein.
        </p>

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
                maxLength={100}
                name="title"
                placeholder="e.g. Luxurious Sea View Villa in South Goa"
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Description (Min 50 chars)</label>
              <textarea
                required
                minLength={50}
                rows={4}
                name="description"
                placeholder="Describe your property, location advantages, nearby attractions..."
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
                placeholder="Flat No, Building, Street Name"
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
                  placeholder="e.g. Panaji"
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
                  placeholder="e.g. Goa"
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

          {/* Section 5: Image Uploads (Min 3 photos rule) */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-base font-bold text-gray-800">5. Property Images</h2>
              <span className="text-xs font-extrabold text-[#FF385C] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                Min 3 Photos Required
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Select at least 3 high-quality image files from your device.
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-2 border border-dashed border-gray-300 rounded-xl cursor-pointer text-xs bg-gray-50"
            />
            {imageFiles.length > 0 && (
              <p className={`text-xs font-bold ${imageFiles.length >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {imageFiles.length} File(s) selected {imageFiles.length < 3 && '(Need at least 3)'}
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={loading || showSuccessBanner}
              className="w-full py-4 bg-[#FF385C] hover:bg-[#E00B41] text-white font-bold rounded-2xl shadow-lg transition active:scale-98 disabled:opacity-50 text-base"
            >
              {loading ? 'Uploading Images & Creating Stay...' : 'Submit Stay for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}