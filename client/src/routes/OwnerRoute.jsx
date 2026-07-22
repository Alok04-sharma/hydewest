import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { fetchUserProfile } from '../redux/slices/authSlice';

export default function OwnerRoute() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user && !loading) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, isAuthenticated, user, loading]);

  if (loading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-3">
        <div className="animate-spin h-9 w-9 border-4 border-purple-600 border-t-transparent rounded-full"></div>
        <p className="text-xs font-semibold text-gray-500">Checking Super Admin Access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Exact Match for "super_admin", "owner", "admin"
  const roleLower = String(user?.role || '').toLowerCase();
  const isSuperAdmin =
    roleLower === 'super_admin' ||
    roleLower === 'owner' ||
    roleLower === 'admin';

  return isSuperAdmin ? <Outlet /> : <Navigate to="/" replace />;
}