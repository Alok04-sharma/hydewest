import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function Sidebar({ type = 'guest' }) {
  const location = useLocation();

  const navs = {
    guest: [
      { label: 'Dashboard', path: ROUTES.GUEST_DASHBOARD },
      { label: 'My Trips', path: ROUTES.TRIPS },
      { label: 'Wishlist', path: ROUTES.WISHLIST },
      { label: 'Profile', path: ROUTES.GUEST_PROFILE },
    ],
    host: [
      { label: 'Overview', path: ROUTES.HOST_DASHBOARD },
      { label: 'My Listings', path: ROUTES.HOST_LISTINGS },
      { label: 'Add Listing', path: ROUTES.ADD_LISTING },
      { label: 'Booking Requests', path: ROUTES.HOST_REQUESTS },
      { label: 'Earnings', path: ROUTES.HOST_EARNINGS },
    ],
    owner: [
      { label: 'Overview', path: ROUTES.OWNER_DASHBOARD },
      { label: 'Approve Listings', path: ROUTES.OWNER_LISTINGS },
      { label: 'All Users', path: ROUTES.OWNER_USERS },
      { label: 'Analytics', path: ROUTES.OWNER_ANALYTICS },
    ],
  };

  const currentNav = navs[type] || [];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
        {type} Menu
      </h3>
      <ul className="space-y-1">
        {currentNav.map((nav) => {
          const isActive = location.pathname === nav.path;
          return (
            <li key={nav.path}>
              <Link
                to={nav.path}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FF385C] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {nav.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}