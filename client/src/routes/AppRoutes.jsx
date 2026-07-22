import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// Layout
import MainLayout from "../layouts/MainLayout";

// Public / Guest Pages
import Home from "../pages/home/Home";
import ListingDetails from "../pages/listing/ListingDetails";

// Auth Pages
import Login from "../pages/auth/Login";
import SignUpPage from "../pages/auth/SignUpPage";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Profile from "../pages/profile/Profile";

// Host Pages
import HostDashboard from "../pages/host/HostDashboard";
import AddListing from "../pages/host/AddListing";
import EditListing from "../pages/host/EditListing";
import BookingRequests from "../pages/host/BookingRequests";

// Owner / Super Admin Pages
import OwnerDashboard from "../pages/owner/OwnerDashboard";

// Security Guards
import ProtectedRoute from "./ProtectedRoute";
import HostRoute from "./HostRoute";
import OwnerRoute from "./OwnerRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={<Home />} />
        <Route path="apartment/:id" element={<ListingDetails />} />
        <Route path="listing/:id" element={<ListingDetails />} />

        {/* Authentication Routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<SignUpPage />} />
        <Route path="verify-otp" element={<VerifyOTP />} />

        {/* Protected Common Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Host Specific Routes */}
        <Route element={<HostRoute />}>
          <Route path="host/dashboard" element={<HostDashboard />} />
          <Route path="host/add-listing" element={<AddListing />} />
          <Route path="host/create-apartment" element={<AddListing />} />
          <Route path="host/edit-listing/:id" element={<EditListing />} />
          <Route
            path="host/booking-requests"
            element={<BookingRequests />}
          />
        </Route>

        {/* Owner / Super Admin Routes */}
        <Route element={<OwnerRoute />}>
          <Route path="owner/dashboard" element={<OwnerDashboard />} />
        </Route>

        {/* Unknown URL Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
