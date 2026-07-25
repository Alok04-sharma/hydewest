import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function GuestRoute() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const role = String(user?.role || "").toLowerCase();
  if (["owner", "super_admin", "admin"].includes(role)) return <Navigate to="/owner/dashboard" replace />;
  if (role === "host" || user?.isHost) return <Navigate to="/host/dashboard" replace />;
  return <Outlet />;
}