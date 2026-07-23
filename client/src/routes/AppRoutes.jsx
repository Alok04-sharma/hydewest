import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/home/Home";
import ListingDetails from "../pages/listing/ListingDetails";
import Login from "../pages/auth/Login";
import SignUpPage from "../pages/auth/SignUpPage";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Profile from "../pages/profile/Profile";
import HostDashboard from "../pages/host/HostDashboard";
import MyListings from "../pages/host/MyListings";
import AddListing from "../pages/host/AddListing";
import EditListing from "../pages/host/EditListing";
import HostBookings from "../pages/host/HostBookings";
import HostBookingDetails from "../pages/host/HostBookingDetails";
import PropertyAvailability from "../pages/host/PropertyAvailability";
import RevenueManagement from "../pages/host/RevenueManagement";
import HostMessages from "../pages/host/HostMessages";
import SubscriptionPlans from "../pages/host/SubscriptionPlans";
import MySubscription from "../pages/host/MySubscription";
import HostNotifications from "../pages/host/HostNotifications";
import OwnerDashboard from "../pages/owner/OwnerDashboard";
import HostManagement from "../pages/owner/HostManagement";
import HostProfile from "../pages/owner/HostProfile";
import ListingManagement from "../pages/owner/ListingManagement";
import AdminListingDetails from "../pages/owner/AdminListingDetails";
import BookingMonitoring from "../pages/owner/BookingMonitoring";
import AdminBookingDetails from "../pages/owner/AdminBookingDetails";
import SubscriptionManagement from "../pages/owner/SubscriptionManagement";
import NotificationManagement from "../pages/owner/NotificationManagement";
import ProtectedRoute from "./ProtectedRoute";
import HostRoute from "./HostRoute";
import OwnerRoute from "./OwnerRoute";
import SubscriptionRoute from "./SubscriptionRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="apartment/:id" element={<ListingDetails />} />
        <Route path="listing/:id" element={<ListingDetails />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<SignUpPage />} />
        <Route path="verify-otp" element={<VerifyOTP />} />
        <Route element={<ProtectedRoute />}><Route path="profile" element={<Profile />} /></Route>

        <Route element={<HostRoute />}>
          <Route path="host/dashboard" element={<HostDashboard />} />
          <Route path="host/listings" element={<MyListings />} />
          <Route path="host/booking-requests" element={<Navigate to="/host/bookings" replace />} />
          <Route path="host/bookings" element={<HostBookings />} />
          <Route path="host/bookings/:id" element={<HostBookingDetails />} />
          <Route path="host/availability" element={<PropertyAvailability />} />
          <Route path="host/revenue" element={<RevenueManagement />} />
          <Route path="host/messages" element={<HostMessages />} />
          <Route path="host/messages/:conversationId" element={<HostMessages />} />
          <Route path="host/subscription" element={<MySubscription />} />
          <Route path="host/subscription/plans" element={<SubscriptionPlans />} />
          <Route path="host/notifications" element={<HostNotifications />} />
          <Route element={<SubscriptionRoute />}>
            <Route path="host/add-listing" element={<AddListing />} />
            <Route path="host/create-apartment" element={<AddListing />} />
            <Route path="host/edit-listing/:id" element={<EditListing />} />
          </Route>
        </Route>

        <Route element={<OwnerRoute />}>
          <Route path="owner/dashboard" element={<OwnerDashboard />} />
          <Route path="owner/hosts" element={<HostManagement />} />
          <Route path="owner/hosts/:hostId" element={<HostProfile />} />
          <Route path="owner/listings" element={<ListingManagement />} />
          <Route path="owner/listings/:listingId" element={<AdminListingDetails />} />
          <Route path="owner/bookings" element={<BookingMonitoring />} />
          <Route path="owner/bookings/:bookingId" element={<AdminBookingDetails />} />
          <Route path="owner/subscriptions" element={<SubscriptionManagement />} />
          <Route path="owner/notifications" element={<NotificationManagement />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
