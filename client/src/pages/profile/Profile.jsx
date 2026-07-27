import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchUserProfile,
  updateProfileThunk,
  logoutUser,
} from "../../redux/slices/authSlice";
import guestMembershipService from "../../services/guestMembership.service";

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAvatarUrl = (avatar) => {
  if (typeof avatar === "string") return avatar;
  return avatar?.url || "";
};

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error, successMessage } = useSelector(
    (state) => state.auth
  );

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [membership, setMembership] = useState(null);

  const role = String(user?.role || "guest").toLowerCase();
  const isGuest = role === "guest";
  const premiumActive = Boolean(isGuest && membership?.isActive);

  const planName = useMemo(
    () =>
      membership?.planName ||
      membership?.planCode?.replaceAll("_", " ") ||
      "Premium Membership",
    [membership]
  );

  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
      return;
    }

    setName(user.name || "");
    setPhone(user.phone || "");
    setPreviewUrl(getAvatarUrl(user.avatar));
  }, [dispatch, user]);

  useEffect(() => {
    let active = true;

    async function loadMembership() {
      if (!user || !isGuest) {
        if (active) setMembership(null);
        return;
      }

      try {
        const response = await guestMembershipService.getMyMembership();
        if (active) setMembership(response.data || null);
      } catch {
        if (active) setMembership(null);
      }
    }

    loadMembership();

    return () => {
      active = false;
    };
  }, [user?._id, isGuest]);

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("phone", phone.trim());

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    const result = await dispatch(updateProfileThunk(formData));
    if (!result.error) {
      setIsEditing(false);
      setAvatarFile(null);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      // The auth slice still clears the local session.
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (loading && !user) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-4 border-t-transparent ${
            premiumActive ? "border-amber-400" : "border-[#FF385C]"
          }`}
        />
      </div>
    );
  }

  const bannerClass = premiumActive
    ? "border-amber-400/25 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.22),transparent_17rem),linear-gradient(135deg,#171208,#0f172a_60%,#3b2504)]"
    : "border-rose-200 bg-gradient-to-br from-[#FF385C] via-rose-500 to-orange-400";

  return (
    <div className="profile-page min-h-screen px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-[34px] border shadow-[0_28px_90px_rgba(15,23,42,.18)] ${bannerClass}`}
        >
          <div className="absolute -right-12 -top-20 text-[13rem] opacity-[0.07]">
            {premiumActive ? "👑" : "✦"}
          </div>

          <div className="relative px-5 pb-20 pt-6 text-white sm:px-8 sm:pb-24 sm:pt-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.24em] ${
                    premiumActive ? "text-amber-300" : "text-rose-100"
                  }`}
                >
                  {premiumActive ? "👑 Premium identity" : "hydewest account"}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Your Profile
                </h1>
                <p className="mt-2 max-w-xl text-sm font-medium text-white/65">
                  Manage your personal information, avatar, and membership identity.
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur ${
                  premiumActive
                    ? "border-amber-300/35 bg-amber-300/15 text-amber-200"
                    : "border-white/25 bg-white/15 text-white"
                }`}
              >
                {premiumActive ? "Premium Traveller" : role.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="relative -mt-14 px-4 pb-5 sm:px-7 sm:pb-7">
            <div
              className={`rounded-[30px] border p-5 shadow-2xl backdrop-blur-xl sm:p-7 ${
                premiumActive
                  ? "border-amber-400/25 bg-[#171208]/90 text-white"
                  : "border-white/70 bg-white/95 text-slate-900"
              }`}
            >
              {successMessage && (
                <div className="mb-5 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs font-black text-emerald-500">
                  ✓ {successMessage}
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-xs font-black text-red-500">
                  ✕ {error}
                </div>
              )}

              <div
                className={`flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center ${
                  premiumActive ? "border-white/10" : "border-slate-100"
                }`}
              >
                <div className="relative w-fit">
                  <div
                    className={`grid h-24 w-24 place-items-center overflow-hidden rounded-[28px] border-2 text-3xl font-black shadow-xl ${
                      premiumActive
                        ? "border-amber-300 bg-gradient-to-br from-amber-200 to-yellow-600 text-slate-950 ring-8 ring-amber-300/10"
                        : "border-rose-300 bg-rose-50 text-[#FF385C] ring-8 ring-rose-100"
                    }`}
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={user?.name || "Profile"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl border-2 border-white bg-emerald-500 text-xs text-white">
                    ✓
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`truncate text-2xl font-black ${
                        premiumActive ? "text-white" : "text-slate-950"
                      }`}
                    >
                      {user?.name || "StayNest User"}
                    </h2>
                    {premiumActive && (
                      <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-950">
                        👑 Premium
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      premiumActive ? "text-white/55" : "text-slate-500"
                    }`}
                  >
                    {user?.email}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      premiumActive ? "text-amber-200/55" : "text-slate-400"
                    }`}
                  >
                    Mobile: {user?.phone || "Not added"}
                  </p>
                </div>
              </div>

              {premiumActive && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-300/10 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                      Membership
                    </p>
                    <p className="mt-2 truncate text-sm font-black text-white">
                      {planName}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                      Active until
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {formatDate(membership?.expiryDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-white/5 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-black text-emerald-400">
                      ● Benefits active
                    </p>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Full Name", user?.name || "Not provided"],
                      ["Phone Number", user?.phone || "Not provided"],
                      ["Email Address", user?.email || "Not provided"],
                      ["Account Role", premiumActive ? "Premium Guest" : role],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className={`rounded-2xl border p-4 ${
                          premiumActive
                            ? "border-white/10 bg-white/5"
                            : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <span
                          className={`block text-[10px] font-black uppercase tracking-[0.14em] ${
                            premiumActive ? "text-amber-300" : "text-slate-400"
                          }`}
                        >
                          {label}
                        </span>
                        <p
                          className={`mt-2 break-words text-sm font-black capitalize ${
                            premiumActive ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-between ${
                      premiumActive ? "border-white/10" : "border-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className={`rounded-2xl px-5 py-3 text-xs font-black shadow-lg transition active:scale-95 ${
                        premiumActive
                          ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-amber-950/30"
                          : "bg-slate-950 text-white hover:bg-[#FF385C]"
                      }`}
                    >
                      ✏️ Edit Profile & Avatar
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-2xl border border-red-300/30 bg-red-500/10 px-5 py-3 text-xs font-black text-red-500 transition hover:bg-red-500 hover:text-white"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileSave} className="mt-6 space-y-4">
                  <h3
                    className={`border-b pb-3 text-base font-black ${
                      premiumActive
                        ? "border-white/10 text-white"
                        : "border-slate-100 text-slate-900"
                    }`}
                  >
                    Update Account Details
                  </h3>

                  <label className="block">
                    <span
                      className={`mb-1.5 block text-xs font-black ${
                        premiumActive ? "text-amber-200" : "text-slate-700"
                      }`}
                    >
                      Profile Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className={`w-full rounded-2xl border border-dashed p-3 text-xs ${
                        premiumActive
                          ? "border-amber-400/30 bg-white/5 text-white file:text-amber-300"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    />
                  </label>

                  <label className="block">
                    <span
                      className={`mb-1.5 block text-xs font-black ${
                        premiumActive ? "text-amber-200" : "text-slate-700"
                      }`}
                    >
                      Full Name
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-amber-400"
                    />
                  </label>

                  <label className="block">
                    <span
                      className={`mb-1.5 block text-xs font-black ${
                        premiumActive ? "text-amber-200" : "text-slate-700"
                      }`}
                    >
                      Mobile Number
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-amber-400"
                    />
                  </label>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 rounded-2xl py-3 text-xs font-black shadow-lg transition active:scale-95 disabled:opacity-50 ${
                        premiumActive
                          ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950"
                          : "bg-[#FF385C] text-white"
                      }`}
                    >
                      {loading ? "Saving Changes..." : "Save Profile Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className={`rounded-2xl px-5 py-3 text-xs font-black ${
                        premiumActive
                          ? "border border-white/15 bg-white/5 text-white"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}