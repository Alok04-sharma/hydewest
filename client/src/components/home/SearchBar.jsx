import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { searchListingsThunk, setFilter } from '../../redux/slices/listingSlice';

export default function SearchBar() {
  const [city, setCityInput] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [guests, setGuests] = useState('');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const dispatch = useDispatch();

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const query = {};
    if (city.trim()) query.city = city.trim();
    if (propertyType) query.propertyType = propertyType;
    if (guests) query.guests = guests;

    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));
    setIsMobileModalOpen(false);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* MOBILE APP FLOATING SEARCH TRIGGER (Visible on Mobile)    */}
      {/* ========================================================= */}
      <div className="block md:hidden px-4 py-2">
        <button
          onClick={() => setIsMobileModalOpen(true)}
          className="w-full bg-white border border-gray-200 shadow-md hover:shadow-lg rounded-full px-4 py-3 flex items-center justify-between transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl text-[#FF385C]">🔍</span>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900">
                {city.trim() ? city : 'Where to?'}
              </p>
              <p className="text-[11px] text-gray-500 font-medium">
                {propertyType ? propertyType : 'Anywhere'} · {guests ? `${guests} Guests` : 'Add guests'}
              </p>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-600">
            ⚙️
          </div>
        </button>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP HORIZONTAL PILL SEARCH BAR (Visible on Web/Tablet) */}
      {/* ========================================================= */}
      <div className="hidden md:block w-full max-w-4xl mx-auto px-4 my-2">
        <form
          onSubmit={handleSearch}
          className="bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 flex items-center"
        >
          <div className="flex-1 px-5 py-1.5 border-r border-gray-200">
            <label className="block text-[10px] font-bold text-gray-800 uppercase tracking-wider">
              Where
            </label>
            <input
              type="text"
              placeholder="Search destination (e.g. Goa, Delhi)"
              value={city}
              onChange={(e) => setCityInput(e.target.value)}
              className="w-full text-sm focus:outline-none text-gray-800 placeholder-gray-400 bg-transparent font-medium"
            />
          </div>

          <div className="flex-1 px-5 py-1.5 border-r border-gray-200">
            <label className="block text-[10px] font-bold text-gray-800 uppercase tracking-wider">
              Type
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full text-sm focus:outline-none text-gray-800 bg-transparent cursor-pointer font-medium -ml-1"
            >
              <option value="">Any Type</option>
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Villa">Villa</option>
              <option value="Cabin">Cabin</option>
              <option value="Farm House">Farm House</option>
              <option value="Hotel">Hotel</option>
              <option value="Resort">Resort</option>
            </select>
          </div>

          <div className="flex-1 px-5 py-1.5">
            <label className="block text-[10px] font-bold text-gray-800 uppercase tracking-wider">
              Guests
            </label>
            <input
              type="number"
              min="1"
              placeholder="Add guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full text-sm focus:outline-none text-gray-800 placeholder-gray-400 bg-transparent font-medium"
            />
          </div>

          <button
            type="submit"
            className="bg-[#FF385C] hover:bg-[#E00B41] text-white h-12 w-12 rounded-full font-bold flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
          >
            🔍
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* MOBILE SEARCH OVERLAY / MODAL (App-like Bottom Drawer)   */}
      {/* ========================================================= */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end md:hidden animate-fade-in">
          <div className="bg-white rounded-t-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto border-t border-gray-100 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900">Search Stays</h3>
              <button
                onClick={() => setIsMobileModalOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Mobile Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Where
                </label>
                <input
                  type="text"
                  placeholder="Where are you going? (e.g. Goa)"
                  value={city}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C] bg-white"
                >
                  <option value="">Any Type</option>
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
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Guests Count
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Number of guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                />
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCityInput('');
                  setPropertyType('');
                  setGuests('');
                }}
                className="text-sm font-semibold text-gray-600 underline px-2 py-2"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleSearch}
                className="flex-1 bg-[#FF385C] text-white py-3.5 rounded-xl font-bold text-sm shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🔍</span> Search Stays
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}