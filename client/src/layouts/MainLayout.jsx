import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../redux/slices/authSlice";
import NotificationBell from "../components/common/NotificationBell";
import RoleSidebar from "../components/layout/RoleSidebar";
import Footer from "../components/layout/Footer";
import guestMembershipService from "../services/guestMembership.service";

const getRoleType = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (["super_admin", "owner", "admin"].includes(role)) return "admin";
  if (role === "host" || user?.isHost === true) return "host";
  return "guest";
};

const roleMeta = {
  admin: { notificationPath: "/owner/notifications", tone: "admin" },
  host: { notificationPath: "/host/notifications", tone: "host" },
  guest: { notificationPath: "/notifications", tone: "host" },
};

export default function MainLayout() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [guestMembership, setGuestMembership] = useState(null);
  const [homeSearchDocked, setHomeSearchDocked] = useState(false);
  const [premiumTheme, setPremiumTheme] = useState(() => {
    try {
      return localStorage.getItem("hydewest_premium_theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });

  const roleType = getRoleType(user);
  const meta = roleMeta[roleType];
  const isHomePage = location.pathname === "/";
  const useWorkspaceSidebar = Boolean(isAuthenticated && !isHomePage);
  const avatarUrl = typeof user?.avatar === "string" ? user.avatar : user?.avatar?.url || "";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleDockState = (event) => {
      setHomeSearchDocked(Boolean(event.detail?.docked));
    };

    window.addEventListener("hydewest:home-search-docked", handleDockState);

    return () => {
      window.removeEventListener("hydewest:home-search-docked", handleDockState);
    };
  }, []);

  useEffect(() => {
    if (!isHomePage) {
      setHomeSearchDocked(false);
    }
  }, [isHomePage]);

  useEffect(() => {
    let active = true;

    async function loadGuestMembership() {
      if (!isAuthenticated || roleType !== "guest") {
        if (active) setGuestMembership(null);
        return;
      }

      try {
        const response = await guestMembershipService.getMyMembership();
        if (active) setGuestMembership(response.data || null);
      } catch {
        if (active) setGuestMembership(null);
      }
    }

    loadGuestMembership();
    return () => {
      active = false;
    };
  }, [isAuthenticated, roleType, user?._id, location.pathname]);

  useEffect(() => {
    if (roleType !== "guest") return;

    try {
      localStorage.setItem("hydewest_premium_theme", premiumTheme);
    } catch {
      // Private browsing or storage restrictions can safely be ignored.
    }
  }, [premiumTheme, roleType]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      // The logout thunk performs local cleanup even if the network call fails.
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const isPremiumGuest = Boolean(roleType === "guest" && guestMembership?.isActive);
  const contentOffset = useWorkspaceSidebar
    ? sidebarCollapsed
      ? "lg:pl-[92px]"
      : "lg:pl-[280px]"
    : "";

  return (
    <div
      className={`min-h-screen text-slate-900 ${
        isPremiumGuest && !isHomePage
          ? `premium-guest-shell premium-theme-${premiumTheme}`
          : "hydewest-shell"
      }`}
    >
      {useWorkspaceSidebar && (
        <RoleSidebar
          roleType={roleType}
          user={user}
          avatarUrl={avatarUrl}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
          isPremiumGuest={isPremiumGuest}
          membership={guestMembership}
          premiumTheme={premiumTheme}
          onTogglePremiumTheme={() =>
            setPremiumTheme((current) => (current === "dark" ? "light" : "dark"))
          }
        />
      )}

      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${contentOffset}`}>
        {isHomePage && (
          <motion.header
            initial={false}
            animate={{
              y: homeSearchDocked ? -78 : 0,
              opacity: homeSearchDocked ? 0 : 1,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="sticky top-0 z-50 border-b border-rose-200/50 bg-[#fff8f8]/88 shadow-[0_10px_35px_rgba(74,18,36,.08)] backdrop-blur-xl"
          >
            <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <Link to="/" className="flex items-center gap-3">
                <motion.span
                  whileHover={{ rotate: -8, scale: 1.06 }}
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ff385c] to-[#a90838] font-black text-white shadow-lg shadow-rose-200"
                >
                  h
                </motion.span>
                <span className="text-xl font-black lowercase tracking-tight text-[#c01042]">hydewest</span>
              </Link>

              <nav className="hidden items-center gap-1 md:flex">
                <Link to="/" className="rounded-xl px-3 py-2 text-xs font-black text-[#a90838] hover:bg-rose-100/70">Home</Link>
                <Link to={isAuthenticated && roleType === "guest" ? "/guest/search" : "/"} className="rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-rose-100/70 hover:text-[#a90838]">Explore</Link>
                {roleType === "host" && isAuthenticated && <Link to="/host/dashboard" className="rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-rose-100/70">Host workspace</Link>}
                {roleType === "admin" && isAuthenticated && <Link to="/owner/dashboard" className="rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-rose-100/70">Admin workspace</Link>}
                {roleType === "guest" && isAuthenticated && <Link to="/guest/dashboard" className="rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-rose-100/70">Dashboard</Link>}
              </nav>

              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <NotificationBell to={meta.notificationPath} tone={isPremiumGuest ? "admin" : meta.tone} />
                    <Link to={roleType === "admin" ? "/owner/dashboard" : roleType === "host" ? "/host/dashboard" : "/guest/dashboard"} className="hidden rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:bg-[#c01042] sm:inline-flex">
                      Open dashboard
                    </Link>
                    <Link to="/profile" className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 text-xs font-black text-[#a90838] shadow-sm">
                      {avatarUrl ? <img src={avatarUrl} alt={user?.name || "Profile"} className="h-full w-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-rose-100/70">Login</Link>
                    <Link to="/register" className="rounded-xl bg-gradient-to-r from-[#ff385c] to-[#b20b3b] px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-200">Sign up</Link>
                  </>
                )}
              </div>
            </div>
          </motion.header>
        )}

        {useWorkspaceSidebar && (
          <>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setMobileSidebarOpen(true)}
              className={`fixed left-3 top-3 z-30 grid h-11 w-11 place-items-center rounded-2xl border text-lg font-black shadow-xl backdrop-blur lg:hidden ${
                isPremiumGuest
                  ? premiumTheme === "dark"
                    ? "border-amber-400/30 bg-[#171208]/90 text-amber-200"
                    : "border-amber-300/70 bg-[#fff9e8]/94 text-amber-800"
                  : "border-rose-200/70 bg-[#fff8f8]/90 text-[#b20b3b]"
              }`}
              aria-label="Open sidebar"
            >
              ☰
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`fixed top-4 z-50 hidden h-10 w-10 place-items-center rounded-2xl border text-sm font-black shadow-lg backdrop-blur lg:grid ${
                sidebarCollapsed ? "left-[72px]" : "left-[260px]"
              } ${
                isPremiumGuest
                  ? premiumTheme === "dark"
                    ? "border-amber-400/25 bg-[#171208]/92 text-amber-200"
                    : "border-amber-300/70 bg-[#fff9e8]/96 text-amber-800"
                  : "border-rose-200 bg-[#fff8f8]/92 text-[#b20b3b]"
              }`}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? "»" : "«"}
            </motion.button>
          </>
        )}

        <main
          className={`app-content relative flex-1 ${
            isPremiumGuest && !isHomePage
              ? `premium-guest-content premium-theme-${premiumTheme}`
              : ""
          }`}
          data-premium-guest={isPremiumGuest && !isHomePage ? "true" : "false"}
        >
          {isPremiumGuest && !isHomePage && (
            <div
              aria-hidden="true"
              className="premium-guest-ambient pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden"
            >
              <span
                className={`absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl ${
                  premiumTheme === "dark" ? "bg-amber-300/10" : "bg-amber-300/22"
                }`}
              />
              <span
                className={`absolute left-1/4 top-16 h-52 w-52 rounded-full blur-3xl ${
                  premiumTheme === "dark" ? "bg-yellow-600/8" : "bg-rose-300/16"
                }`}
              />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${location.pathname}${location.search}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-[1] min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer
          compact={!isHomePage}
          premium={isPremiumGuest && !isHomePage}
          theme={premiumTheme}
        />
      </div>
    </div>
  );
}