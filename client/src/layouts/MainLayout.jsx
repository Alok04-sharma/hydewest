import React from "react";

import {
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  logoutUser,
} from "../redux/slices/authSlice";

export default function MainLayout() {
  const {
    user,
    isAuthenticated,
  } = useSelector(
    (state) => state.auth
  );

  const dispatch =
    useDispatch();

  const navigate =
    useNavigate();

  const role =
    String(
      user?.role || ""
    ).toLowerCase();

  const isSuperAdmin = [
    "super_admin",
    "owner",
    "admin",
  ].includes(role);

  const isHost =
    !isSuperAdmin &&
    (
      role === "host" ||
      user?.isHost === true
    );

  const avatarUrl =
    typeof user?.avatar ===
    "string"
      ? user.avatar
      : user?.avatar?.url || "";

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
        // Local token cleanup
        // auth thunk ke finally
        // block me ho jayega.
      } finally {
        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }
    };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      {/* Header */}

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}

          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <span className="text-2xl font-black tracking-tight text-[#FF385C]">
              StayNest
            </span>

            {isSuperAdmin && (
              <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                SUPER ADMIN
              </span>
            )}

            {isHost && (
              <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-bold text-[#FF385C]">
                HOST
              </span>
            )}
          </Link>

          {/* Navigation */}

          <div className="flex items-center space-x-3 sm:space-x-4">
            {isAuthenticated ? (
              <>
                {/* Super Admin Dashboard */}

                {isSuperAdmin && (
                  <Link
                    to="/owner/dashboard"
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700 sm:text-sm"
                  >
                    <span>
                      🛡️
                    </span>

                    <span>
                      Admin Dashboard
                    </span>
                  </Link>
                )}

                {/* Host Buttons */}

                {isHost && (
                  <>
                    <Link
                      to="/host/add-listing"
                      className="hidden items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-[#FF385C] md:flex sm:text-sm"
                    >
                      ➕ Add Stay
                    </Link>

                    <Link
                      to="/host/dashboard"
                      className="flex items-center gap-1 rounded-xl bg-[#FF385C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#E00B41] sm:text-sm"
                    >
                      📊 Host Dashboard
                    </Link>
                  </>
                )}

                {/* Profile */}

                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-[#FF385C] sm:text-sm"
                >
                  <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-200">
                    {avatarUrl ? (
                      <img
                        src={
                          avatarUrl
                        }
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-gray-600">
                        {user?.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "U"}
                      </span>
                    )}
                  </div>

                  <span className="hidden sm:inline">
                    {user?.name ||
                      "Profile"}
                  </span>
                </Link>

                {/* Logout */}

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition hover:text-red-600 sm:text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-semibold text-gray-700 transition hover:text-[#FF385C] sm:text-sm"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-xl bg-[#FF385C] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#E00B41] sm:text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        © 2026 StayNest, Inc.
        All rights reserved.
      </footer>
    </div>
  );
}