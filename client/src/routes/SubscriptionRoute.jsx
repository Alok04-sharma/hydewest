import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import subscriptionService from "../services/subscription.service";

export default function SubscriptionRoute() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, active: false });

  useEffect(() => {
    let mounted = true;

    const verifySubscription = async () => {
      try {
        const response = await subscriptionService.getMySubscription();

        if (mounted) {
          setState({
            loading: false,
            active: Boolean(response.success && response.data?.isActive),
          });
        }
      } catch {
        if (mounted) {
          setState({ loading: false, active: false });
        }
      }
    };

    verifySubscription();
    return () => {
      mounted = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
        <p className="text-sm font-semibold text-gray-500">
          Subscription verify ho rahi hai...
        </p>
      </div>
    );
  }

  if (!state.active) {
    return (
      <Navigate
        to="/host/subscription/plans"
        replace
        state={{ from: location.pathname, subscriptionRequired: true }}
      />
    );
  }

  return <Outlet />;
}
