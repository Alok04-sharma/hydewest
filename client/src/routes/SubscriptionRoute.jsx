import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import subscriptionService from "../services/subscription.service";

export default function SubscriptionRoute() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, allowed: false, summary: null });

  useEffect(() => {
    let mounted = true;
    async function verifyHostEntitlement() {
      try {
        const response = await subscriptionService.getMySubscription();
        const summary = response.data || null;
        const editingExistingListing = location.pathname.includes("/edit-listing/");
        if (mounted) {
          setState({
            loading: false,
            allowed: Boolean(editingExistingListing || summary?.canCreateListing),
            summary,
          });
        }
      } catch {
        if (mounted) setState({ loading: false, allowed: false, summary: null });
      }
    }
    verifyHostEntitlement();
    return () => { mounted = false; };
  }, [location.pathname]);

  if (state.loading) {
    return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent"/><p className="text-sm font-semibold text-slate-500">Checking Host listing allowance...</p></div>;
  }

  if (!state.allowed) {
    return <Navigate to="/host/subscription/plans" replace state={{ from: location.pathname, freeListingLimitReached: true }} />;
  }

  return <Outlet context={{ hostSubscription: state.summary, isPremiumHost: Boolean(state.summary?.isActive) }} />;
}