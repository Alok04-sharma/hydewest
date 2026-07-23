import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  FiActivity,
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiEye,
  FiHome,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiX,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const STATUS_STYLES = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  suspended:
    "border-amber-200 bg-amber-50 text-amber-700",

  removed:
    "border-red-200 bg-red-50 text-red-700",
};

const LISTING_STATUS_STYLES = {
  approved:
    "bg-emerald-50 text-emerald-700",

  pending:
    "bg-amber-50 text-amber-700",

  rejected:
    "bg-red-50 text-red-700",

  draft:
    "bg-blue-50 text-blue-700",

  inactive:
    "bg-gray-100 text-gray-700",
};

const BOOKING_STATUS_STYLES = {
  confirmed:
    "bg-emerald-50 text-emerald-700",

  pending:
    "bg-amber-50 text-amber-700",

  completed:
    "bg-blue-50 text-blue-700",

  cancelled:
    "bg-red-50 text-red-700",
};

const formatDate = (
  value,
  withTime = false
) => {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",

      ...(withTime
        ? {
            hour:
              "2-digit",

            minute:
              "2-digit",
          }
        : {}),
    }
  );
};

const formatCurrency = (
  value
) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value || 0)
  );

function Avatar({
  host,
}) {
  const avatarUrl =
    typeof host?.avatar ===
    "string"
      ? host.avatar
      : host?.avatar?.url || "";

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-purple-100 to-pink-100 shadow-lg">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={
            host?.name ||
            "Host"
          }
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-3xl font-black text-purple-700">
          {host?.name
            ?.charAt(0)
            ?.toUpperCase() ||
            "H"}
        </span>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}) {
  const safeStatus =
    STATUS_STYLES[status]
      ? status
      : "active";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black capitalize ${STATUS_STYLES[safeStatus]}`}
    >
      {safeStatus}
    </span>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  style,
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {helper}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${style}`}
        >
          <Icon />
        </div>
      </div>
    </article>
  );
}

function BreakdownCard({
  title,
  rows,
  total,
}) {
  const safeTotal =
    Math.max(
      Number(total || 0),
      1
    );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-black text-gray-900">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {rows.map(
          (row) => {
            const value =
              Number(
                row.value ||
                  0
              );

            const percentage =
              Math.min(
                (value /
                  safeTotal) *
                  100,
                100
              );

            return (
              <div
                key={
                  row.label
                }
              >
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-gray-600">
                    {
                      row.label
                    }
                  </span>

                  <span className="font-black text-gray-900">
                    {value}
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function ActionModal({
  action,
  host,
  reason,
  setReason,
  loading,
  onClose,
  onConfirm,
}) {
  if (!action) {
    return null;
  }

  const isSuspend =
    action === "suspend";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
                isSuspend
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isSuspend ? (
                <FiUserX />
              ) : (
                <FiTrash2 />
              )}
            </div>

            <div>
              <h2 className="text-xl font-black text-gray-900">
                {isSuspend
                  ? "Suspend Host"
                  : "Remove Host"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {host?.name ||
                  host?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX />
          </button>
        </div>

        <div
          className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
            isSuspend
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex gap-2">
            <FiAlertTriangle className="mt-1 shrink-0" />

            <p>
              {isSuspend
                ? "Host ka login aur protected API access block hoga. Sab listings inactive ho jayengi."
                : "Host soft-remove hoga. Historical bookings aur payment records delete nahi honge."}
            </p>
          </div>
        </div>

        <label className="mt-5 block text-sm font-bold text-gray-700">
          Reason{" "}
          <span className="text-red-500">
            *
          </span>
        </label>

        <textarea
          value={reason}
          onChange={(
            event
          ) =>
            setReason(
              event.target
                .value
            )
          }
          rows={4}
          maxLength={500}
          placeholder="Minimum 10 characters me clear reason likhein..."
          className="mt-2 w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
        />

        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>
            Minimum 10
            characters
          </span>

          <span>
            {reason.length}
            /500
          </span>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              loading ||
              reason
                .trim()
                .length < 10
            }
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              isSuspend
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading
              ? "Processing..."
              : isSuspend
                ? "Suspend Host"
                : "Remove Host"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HostProfile() {
  const {
    hostId,
  } = useParams();

  const [
    data,
    setData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    action,
    setAction,
  ] = useState(null);

  const [
    reason,
    setReason,
  ] = useState("");

  const loadProfile =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        try {
          if (
            manualRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await ownerService.getHostProfile(
              hostId
            );

          if (
            !response.success
          ) {
            throw new Error(
              response.message ||
                "Host profile load nahi ho saka."
            );
          }

          setData(
            response.data
          );
        } catch (
          requestError
        ) {
          setError(
            requestError
              .response
              ?.data
              ?.message ||
              requestError
                .message ||
              "Host profile load nahi ho saka."
          );
        } finally {
          setLoading(false);
          setRefreshing(
            false
          );
        }
      },
      [hostId]
    );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () =>
          setNotice(""),
        4000
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [notice]);

  const listingRows =
    useMemo(() => {
      const listings =
        data?.statistics
          ?.listings || {};

      return [
        {
          label:
            "Approved",

          value:
            listings.approved,

          color:
            "bg-emerald-500",
        },

        {
          label:
            "Pending",

          value:
            listings.pending,

          color:
            "bg-amber-500",
        },

        {
          label:
            "Rejected",

          value:
            listings.rejected,

          color:
            "bg-red-500",
        },

        {
          label: "Draft",

          value:
            listings.draft,

          color:
            "bg-blue-500",
        },

        {
          label:
            "Inactive",

          value:
            listings.inactive,

          color:
            "bg-gray-500",
        },
      ];
    }, [data]);

  const bookingRows =
    useMemo(() => {
      const bookings =
        data?.statistics
          ?.bookings || {};

      return [
        {
          label:
            "Confirmed",

          value:
            bookings.confirmed,

          color:
            "bg-emerald-500",
        },

        {
          label:
            "Pending",

          value:
            bookings.pending,

          color:
            "bg-amber-500",
        },

        {
          label:
            "Completed",

          value:
            bookings.completed,

          color:
            "bg-blue-500",
        },

        {
          label:
            "Cancelled",

          value:
            bookings.cancelled,

          color:
            "bg-red-500",
        },
      ];
    }, [data]);

  const openAction = (
    type
  ) => {
    setReason("");
    setAction(type);
  };

  const closeAction = () => {
    if (actionLoading) {
      return;
    }

    setAction(null);
    setReason("");
  };

  const confirmAction =
    async () => {
      if (
        !action ||
        reason.trim().length <
          10
      ) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setError("");

        const response =
          action ===
          "suspend"
            ? await ownerService.suspendHost(
                hostId,
                reason.trim()
              )
            : await ownerService.removeHost(
                hostId,
                reason.trim()
              );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
              "Action complete nahi hua."
          );
        }

        setNotice(
          response.message
        );

        setAction(null);
        setReason("");

        await loadProfile(
          true
        );
      } catch (
        requestError
      ) {
        setError(
          requestError
            .response
            ?.data
            ?.message ||
            requestError
              .message ||
            "Host action complete nahi ho saka."
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />

        <p className="text-sm font-semibold text-gray-500">
          Host profile load ho
          rahi hai...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <FiAlertTriangle className="mx-auto text-4xl text-red-500" />

          <h1 className="mt-4 text-2xl font-black text-gray-900">
            Host not found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {error}
          </p>

          <Link
            to="/owner/hosts"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <FiArrowLeft />

            Back to Hosts
          </Link>
        </div>
      </div>
    );
  }

  const {
    host,
    statistics,
    recentListings,
    recentBookings,
    activities,
  } = data;

  const listings =
    statistics?.listings ||
    {};

  const bookings =
    statistics?.bookings ||
    {};

  const revenue =
    statistics?.revenue ||
    {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            to="/owner/hosts"
            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900"
          >
            <FiArrowLeft />

            Back to Host
            Management
          </Link>

          <button
            type="button"
            onClick={() =>
              loadProfile(
                true
              )
            }
            disabled={
              refreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            <FiRefreshCw
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh Profile"}
          </button>
        </div>

        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-purple-700 via-violet-600 to-pink-500" />

          <div className="px-5 pb-6 sm:px-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar
                  host={host}
                />

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">
                      {host.name ||
                        "Unnamed Host"}
                    </h1>

                    <StatusBadge
                      status={
                        host.accountStatus
                      }
                    />
                  </div>

                  <p className="mt-1 text-sm font-semibold text-gray-500">
                    Host since{" "}
                    {formatDate(
                      host.createdAt
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {host.accountStatus ===
                  "active" && (
                  <button
                    type="button"
                    onClick={() =>
                      openAction(
                        "suspend"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100"
                  >
                    <FiUserX />

                    Suspend Host
                  </button>
                )}

                {host.accountStatus !==
                  "removed" && (
                  <button
                    type="button"
                    onClick={() =>
                      openAction(
                        "remove"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                  >
                    <FiTrash2 />

                    Remove Host
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-2 text-gray-600">
                <FiMail className="text-purple-600" />

                <span className="truncate">
                  {host.email}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <FiPhone className="text-purple-600" />

                <span>
                  {host.phone ||
                    "Phone not provided"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <FiUserCheck className="text-purple-600" />

                <span>
                  {host.isVerified
                    ? "Verified account"
                    : "Not verified"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <FiActivity className="text-purple-600" />

                <span>
                  Last login:{" "}
                  {formatDate(
                    host.lastLoginAt,
                    true
                  )}
                </span>
              </div>
            </div>

            {host.accountStatus ===
              "suspended" &&
              host.moderation
                ?.suspensionReason && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <strong>
                    Suspension reason:
                  </strong>{" "}
                  {
                    host
                      .moderation
                      .suspensionReason
                  }

                  <div className="mt-1 text-xs text-amber-600">
                    Suspended on{" "}
                    {formatDate(
                      host
                        .moderation
                        .suspendedAt,
                      true
                    )}
                  </div>
                </div>
              )}

            {host.accountStatus ===
              "removed" &&
              host.moderation
                ?.removalReason && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <strong>
                    Removal reason:
                  </strong>{" "}
                  {
                    host
                      .moderation
                      .removalReason
                  }

                  <div className="mt-1 text-xs text-red-600">
                    Removed on{" "}
                    {formatDate(
                      host
                        .moderation
                        .removedAt,
                      true
                    )}
                  </div>
                </div>
              )}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Listings"
            value={
              listings.total ||
              0
            }
            helper={`${listings.approved || 0} approved listings`}
            icon={FiHome}
            style="bg-purple-100 text-purple-700"
          />

          <MetricCard
            title="Total Bookings"
            value={
              bookings.total ||
              0
            }
            helper={`${bookings.confirmed || 0} confirmed bookings`}
            icon={FiCalendar}
            style="bg-emerald-100 text-emerald-700"
          />

          <MetricCard
            title="Successful Revenue"
            value={formatCurrency(
              revenue.totalRevenue
            )}
            helper={`${revenue.successfulPayments || 0} successful payments`}
            icon={FiDollarSign}
            style="bg-violet-100 text-violet-700"
          />

          <MetricCard
            title="Listing Views"
            value={
              listings.totalViews ||
              0
            }
            helper="Combined property views"
            icon={FiEye}
            style="bg-blue-100 text-blue-700"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BreakdownCard
            title="Listing Status Breakdown"
            rows={
              listingRows
            }
            total={
              listings.total
            }
          />

          <BreakdownCard
            title="Booking Status Breakdown"
            rows={
              bookingRows
            }
            total={
              bookings.total
            }
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-black text-gray-900">
                Recent Listings
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Host ke latest
                property
                submissions.
              </p>
            </div>

            {recentListings
              ?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">
                        Listing
                      </th>

                      <th className="px-5 py-3 font-bold">
                        Location
                      </th>

                      <th className="px-5 py-3 font-bold">
                        Status
                      </th>

                      <th className="px-5 py-3 font-bold">
                        Price
                      </th>

                      <th className="px-5 py-3 font-bold">
                        Created
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {recentListings.map(
                      (
                        listing
                      ) => (
                        <tr
                          key={
                            listing._id
                          }
                          className="hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <p className="max-w-56 truncate font-bold text-gray-900">
                              {
                                listing.title
                              }
                            </p>

                            <p className="text-xs text-gray-400">
                              {
                                listing.propertyType
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <FiMapPin />

                              {listing
                                .location
                                ?.city ||
                                "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                LISTING_STATUS_STYLES[
                                  listing
                                    .status
                                ] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {
                                listing.status
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4 font-bold text-gray-900">
                            {formatCurrency(
                              listing
                                .pricing
                                ?.pricePerNight
                            )}
                          </td>

                          <td className="px-5 py-4 text-gray-500">
                            {formatDate(
                              listing.createdAt
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-gray-500">
                Is host ki abhi
                koi listing nahi
                hai.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <FiActivity className="text-purple-600" />

              <h2 className="text-lg font-black text-gray-900">
                Activity
                Timeline
              </h2>
            </div>

            <div className="mt-5 space-y-5">
              {activities
                ?.length ? (
                activities.map(
                  (
                    activity,
                    index
                  ) => (
                    <div
                      key={
                        activity.id
                      }
                      className="relative flex gap-3"
                    >
                      {index <
                        activities.length -
                          1 && (
                        <div className="absolute left-3 top-7 h-[calc(100%+0.75rem)] w-px bg-gray-200" />
                      )}

                      <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-purple-600 shadow" />

                      <div className="min-w-0 pb-1">
                        <p className="font-bold text-gray-900">
                          {
                            activity.title
                          }
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {
                            activity.description
                          }
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-gray-400">
                          {formatDate(
                            activity.occurredAt,
                            true
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="text-sm text-gray-500">
                  Activity data
                  available nahi
                  hai.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-gray-900">
              Recent Bookings
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Host ko receive hui
              latest bookings.
            </p>
          </div>

          {recentBookings
            ?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">
                      Guest
                    </th>

                    <th className="px-5 py-3 font-bold">
                      Property
                    </th>

                    <th className="px-5 py-3 font-bold">
                      Stay Dates
                    </th>

                    <th className="px-5 py-3 font-bold">
                      Booking
                    </th>

                    <th className="px-5 py-3 font-bold">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-right font-bold">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentBookings.map(
                    (
                      booking
                    ) => (
                      <tr
                        key={
                          booking._id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">
                            {booking
                              .guest
                              ?.name ||
                              "Guest"}
                          </p>

                          <p className="text-xs text-gray-400">
                            {
                              booking
                                .guest
                                ?.email
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-60 truncate font-semibold text-gray-700">
                            {booking
                              .apartment
                              ?.title ||
                              "Listing unavailable"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                          {formatDate(
                            booking.checkIn
                          )}{" "}
                          —{" "}
                          {formatDate(
                            booking.checkOut
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                              BOOKING_STATUS_STYLES[
                                booking
                                  .status
                              ] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {
                              booking.status
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs font-bold capitalize text-gray-600">
                          {
                            booking.paymentStatus
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-black text-gray-900">
                          {formatCurrency(
                            booking
                              .pricing
                              ?.totalAmount
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              Is host ko abhi koi
              booking receive nahi
              hui.
            </div>
          )}
        </section>
      </div>

      <ActionModal
        action={action}
        host={host}
        reason={reason}
        setReason={
          setReason
        }
        loading={
          actionLoading
        }
        onClose={
          closeAction
        }
        onConfirm={
          confirmAction
        }
      />
    </div>
  );
}