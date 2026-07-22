import React from 'react';
import { Link } from 'react-router-dom';

export default function ListingCard({ apartment }) {
  if (!apartment) return null;

  const mainImage =
    apartment.images && apartment.images.length > 0
      ? apartment.images[0].url
      : 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80';

  const locationText = apartment.location
    ? `${apartment.location.city || ''}${
        apartment.location.state ? ', ' + apartment.location.state : ''
      }`
    : 'Location Not Provided';

  const price = apartment.pricing?.pricePerNight || 0;
  const currencySymbol = apartment.pricing?.currency === 'INR' ? '₹' : '$';

  return (
    <Link
      to={`/apartment/${apartment._id}`}
      className="group cursor-pointer flex flex-col space-y-2.5 w-full active:scale-[0.98] transition-transform duration-200"
    >
      {/* Mobile App Aspect Ratio Image */}
      <div className="relative aspect-[4/3] sm:aspect-square w-full overflow-hidden rounded-2xl bg-gray-200 shadow-sm border border-gray-100">
        <img
          src={mainImage}
          alt={apartment.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
        />

        {/* Favorite Heart Badge Overlay */}
        <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white text-sm">
          🤍
        </div>

        {apartment.isFeatured && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-gray-900 shadow-sm">
            ★ Featured
          </span>
        )}
      </div>

      {/* Property Details */}
      <div className="flex flex-col space-y-0.5 px-1">
        <div className="flex justify-between items-center gap-2">
          <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">
            {locationText}
          </h3>
          <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-900 shrink-0 font-semibold">
            <span className="text-xs text-black">★</span>
            <span>{apartment.rating > 0 ? apartment.rating.toFixed(1) : 'New'}</span>
          </div>
        </div>

        <p className="text-gray-500 text-xs sm:text-sm truncate">
          {apartment.title}
        </p>
        <p className="text-gray-400 text-xs truncate">
          {apartment.guests || 1} guests · {apartment.bedrooms || 1} bedrooms
        </p>

        <div className="pt-1 flex items-baseline gap-1">
          <span className="font-extrabold text-gray-900 text-base">
            {currencySymbol}
            {price.toLocaleString()}
          </span>
          <span className="text-gray-500 text-xs font-normal"> night</span>
        </div>
      </div>
    </Link>
  );
}