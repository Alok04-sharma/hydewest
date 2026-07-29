import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiHome,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiTrendingUp,
  FiXCircle,
} from "react-icons/fi";

import listingService from "../../services/listing.service";
import notificationService from "../../services/notification.service";

const TYPE_LABELS = {
  host_subscription_payment_received: "Subscription Activated",
  host_subscription_payment_pending: "Payment Pending",
  host_subscription_payment_failed: "Payment Failed",
  host_subscription_renewal_scheduled: "Renewal Scheduled",
  subscription_payment_reminder: "Payment Reminder",
  subscription_renewal_confirmed: "Renewal Confirmed",
  subscription_expired: "Subscription Expired",
  listing_approved: "Listing Approved",
  listing_suspended: "Listing Suspended",
  listing_removed: "Listing Removed",
  ai_price_suggestion: "AI Price Suggestion",
  support_ticket: "Support",
  booking: "Booking",
  payment: "Payment",
  system: "System",
};

const typeIcon = (type = "") => {
  if (type === "ai_price_suggestion") return FiTrendingUp;
  if (type === "subscription_expired") return FiClock;
  if (type === "host_subscription_payment_failed") return FiXCircle;
  if (type.includes("subscription") || type === "payment") return FiCreditCard;
  if (type.includes("listing")) return FiHome;
  if (type === "system" || type === "support_ticket") return FiShield;
  return FiBell;
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const EMPTY_RESULT = {
  notifications: [],
  unreadCount: 0,
  pagination: {
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

export default function HostNotifications() {
  const navigate = useNavigate();

  const [result, setResult] = useState(EMPTY_RESULT);
  const [type, setType] = useState("all");
  const [readStatus, setReadStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingSuggestionId, setResolvingSuggestionId] = useState("");
  const [error, setError] = useState("");

  const loadNotifications = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        const response = await notificationService.getNotifications({
          page,
          limit: 15,
          type,
          readStatus,
        });

        if (!response.success) {
          throw new Error(response.message || "Notifications could not be loaded.");
        }

        setResult(response.data || EMPTY_RESULT);
        window.dispatchEvent(new Event("notifications:refresh"));
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Notifications could not be loaded."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, readStatus, type]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationService.markRead(notification._id);
      }

      window.dispatchEvent(new Event("notifications:refresh"));

      if (notification.actionUrl) navigate(notification.actionUrl);
      else loadNotifications(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "The notification could not be opened."
      );
    }
  };

  const markSingleRead = async (event, notificationId) => {
    event.stopPropagation();
    try {
      await notificationService.markRead(notificationId);
      window.dispatchEvent(new Event("notifications:refresh"));
      await loadNotifications(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The notification could not be updated.");
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      window.dispatchEvent(new Event("notifications:refresh"));
      await loadNotifications(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Notifications could not be updated.");
    }
  };

  const removeNotification = async (event, notificationId) => {
    event.stopPropagation();
    try {
      await notificationService.remove(notificationId);
      window.dispatchEvent(new Event("notifications:refresh"));
      await loadNotifications(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The notification could not be removed.");
    }
  };

  const resolvePriceSuggestion = async (event, notification, decision) => {
    event.stopPropagation();
    const listingId = notification.metadata?.listingId || notification.entityId;
    const suggestionId = notification.metadata?.suggestionId;

    if (!listingId || !suggestionId) {
      toast.error("This price suggestion is missing its listing reference.");
      return;
    }

    try {
      setResolvingSuggestionId(String(suggestionId));
      const response = await listingService.resolvePriceSuggestion(
        listingId,
        suggestionId,
        decision
      );
      if (!notification.isRead) await notificationService.markRead(notification._id);
      toast.success(
        response.message ||
          (decision === "accept"
            ? "Suggested pricing was applied."
            : "Current pricing was retained.")
      );
      window.dispatchEvent(new Event("notifications:refresh"));
      await loadNotifications(true);
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message ||
          requestError.message ||
          "The price suggestion could not be updated."
      );
    } finally {
      setResolvingSuggestionId("");
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#FF385C]">
              <FiBell /> Host Alerts
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              My Notifications
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review bookings, subscriptions, listing moderation, support and optional AI price suggestions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-[#FF385C] transition hover:bg-rose-100"
            >
              <FiCheckCircle /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#FF385C] disabled:opacity-60"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <p className="font-black text-slate-950">
            {result.unreadCount || 0} unread notification(s)
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#FF385C] focus:ring-4 focus:ring-rose-100"
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={readStatus}
              onChange={(event) => {
                setReadStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#FF385C] focus:ring-4 focus:ring-rose-100"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
            </div>
          ) : result.notifications.length ? (
            <div className="divide-y divide-slate-100">
              {result.notifications.map((notification) => {
                const Icon = typeIcon(notification.type);
                const isAiSuggestion = notification.type === "ai_price_suggestion";
                const suggestionId = String(notification.metadata?.suggestionId || "");
                const resolving = suggestionId && resolvingSuggestionId === suggestionId;

                return (
                  <article
                    key={notification._id}
                    className={`host-notification-card flex flex-col gap-4 border-l-4 p-5 transition sm:flex-row ${
                      notification.isRead
                        ? "host-notification-read border-l-transparent bg-white"
                        : "host-notification-unread border-l-amber-500 bg-amber-50"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        isAiSuggestion
                          ? "bg-violet-100 text-violet-700"
                          : notification.isRead
                            ? "bg-slate-100 text-slate-600"
                            : "bg-rose-100 text-[#FF385C]"
                      }`}
                    >
                      <Icon />
                    </div>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="w-full text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-black text-slate-950">{notification.title}</h2>
                          {!notification.isRead && (
                            <span className="rounded-full bg-[#FF385C] px-2 py-0.5 text-[10px] font-black text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {formatDate(notification.createdAt)}
                        </p>
                      </button>

                      {isAiSuggestion && (
                        <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-amber-50 p-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Current reference price
                              </p>
                              <strong className="mt-1 block text-lg font-black text-slate-950">
                                {formatCurrency(notification.metadata?.currentPrice)}
                              </strong>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">
                                AI suggested price
                              </p>
                              <strong className="mt-1 block text-lg font-black text-violet-800">
                                {formatCurrency(notification.metadata?.suggestedPrice)}
                              </strong>
                            </div>
                          </div>
                          {notification.metadata?.reason && (
                            <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                              {notification.metadata.reason}
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={resolving}
                              onClick={(event) => resolvePriceSuggestion(event, notification, "accept")}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <FiCheckCircle /> {resolving ? "Updating..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              disabled={resolving}
                              onClick={(event) => resolvePriceSuggestion(event, notification, "reject")}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                            >
                              <FiXCircle /> Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-start gap-1 self-end sm:self-start">
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={(event) => markSingleRead(event, notification._id)}
                          className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
                          title="Mark read"
                        >
                          <FiCheck />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => removeNotification(event, notification._id)}
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                        title="Remove"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-slate-500">
              <FiBell className="mx-auto text-4xl" />
              <p className="mt-3 font-bold">No notifications found.</p>
            </div>
          )}

          {!loading && result.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button
                type="button"
                disabled={!result.pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <p className="text-xs font-semibold text-slate-500">
                Page {result.pagination.page} of {result.pagination.totalPages}
              </p>
              <button
                type="button"
                disabled={!result.pagination.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
