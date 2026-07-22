import React from "react";
import ListingCard from "../listing/ListingCard";

const FeaturedListings = ({ listings = [] }) => {
  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No properties found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((item) => (
        <ListingCard key={item._id || item.id} listing={item} />
      ))}
    </div>
  );
};

// ⚠️ YEH LINE MISSING HOGI - ISE ADD KARO
export default FeaturedListings;