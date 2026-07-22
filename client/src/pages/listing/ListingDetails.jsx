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
      }${apartment.location.country ? ', ' + apartment.location.country : ''}`
    : 'Location Not Provided';

  const price = apartment.pricing?.pricePerNight || 0;
  const currencySymbol = apartment.pricing?.currency === 'INR' ? '₹' : '$';

  return (
    <Link
      to={`/apartment/${apartment._id}`}
      className="group cursor-pointer flex flex-col space-y-3"
    >
      {/* Property Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-200">
        <img
          src={mainImage}
          alt={apartment.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
        />
        {apartment.isFeatured && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 shadow-sm">
            Featured
          </span>
        )}
      </div>

      {/* Property Details */}
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900 truncate text-base">
            {locationText}
          </h3>
          <div className="flex items-center space-x-1 text-sm text-gray-800">
            <span>★</span>
            <span className="font-semibold">
              {apartment.rating > 0 ? apartment.rating.toFixed(1) : 'New'}
            </span>
          </div>
        </div>

        <p className="text-gray-500 text-sm truncate">{apartment.title}</p>
        <p className="text-gray-500 text-xs">
          {apartment.guests || 1} Guests · {apartment.bedrooms || 1} Bedrooms ·{' '}
          {apartment.propertyType || 'Property'}
        </p>

        <div className="pt-1">
          <span className="font-extrabold text-gray-900 text-base">
            {currencySymbol}
            {price}
          </span>
          <span className="text-gray-500 text-sm"> / night</span>
        </div>
      </div>
    </Link>
  );
}