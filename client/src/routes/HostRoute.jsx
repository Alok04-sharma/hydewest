import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { fetchUserProfile } from '../redux/slices/authSlice';

export default function HostRoute() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  // 1. Agar token storage me hai par user object load nahi hua, to profile fetch karo
  useEffect(() => {
    if (isAuthenticated && !user && !loading) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, isAuthenticated, user, loading]);

  // 2. Profile fetch/load ke dauran wait karo (premature redirect mat hone do)
  if (loading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-3">
        <div className="animate-spin h-9 w-9 border-4 border-[#FF385C] border-t-transparent rounded-full"></div>
        <p className="text-xs font-semibold text-gray-500">Host Access Verifying...</p>
      </div>
    );
  }

  // 3. Unauthenticated user ko login page par bhej do
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 4. Robust Case-Insensitive & Flag check
  const isHost =
    user?.role?.toLowerCase() === 'host' || user?.isHost === true;

  return isHost ? <Outlet /> : <Navigate to="/" replace />;
}