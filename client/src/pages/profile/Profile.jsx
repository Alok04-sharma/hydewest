import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  useDispatch,
  useSelector,
} from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiClock,
  FiEdit3,
  FiLogOut,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";

import {
  fetchUserProfile,
  logoutUser,
  updateProfileThunk,
} from "../../redux/slices/authSlice";
import guestMembershipService from "../../services/guestMembership.service";
import subscriptionService from "../../services/subscription.service";

// ======================================
// Profile date formatter
// ======================================

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

// ======================================
// Avatar URL resolver
// ======================================

const getAvatarUrl = (
  avatar
) => {
  if (
    typeof avatar ===
    "string"
  ) {
    return avatar;
  }

  return avatar?.url || "";
};

// ======================================
// Role dashboard path resolver
// ======================================

const getDashboardPath = (
  role
) => {
  if (role === "host") {
    return "/host/dashboard";
  }

  if (
    [
      "owner",
      "super_admin",
      "admin",
    ].includes(role)
  ) {
    return "/owner/dashboard";
  }

  return "/guest/dashboard";
};

// ======================================
// Account role label resolver
// ======================================

const getRoleLabel = (
  role,
  premiumActive
) => {
  if (role === "host") {
    return premiumActive
      ? "Premium Host"
      : "Host";
  }

  if (role === "guest") {
    return premiumActive
      ? "Premium Guest"
      : "Guest";
  }

  if (
    [
      "owner",
      "super_admin",
      "admin",
    ].includes(role)
  ) {
    return "Super Admin";
  }

  return (
    role.replaceAll("_", " ") ||
    "User"
  );
};

// ======================================
// Premium account information card
// ======================================

function InfoCard({
  label,
  value,
  Icon,
  premium,
  capitalize = false,
}) {
  return (
    <motion.article
      whileHover={{
        y: -2,
      }}
      transition={{
        duration: 0.18,
      }}
      className={`rounded-[18px] border p-3 transition sm:p-3.5 ${
        premium
          ? "border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.055))] shadow-[inset_0_1px_0_rgba(255,255,255,.045)]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-sm ${
            premium
              ? "border-amber-300/25 bg-amber-300/12 text-amber-300"
              : "border-rose-200 bg-rose-50 text-[#FF385C]"
          }`}
        >
          <Icon />
        </span>

        <div className="min-w-0">
          <p
            className={`text-[8px] font-black uppercase tracking-[0.15em] ${
              premium
                ? "text-amber-300"
                : "text-slate-400"
            }`}
          >
            {label}
          </p>

          <p
            className={`mt-1 break-words text-[13px] font-black ${
              capitalize
                ? "capitalize"
                : ""
            } ${
              premium
                ? "text-white"
                : "text-slate-800"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export default function Profile() {
  const dispatch =
    useDispatch();

  const navigate =
    useNavigate();

  const {
    user,
    loading,
    error,
    successMessage,
  } = useSelector(
    (state) => state.auth
  );

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    avatarFile,
    setAvatarFile,
  ] = useState(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    guestMembership,
    setGuestMembership,
  ] = useState(null);

  const [
    hostSubscription,
    setHostSubscription,
  ] = useState(null);

  const [
    planLoading,
    setPlanLoading,
  ] = useState(true);

  const role = String(
    user?.role || "guest"
  ).toLowerCase();

  const isGuest =
    role === "guest";

  const isHost =
    role === "host" ||
    user?.isHost === true;

  const premiumGuestActive =
    Boolean(
      isGuest &&
        guestMembership?.isActive
    );

  const premiumHostActive =
    Boolean(
      isHost &&
        hostSubscription?.isActive
    );

  const premiumActive =
    premiumGuestActive ||
    premiumHostActive;

  const activePlan =
    premiumHostActive
      ? hostSubscription
      : premiumGuestActive
        ? guestMembership
        : null;

  const planName =
    useMemo(() => {
      return (
        activePlan?.planName ||
        activePlan?.planCode?.replaceAll(
          "_",
          " "
        ) ||
        (isHost
          ? "Host Subscription"
          : "Premium Membership")
      );
    }, [
      activePlan,
      isHost,
    ]);

  const roleLabel =
    getRoleLabel(
      role,
      premiumActive
    );

  const dashboardPath =
    getDashboardPath(role);

  // ======================================
  // Load logged-in profile
  // ======================================

  useEffect(() => {
    if (!user) {
      dispatch(
        fetchUserProfile()
      );

      return;
    }

    setName(
      user.name || ""
    );

    setPhone(
      user.phone || ""
    );

    setPreviewUrl(
      getAvatarUrl(
        user.avatar
      )
    );
  }, [
    dispatch,
    user,
  ]);

  // ======================================
  // Load Premium Guest or Host plan
  // ======================================

  useEffect(() => {
    let active = true;

    async function loadPremiumPlan() {
      if (!user) {
        return;
      }

      setPlanLoading(true);

      try {
        if (isHost) {
          const response =
            await subscriptionService.getMySubscription();

          if (active) {
            setHostSubscription(
              response.data ||
                null
            );

            setGuestMembership(
              null
            );
          }

          return;
        }

        if (isGuest) {
          const response =
            await guestMembershipService.getMyMembership();

          if (active) {
            setGuestMembership(
              response.data ||
                null
            );

            setHostSubscription(
              null
            );
          }

          return;
        }

        if (active) {
          setGuestMembership(
            null
          );

          setHostSubscription(
            null
          );
        }
      } catch {
        if (active) {
          setGuestMembership(
            null
          );

          setHostSubscription(
            null
          );
        }
      } finally {
        if (active) {
          setPlanLoading(
            false
          );
        }
      }
    }

    loadPremiumPlan();

    return () => {
      active = false;
    };
  }, [
    user?._id,
    isGuest,
    isHost,
  ]);

  // ======================================
  // Revoke temporary avatar preview
  // ======================================

  useEffect(
    () => () => {
      if (
        previewUrl?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    },
    [previewUrl]
  );

  // ======================================
  // Avatar selection
  // ======================================

  const handleAvatarChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      previewUrl?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setAvatarFile(file);

    setPreviewUrl(
      URL.createObjectURL(
        file
      )
    );
  };

  // ======================================
  // Cancel profile editing
  // ======================================

  const resetEditingState =
    () => {
      setName(
        user?.name || ""
      );

      setPhone(
        user?.phone || ""
      );

      setAvatarFile(null);

      if (
        previewUrl?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setPreviewUrl(
        getAvatarUrl(
          user?.avatar
        )
      );

      setIsEditing(false);
    };

  // ======================================
  // Save profile changes
  // ======================================

  const handleProfileSave =
    async (event) => {
      event.preventDefault();

      const formData =
        new FormData();

      formData.append(
        "name",
        name.trim()
      );

      formData.append(
        "phone",
        phone.trim()
      );

      if (avatarFile) {
        formData.append(
          "avatar",
          avatarFile
        );
      }

      const result =
        await dispatch(
          updateProfileThunk(
            formData
          )
        );

      if (!result.error) {
        setIsEditing(false);
        setAvatarFile(null);
      }
    };

  // ======================================
  // Logout
  // ======================================

  const handleLogout =
    async () => {
      try {
        await dispatch(
          logoutUser()
        ).unwrap();
      } catch {
        // Local authentication cleanup Redux thunk handle karta hai.
      } finally {
        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }
    };

  // ======================================
  // Initial loading state
  // ======================================

  if (
    (loading && !user) ||
    (!user &&
      planLoading)
  ) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const pageBackground =
    premiumActive
      ? "bg-[radial-gradient(circle_at_88%_4%,rgba(251,191,36,.13),transparent_24rem),radial-gradient(circle_at_8%_72%,rgba(245,158,11,.07),transparent_28rem),linear-gradient(155deg,#080b15,#111827_48%,#171208)]"
      : "bg-[radial-gradient(circle_at_85%_0%,rgba(255,56,92,.08),transparent_24rem),#f8fafc]";

  const bannerClass =
    premiumActive
      ? "border-amber-300/25 bg-[radial-gradient(circle_at_88%_10%,rgba(251,191,36,.22),transparent_17rem),linear-gradient(135deg,#171208,#0f172a_58%,#3b2504)]"
      : "border-rose-200 bg-gradient-to-br from-[#FF385C] via-rose-500 to-orange-400";

  return (
    <div
      className={`profile-page min-h-screen px-3 py-3 sm:px-5 sm:py-4 lg:px-6 ${pageBackground}`}
    >
      <div className="mx-auto max-w-6xl">
        {/* ======================================
            Compact profile hero
        ====================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.42,
          }}
          className={`relative overflow-hidden rounded-[28px] border shadow-[0_24px_75px_rgba(2,6,23,.24)] ${bannerClass}`}
        >
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-16 select-none text-[11rem] opacity-[0.055]"
          >
            {premiumActive
              ? isHost
                ? "🏠"
                : "👑"
              : "✦"}
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,.04),transparent_42%)]" />

          <div className="relative px-4 pb-16 pt-4 text-white sm:px-6 sm:pb-20 sm:pt-5 lg:px-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p
                  className={`text-[8px] font-black uppercase tracking-[0.22em] ${
                    premiumActive
                      ? "text-amber-300"
                      : "text-rose-100"
                  }`}
                >
                  {premiumActive
                    ? isHost
                      ? "👑 Premium Host identity"
                      : "👑 Premium Traveller identity"
                    : "hydewest account"}
                </p>

                <h1 className="mt-1.5 text-2xl font-black tracking-[-0.04em] sm:text-3xl lg:text-4xl">
                  Your Profile
                </h1>

                <p className="mt-2 max-w-xl text-xs font-medium leading-5 text-white/60 sm:text-sm">
                  Manage your identity,
                  contact details and account
                  preferences securely.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] backdrop-blur ${
                    premiumActive
                      ? "border-amber-300/35 bg-amber-300/15 text-amber-200"
                      : "border-white/25 bg-white/15 text-white"
                  }`}
                >
                  {premiumActive
                    ? isHost
                      ? "Premium Host"
                      : "Premium Traveller"
                    : roleLabel}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      dashboardPath
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] transition ${
                    premiumActive
                      ? "border-white/15 bg-white/[0.07] text-white hover:border-amber-300/35 hover:text-amber-200"
                      : "border-white/25 bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  Dashboard
                  <FiArrowRight />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================
              Compact main profile card
          ====================================== */}

          <div className="relative -mt-12 px-2.5 pb-3 sm:-mt-14 sm:px-4 sm:pb-4 lg:px-6">
            <div
              className={`rounded-[25px] border p-3.5 shadow-2xl backdrop-blur-2xl sm:p-4.5 lg:p-5 ${
                premiumActive
                  ? "border-amber-300/20 bg-[#101522]/94 text-white"
                  : "border-white/75 bg-white/95 text-slate-900"
              }`}
            >
              {successMessage && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-2.5 text-[11px] font-black text-emerald-400">
                  <FiCheck className="mt-0.5 shrink-0" />
                  <span>
                    {successMessage}
                  </span>
                </div>
              )}

              {error && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-300/25 bg-red-500/10 p-2.5 text-[11px] font-black text-red-400">
                  <FiX className="mt-0.5 shrink-0" />
                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* Compact identity section */}
              <div
                className={`flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center ${
                  premiumActive
                    ? "border-white/10"
                    : "border-slate-100"
                }`}
              >
                <div className="relative w-fit">
                  <div
                    className={`grid h-20 w-20 place-items-center overflow-hidden rounded-[22px] border-2 text-2xl font-black shadow-xl sm:h-24 sm:w-24 ${
                      premiumActive
                        ? "border-amber-300 bg-gradient-to-br from-amber-200 to-yellow-600 text-slate-950 ring-4 ring-amber-300/10"
                        : "border-rose-300 bg-rose-50 text-[#FF385C] ring-4 ring-rose-100"
                    }`}
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={
                          user?.name ||
                          "Profile"
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user?.name
                        ?.charAt(0)
                        ?.toUpperCase() ||
                      "U"
                    )}
                  </div>

                  <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-lg border-2 border-white bg-emerald-500 text-[10px] text-white shadow-lg">
                    <FiCheck />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`truncate text-xl font-black tracking-tight sm:text-2xl ${
                        premiumActive
                          ? "text-white"
                          : "text-slate-950"
                      }`}
                    >
                      {user?.name ||
                        "hydewest User"}
                    </h2>

                    {premiumActive && (
                      <span className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-950/20">
                        👑{" "}
                        {isHost
                          ? "Premium Host"
                          : "Premium"}
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-1.5 flex items-center gap-2 break-all text-xs font-semibold ${
                      premiumActive
                        ? "text-white/55"
                        : "text-slate-500"
                    }`}
                  >
                    <FiMail className="shrink-0" />
                    {user?.email ||
                      "Email not available"}
                  </p>

                  <p
                    className={`mt-1 flex items-center gap-2 text-[11px] font-semibold ${
                      premiumActive
                        ? "text-amber-200/55"
                        : "text-slate-400"
                    }`}
                  >
                    <FiPhone className="shrink-0" />
                    {user?.phone ||
                      "Mobile number not added"}
                  </p>
                </div>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() =>
                      setIsEditing(
                        true
                      )
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black shadow-lg transition active:scale-95 ${
                      premiumActive
                        ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-amber-950/25 hover:-translate-y-0.5"
                        : "bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-[#FF385C]"
                    }`}
                  >
                    <FiEdit3 />
                    Edit Profile
                  </button>
                )}
              </div>

              {/* 
                Subscription, expiry and status:
                tino cards same premium gold theme use karte hain.
              */}
              {premiumActive && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[17px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.055))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-300">
                      {isHost
                        ? "Subscription"
                        : "Membership"}
                    </p>

                    <p className="mt-1.5 truncate text-[13px] font-black capitalize text-white">
                      {planName}
                    </p>
                  </div>

                  <div className="rounded-[17px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.055))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-300">
                      Active until
                    </p>

                    <p className="mt-1.5 text-[13px] font-black text-white">
                      {formatDate(
                        activePlan?.expiryDate
                      )}
                    </p>
                  </div>

                  <div className="rounded-[17px] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.055))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.045)]">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-300">
                      Plan status
                    </p>

                    <p className="mt-1.5 flex items-center gap-2 text-[13px] font-black text-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
                      Benefits active
                    </p>
                  </div>
                </div>
              )}

              {!isEditing ? (
                /* ======================================
                   Compact account information
                ====================================== */

                <div className="mt-4">
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p
                        className={`text-[8px] font-black uppercase tracking-[0.17em] ${
                          premiumActive
                            ? "text-amber-300"
                            : "text-rose-500"
                        }`}
                      >
                        Account information
                      </p>

                      <h3
                        className={`mt-0.5 text-lg font-black ${
                          premiumActive
                            ? "text-white"
                            : "text-slate-950"
                        }`}
                      >
                        Personal details
                      </h3>
                    </div>

                    <span
                      className={`hidden rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] sm:inline-flex ${
                        user?.isVerified
                          ? premiumActive
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : premiumActive
                            ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {user?.isVerified
                        ? "Verified account"
                        : "Verification pending"}
                    </span>
                  </div>

                  {/* All information cards use the same subscription gold theme. */}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoCard
                      label="Full name"
                      value={
                        user?.name ||
                        "Not provided"
                      }
                      Icon={FiUser}
                      premium={
                        premiumActive
                      }
                    />

                    <InfoCard
                      label="Phone number"
                      value={
                        user?.phone ||
                        "Not provided"
                      }
                      Icon={FiPhone}
                      premium={
                        premiumActive
                      }
                    />

                    <InfoCard
                      label="Email address"
                      value={
                        user?.email ||
                        "Not provided"
                      }
                      Icon={FiMail}
                      premium={
                        premiumActive
                      }
                    />

                    <InfoCard
                      label="Account role"
                      value={roleLabel}
                      Icon={
                        isHost
                          ? FiBriefcase
                          : FiShield
                      }
                      premium={
                        premiumActive
                      }
                      capitalize
                    />

                    <InfoCard
                      label="Member since"
                      value={formatDate(
                        user?.createdAt
                      )}
                      Icon={FiCalendar}
                      premium={
                        premiumActive
                      }
                    />

                    <InfoCard
                      label="Last login"
                      value={formatDate(
                        user?.lastLoginAt
                      )}
                      Icon={FiClock}
                      premium={
                        premiumActive
                      }
                    />
                  </div>

                  <div
                    className={`mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between ${
                      premiumActive
                        ? "border-white/10"
                        : "border-slate-100"
                    }`}
                  >
                    <p
                      className={`max-w-xl text-[10px] font-medium leading-4 ${
                        premiumActive
                          ? "text-white/38"
                          : "text-slate-400"
                      }`}
                    >
                      Email and account role
                      are protected identity
                      fields. Name, phone and
                      avatar can be updated.
                    </p>

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-2.5 text-[10px] font-black text-red-400 transition hover:bg-red-500 hover:text-white"
                    >
                      <FiLogOut />
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                /* ======================================
                   Editable profile form
                ====================================== */

                <motion.form
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  onSubmit={
                    handleProfileSave
                  }
                  className="mt-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p
                        className={`text-[8px] font-black uppercase tracking-[0.17em] ${
                          premiumActive
                            ? "text-amber-300"
                            : "text-rose-500"
                        }`}
                      >
                        Edit mode
                      </p>

                      <h3
                        className={`mt-0.5 text-lg font-black ${
                          premiumActive
                            ? "text-white"
                            : "text-slate-950"
                        }`}
                      >
                        Update account details
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={
                        resetEditingState
                      }
                      className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                        premiumActive
                          ? "border-white/10 bg-white/[0.05] text-white hover:border-amber-300/30 hover:text-amber-200"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                      aria-label="Cancel editing"
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[205px_minmax(0,1fr)]">
                    {/* Compact avatar editor */}
                    <div
                      className={`rounded-[20px] border p-4 text-center ${
                        premiumActive
                          ? "border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,.13),rgba(251,191,36,.045))]"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div
                        className={`mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-[24px] border-2 text-2xl font-black ${
                          premiumActive
                            ? "border-amber-300 bg-gradient-to-br from-amber-200 to-yellow-600 text-slate-950"
                            : "border-rose-300 bg-white text-[#FF385C]"
                        }`}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user?.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                          "U"
                        )}
                      </div>

                      <label
                        className={`mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-[10px] font-black transition ${
                          premiumActive
                            ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                            : "bg-slate-950 text-white hover:bg-[#FF385C]"
                        }`}
                      >
                        <FiCamera />
                        Choose photo

                        <input
                          type="file"
                          accept="image/*"
                          onChange={
                            handleAvatarChange
                          }
                          className="hidden"
                        />
                      </label>

                      <p
                        className={`mt-2 text-[9px] font-semibold leading-4 ${
                          premiumActive
                            ? "text-white/35"
                            : "text-slate-400"
                        }`}
                      >
                        Use a clear square
                        image for best results.
                      </p>
                    </div>

                    {/* Editable account fields */}
                    <div className="space-y-3">
                      <label className="block">
                        <span
                          className={`mb-1 block text-[9px] font-black uppercase tracking-[0.13em] ${
                            premiumActive
                              ? "text-amber-200"
                              : "text-slate-600"
                          }`}
                        >
                          Full name
                        </span>

                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(
                            event
                          ) =>
                            setName(
                              event
                                .target
                                .value
                            )
                          }
                          className={`w-full rounded-xl border px-3.5 py-3 text-sm font-bold outline-none transition ${
                            premiumActive
                              ? "border-amber-300/18 bg-amber-300/[0.06] text-white placeholder:text-white/25 focus:border-amber-300/55 focus:ring-4 focus:ring-amber-300/10"
                              : "border-slate-300 bg-white text-slate-900 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                          }`}
                        />
                      </label>

                      <label className="block">
                        <span
                          className={`mb-1 block text-[9px] font-black uppercase tracking-[0.13em] ${
                            premiumActive
                              ? "text-amber-200"
                              : "text-slate-600"
                          }`}
                        >
                          Mobile number
                        </span>

                        <input
                          type="text"
                          placeholder="e.g. +91 9876543210"
                          value={phone}
                          onChange={(
                            event
                          ) =>
                            setPhone(
                              event
                                .target
                                .value
                            )
                          }
                          className={`w-full rounded-xl border px-3.5 py-3 text-sm font-bold outline-none transition ${
                            premiumActive
                              ? "border-amber-300/18 bg-amber-300/[0.06] text-white placeholder:text-white/25 focus:border-amber-300/55 focus:ring-4 focus:ring-amber-300/10"
                              : "border-slate-300 bg-white text-slate-900 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                          }`}
                        />
                      </label>

                      <div
                        className={`rounded-xl border p-3 text-[10px] font-medium leading-4 ${
                          premiumActive
                            ? "border-amber-300/15 bg-amber-300/[0.07] text-amber-100/65"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        Email address and
                        account role cannot be
                        changed because they are
                        linked to login and
                        platform permissions.
                      </div>

                      <div className="flex flex-col gap-2 pt-0.5 sm:flex-row">
                        <button
                          type="submit"
                          disabled={loading}
                          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-black shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                            premiumActive
                              ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-amber-950/25"
                              : "bg-[#FF385C] text-white shadow-rose-200"
                          }`}
                        >
                          <FiSave />

                          {loading
                            ? "Saving Changes..."
                            : "Save Profile Changes"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            resetEditingState
                          }
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black transition ${
                            premiumActive
                              ? "border border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.09]"
                              : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                          }`}
                        >
                          <FiX />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.form>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}