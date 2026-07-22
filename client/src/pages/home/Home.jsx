import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllListings, searchListingsThunk, setFilter } from '../../redux/slices/listingSlice';
import ListingCard from '../../components/listing/ListingCard.jsx';
import SearchBar from '../../components/home/SearchBar.jsx';

// Mobile horizontal category options
const CATEGORIES = [
  { name: 'All Stays', icon: '🏡', value: '' },
  { name: 'Apartment', icon: '🏢', value: 'Apartment' },
  { name: 'Villa', icon: '🏰', value: 'Villa' },
  { name: 'House', icon: '🏠', value: 'House' },
  { name: 'Cabin', icon: '🛖', value: 'Cabin' },
  { name: 'Farm House', icon: '🌾', value: 'Farm House' },
  { name: 'Hotel', icon: '🏨', value: 'Hotel' },
  { name: 'Resort', icon: '🏖️', value: 'Resort' },
];

export default function Home() {
  const dispatch = useDispatch();
  const { listings, loading, error } = useSelector((state) => state.listing);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    dispatch(fetchAllListings());
  }, [dispatch]);

  const handleCategorySelect = (typeValue) => {
    setSelectedCategory(typeValue);
    const query = typeValue ? { propertyType: typeValue } : {};
    dispatch(setFilter(query));
    dispatch(searchListingsThunk(query));
  };

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-12">
      {/* Sticky Header: Search Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-16 sm:top-20 z-40 py-1 shadow-sm">
        <SearchBar />

        {/* Mobile Horizontal Category Filter Bar */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar px-4 py-2 border-t border-gray-100 max-w-7xl mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategorySelect(cat.value)}
              className={`flex flex-col items-center gap-1 shrink-0 pb-1.5 transition-all border-b-2 text-xs font-bold ${
                selectedCategory === cat.value
                  ? 'border-black text-black scale-105'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="text-xl sm:text-2xl">{cat.icon}</span>
              <span className="whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-24 space-y-3">
            <div className="animate-spin h-9 w-9 border-4 border-[#FF385C] border-t-transparent rounded-full"></div>
            <span className="text-gray-600 font-medium text-xs sm:text-sm">
              Finding stays...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-center my-8 text-xs sm:text-sm font-medium">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && (
          <div className="text-center py-16 px-4 bg-gray-50 rounded-3xl border border-gray-100 max-w-md mx-auto my-8">
            <div className="text-4xl mb-3">🏖️</div>
            <p className="text-lg font-bold text-gray-900">No properties found</p>
            <p className="text-gray-500 mt-1 text-xs sm:text-sm">
              Try choosing another category or clearing search filters.
            </p>
          </div>
        )}

        {/* Dynamic Mobile First Grid Layout */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-7 gap-x-5">
            {listings.map((item) => (
              <ListingCard key={item._id} apartment={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}