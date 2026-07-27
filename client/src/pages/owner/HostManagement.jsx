import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  FiAlertTriangle,
  FiEye,
  FiHome,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiUsers,
  FiX,
} from "react-icons/fi";

import ownerService from "../../services/owner.service";

const EMPTY_RESULT = {
  hosts: [],

  summary: {
    total: 0,
    active: 0,
    suspended: 0,
    removed: 0,
  },

  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const STATUS_STYLES = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  suspended:
    "border-amber-200 bg-amber-50 text-amber-700",

  removed:
    "border-red-200 bg-red-50 text-red-700",
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

function Avatar({
  host,
  size = "h-11 w-11",
}) {
  const avatarUrl =
    typeof host?.avatar ===
    "string"
      ? host.avatar
      : host?.avatar?.url || "";

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gradient-to-br from-purple-100 to-pink-100`}
    >
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
        <span className="font-black text-purple-700">
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[safeStatus]}`}
    >
      {safeStatus}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  style,
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black text-gray-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style}`}
        >
          <Icon />
        </div>
      </div>
    </article>
  );
}

function ActionModal({
  action,
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
    action.type ===
    "suspend";

  const title =
    isSuspend
      ? "Suspend Host"
      : "Remove Host";

  const buttonText =
    isSuspend
      ? "Suspend Host"
      : "Remove Host";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
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
                {title}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {action.host
                  .name ||
                  action.host
                    .email}
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
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
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
                ? "The Host will no longer be able to sign in or access protected APIs. Their listings will be marked inactive."
                : "The Host account will be soft-removed. Sign-in will remain blocked and listings will be marked inactive, while historical records remain safe."}
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
          placeholder="Write a clear reason of at least 10 characters..."
          className="mt-2 w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
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
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
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
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isSuspend
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading
              ? "Processing..."
              : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HostManagement() {
  const [
    result,
    setResult,
  ] = useState(
    EMPTY_RESULT
  );

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("all");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

  const [
    page,
    setPage,
  ] = useState(1);

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

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            searchInput.trim()
          );

          setPage(1);
        },
        400
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [searchInput]);

  const loadHosts =
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
            await ownerService.getHosts(
              {
                page,
                limit: 10,
                search:
                  debouncedSearch,
                status,
                sortBy,
              }
            );

          if (
            !response.success
          ) {
            throw new Error(
              response.message ||
                "Hosts could not be loaded."
            );
          }

          setResult(
            response.data ||
              EMPTY_RESULT
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
              "Host Management data could not be loaded."
          );
        } finally {
          setLoading(false);
          setRefreshing(
            false
          );
        }
      },
      [
        debouncedSearch,
        page,
        sortBy,
        status,
      ]
    );

  useEffect(() => {
    loadHosts();
  }, [loadHosts]);

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

  const statusOptions =
    useMemo(
      () => [
        {
          value: "all",
          label: `All (${result.summary.total})`,
        },

        {
          value: "active",
          label: `Active (${result.summary.active})`,
        },

        {
          value:
            "suspended",

          label: `Suspended (${result.summary.suspended})`,
        },

        {
          value: "removed",
          label: `Removed (${result.summary.removed})`,
        },
      ],
      [result.summary]
    );

  const openAction = (
    type,
    host
  ) => {
    setReason("");

    setAction({
      type,
      host,
    });
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
          action.type ===
          "suspend"
            ? await ownerService.suspendHost(
                action.host
                  ._id,
                reason.trim()
              )
            : await ownerService.removeHost(
                action.host
                  ._id,
                reason.trim()
              );

        if (
          !response.success
        ) {
          throw new Error(
            response.message ||
              "The action could not be completed."
          );
        }

        setNotice(
          response.message
        );

        await loadHosts(
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
            "The Host action could not be completed."
        );
      } finally {
        setActionLoading(
          false
        );

        setAction(null);
        setReason("");
      }
    };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-700">
              <FiShield />

              Super Admin
              Module
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Host Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Search registered Hosts, monitor profiles and platform activity, and suspend or remove an account when required.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadHosts(true)
            }
            disabled={
              refreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
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
              : "Refresh"}
          </button>
        </header>

        {notice && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                loadHosts(
                  true
                )
              }
              className="underline"
            >
              Retry
            </button>
          </div>
        )}

        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="All Hosts"
            value={
              result.summary
                .total
            }
            icon={FiUsers}
            style="bg-purple-100 text-purple-700"
          />

          <SummaryCard
            title="Active Hosts"
            value={
              result.summary
                .active
            }
            icon={
              FiUserCheck
            }
            style="bg-emerald-100 text-emerald-700"
          />

          <SummaryCard
            title="Suspended Hosts"
            value={
              result.summary
                .suspended
            }
            icon={FiUserX}
            style="bg-amber-100 text-amber-700"
          />

          <SummaryCard
            title="Removed Hosts"
            value={
              result.summary
                .removed
            }
            icon={FiTrash2}
            style="bg-red-100 text-red-700"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="search"
                value={
                  searchInput
                }
                onChange={(
                  event
                ) =>
                  setSearchInput(
                    event.target
                      .value
                  )
                }
                placeholder="Search host by name, email or phone..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <select
              value={status}
              onChange={(
                event
              ) => {
                setStatus(
                  event.target
                    .value
                );

                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            >
              {statusOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={sortBy}
              onChange={(
                event
              ) => {
                setSortBy(
                  event.target
                    .value
                );

                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>

              <option value="name_asc">
                Name A-Z
              </option>

              <option value="name_desc">
                Name Z-A
              </option>

              <option value="most_listings">
                Most Listings
              </option>

              <option value="most_bookings">
                Most Bookings
              </option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-80 flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />

              <p className="text-sm font-semibold text-gray-500">
                Loading Hosts...
              </p>
            </div>
          ) : result.hosts
              .length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-2xl text-gray-500">
                <FiHome />
              </div>

              <h2 className="mt-4 text-xl font-black text-gray-900">
                No hosts found
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Change the search or status filters and try again.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">
                        Host
                      </th>

                      <th className="px-5 py-4 font-bold">
                        Status
                      </th>

                      <th className="px-5 py-4 font-bold">
                        Listings
                      </th>

                      <th className="px-5 py-4 font-bold">
                        Bookings
                      </th>

                      <th className="px-5 py-4 font-bold">
                        Joined
                      </th>

                      <th className="px-5 py-4 text-right font-bold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {result.hosts.map(
                      (host) => (
                        <tr
                          key={
                            host._id
                          }
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                host={
                                  host
                                }
                              />

                              <div className="min-w-0">
                                <p className="truncate font-black text-gray-900">
                                  {host.name ||
                                    "Unnamed Host"}
                                </p>

                                <p className="truncate text-xs text-gray-500">
                                  {
                                    host.email
                                  }
                                </p>

                                <p className="truncate text-xs text-gray-400">
                                  {host.phone ||
                                    "No phone"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                host.accountStatus
                              }
                            />
                          </td>

                          <td className="px-5 py-4 font-bold text-gray-700">
                            {host.totalListings ||
                              0}
                          </td>

                          <td className="px-5 py-4 font-bold text-gray-700">
                            {host.totalBookings ||
                              0}
                          </td>

                          <td className="px-5 py-4 text-gray-500">
                            {formatDate(
                              host.createdAt
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                to={`/owner/hosts/${host._id}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100"
                              >
                                <FiEye />

                                View
                              </Link>

                              {host.accountStatus ===
                                "active" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      "suspend",
                                      host
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                                >
                                  <FiUserX />

                                  Suspend
                                </button>
                              )}

                              {host.accountStatus !==
                                "removed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      "remove",
                                      host
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                                >
                                  <FiTrash2 />

                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 lg:hidden">
                {result.hosts.map(
                  (host) => (
                    <article
                      key={
                        host._id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            host={
                              host
                            }
                          />

                          <div className="min-w-0">
                            <p className="truncate font-black text-gray-900">
                              {host.name ||
                                "Unnamed Host"}
                            </p>

                            <p className="truncate text-xs text-gray-500">
                              {
                                host.email
                              }
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          status={
                            host.accountStatus
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-gray-50 p-3 text-center">
                        <div>
                          <p className="text-lg font-black text-gray-900">
                            {host.totalListings ||
                              0}
                          </p>

                          <p className="text-[11px] text-gray-500">
                            Listings
                          </p>
                        </div>

                        <div>
                          <p className="text-lg font-black text-gray-900">
                            {host.totalBookings ||
                              0}
                          </p>

                          <p className="text-[11px] text-gray-500">
                            Bookings
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black text-gray-900">
                            {formatDate(
                              host.createdAt
                            )}
                          </p>

                          <p className="text-[11px] text-gray-500">
                            Joined
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          to={`/owner/hosts/${host._id}`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2.5 text-xs font-bold text-white"
                        >
                          <FiEye />

                          View Profile
                        </Link>

                        {host.accountStatus ===
                          "active" && (
                          <button
                            type="button"
                            onClick={() =>
                              openAction(
                                "suspend",
                                host
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700"
                          >
                            <FiUserX />

                            Suspend
                          </button>
                        )}

                        {host.accountStatus !==
                          "removed" && (
                          <button
                            type="button"
                            onClick={() =>
                              openAction(
                                "remove",
                                host
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            </>
          )}

          {!loading &&
            result.hosts
              .length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row">
                <p className="text-xs font-semibold text-gray-500">
                  Showing page{" "}
                  {
                    result.pagination
                      .page
                  }{" "}
                  of{" "}
                  {
                    result.pagination
                      .totalPages
                  }{" "}
                  —{" "}
                  {
                    result.pagination
                      .total
                  }{" "}
                  matching hosts
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      !result
                        .pagination
                        .hasPreviousPage
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          Math.max(
                            current -
                              1,
                            1
                          )
                      )
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={
                      !result
                        .pagination
                        .hasNextPage
                    }
                    onClick={() =>
                      setPage(
                        (
                          current
                        ) =>
                          current +
                          1
                      )
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>

      <ActionModal
        action={action}
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