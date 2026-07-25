import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/home/Home";
import ListingDetails from "../pages/listing/ListingDetails";
import SearchResults from "../pages/listing/SearchResults";
import Login from "../pages/auth/Login";
import SignUpPage from "../pages/auth/SignUpPage";
import VerifyOTP from "../pages/auth/VerifyOTP";
import Profile from "../pages/profile/Profile";
import Checkout from "../pages/booking/Checkout";
import BookingSuccess from "../pages/booking/BookingSuccess";
import BookingFailed from "../pages/booking/BookingFailed";
import GuestDashboard from "../pages/guest/GuestDashboard";
import Trips from "../pages/guest/Trips";
import GuestBookingDetails from "../pages/guest/GuestBookingDetails";
import Wishlist from "../pages/guest/Wishlist";
import GuestPremium from "../pages/guest/GuestPremium";
import LoyaltyRewards from "../pages/guest/LoyaltyRewards";
import PaymentHistory from "../pages/guest/PaymentHistory";
import GuestMessages from "../pages/guest/GuestMessages";
import PriceAlerts from "../pages/guest/PriceAlerts";
import PremiumTools from "../pages/guest/PremiumTools";
import GuestFeatureHub from "../pages/guest/GuestFeatureHub";
import Notifications from "../pages/notifications/Notifications";
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
import GuestRoute from "./GuestRoute";
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

        <Route element={<GuestRoute />}>
          <Route path="guest/dashboard" element={<GuestDashboard />} />
          <Route path="guest/search" element={<SearchResults />} />
          <Route path="guest/trips" element={<Trips />} />
          <Route path="guest/bookings/:id" element={<GuestBookingDetails />} />
          <Route path="guest/checkout/:bookingId" element={<Checkout />} />
          <Route path="guest/booking-success/:bookingId" element={<BookingSuccess />} />
          <Route path="guest/booking-failed/:bookingId" element={<BookingFailed />} />
          <Route path="guest/wishlist" element={<Wishlist />} />
          <Route path="guest/premium" element={<GuestPremium />} />
          <Route path="guest/loyalty" element={<LoyaltyRewards />} />
          <Route path="guest/payments" element={<PaymentHistory />} />
          <Route path="guest/messages" element={<GuestMessages />} />
          <Route path="guest/messages/:conversationId" element={<GuestMessages />} />
          <Route path="guest/price-alerts" element={<PriceAlerts />} />
          <Route path="guest/premium-tools" element={<PremiumTools />} />
          <Route path="guest/hub/:section" element={<GuestFeatureHub />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

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