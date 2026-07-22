import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutThunk } from '../../redux/slices/authSlice';
import { ROUTES } from '../../constants/routes';

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate(ROUTES.HOME);
  };

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="container-custom h-16 flex items-center justify-between">
        <Link to={ROUTES.HOME} className="text-2xl font-bold text-[#FF385C]">
          StayNest
        </Link>
        <nav className="flex items-center gap-4">
          <Link to={ROUTES.HOME} className="text-gray-600 hover:text-black text-sm font-medium">
            Explore
          </Link>
          {isAuthenticated ? (
            <>
              <Link to={ROUTES.TRIPS} className="text-gray-600 hover:text-black text-sm font-medium">
                My Trips
              </Link>
              <Link to={ROUTES.WISHLIST} className="text-gray-600 hover:text-black text-sm font-medium">
                Wishlist
              </Link>
              <div className="text-sm font-semibold border-l pl-4 border-gray-300">
                {user?.email} ({user?.role})
              </div>
              <button onClick={handleLogout} className="btn-secondary text-xs">
                Logout
              </button>
            </>
          ) : (
            <Link to={ROUTES.LOGIN} className="btn-primary text-sm">
              Log in / Sign up
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}