import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { searchListingsThunk, setFilter } from '../../redux/slices/listingSlice';

export default function SearchBar() {
  const [city, setCityInput] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [guests, setGuests] = useState('');
  const dispatch = useDispatch();

  const handleSearch = (e) => {
    e.preventDefault();
    const query = {};
    if (city.trim()) query.city = city.trim();
    if (propertyType) query.propertyType = propertyType;
    if (guests) query.guests = guests;

    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 my-2 sm:my-4">
      <form
        onSubmit={handleSearch}
        className="bg-white p-3 sm:p-2.5 rounded-2xl md:rounded-full shadow-md hover:shadow-lg border border-gray-200 transition-all duration-300 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-0"
      >
        {/* City Location Filter */}
        <div className="flex-1 px-3 py-2 border-b md:border-b-0 md:border-r border-gray-100 md:border-gray-200">
          <label className="block text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-wider">
            Where
          </label>
          <input
            type="text"
            placeholder="Search destination (e.g. Goa, Delhi)"
            value={city}
            onChange={(e) => setCityInput(e.target.value)}
            className="w-full text-xs sm:text-sm focus:outline-none text-gray-800 placeholder-gray-400 bg-transparent mt-0.5"
          />
        </div>

        {/* Property Type Filter */}
        <div className="flex-1 px-3 py-2 border-b md:border-b-0 md:border-r border-gray-100 md:border-gray-200">
          <label className="block text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-wider">
            Property Type
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full text-xs sm:text-sm focus:outline-none text-gray-800 bg-transparent cursor-pointer mt-0.5 -ml-1 sm:ml-0"
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

        {/* Guests Filter */}
        <div className="flex-1 px-3 py-2">
          <label className="block text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-wider">
            Guests
          </label>
          <input
            type="number"
            min="1"
            placeholder="Add guests count"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-full text-xs sm:text-sm focus:outline-none text-gray-800 placeholder-gray-400 bg-transparent mt-0.5"
          />
        </div>

        {/* Search Action Button */}
        <button
          type="submit"
          className="bg-[#FF385C] hover:bg-[#E00B41] text-white py-3 md:py-3.5 px-6 rounded-xl md:rounded-full font-bold flex items-center justify-center transition-colors shadow-sm active:scale-95 text-sm gap-2"
        >
          <span>🔍</span>
          <span>Search</span>
        </button>
      </form>
    </div>
  );
}