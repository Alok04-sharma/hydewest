import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';

export default function GuestRoute() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (isAuthenticated && user) {
    if (user.role === ROLES.OWNER) return <Navigate to={ROUTES.OWNER_DASHBOARD} replace />;
    if (user.role === ROLES.HOST) return <Navigate to={ROUTES.HOST_DASHBOARD} replace />;
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}