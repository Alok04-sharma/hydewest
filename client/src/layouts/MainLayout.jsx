import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiLayers,
  FiMessageCircle,
  FiPlus,
  FiUsers,
} from "react-icons/fi";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../redux/slices/authSlice";
import NotificationBell from "../components/common/NotificationBell";
import RoleNavigationDropdown from "../components/common/RoleNavigationDropdown";
import UserProfileMenu from "../components/common/UserProfileMenu";

const adminLinks = [
  { to: "/owner/dashboard", label: "Dashboard", description: "Platform overview and growth", icon: FiLayers },
  { to: "/owner/hosts", label: "Hosts", description: "Manage host accounts", icon: FiUsers },
  { to: "/owner/listings", label: "Listings", description: "Review and moderate properties", icon: FiHome },
  { to: "/owner/bookings", label: "Bookings", description: "Monitor every reservation", icon: FiCalendar },
  { to: "/owner/subscriptions", label: "Subscriptions", description: "Plans, payments and revenue", icon: FiCreditCard },
  { to: "/owner/notifications", label: "Notifications", description: "Platform activity alerts", icon: FiBell },
];

const hostLinks = [
  { to: "/host/dashboard", label: "Dashboard", description: "Your hosting performance", icon: FiLayers },
  { to: "/host/listings", label: "Properties", description: "Manage your stays", icon: FiHome },
  { to: "/host/bookings", label: "Bookings", description: "Requests and reservations", icon: FiCalendar },
  { to: "/host/availability", label: "Availability", description: "Track occupied dates", icon: FiBookOpen },
  { to: "/host/revenue", label: "Revenue", description: "Earnings and analytics", icon: FiDollarSign },
  { to: "/host/messages", label: "Messages", description: "Premium guest conversations", icon: FiMessageCircle },
  { to: "/host/subscription", label: "Subscription", description: "Plan and payment history", icon: FiCreditCard },
];

const pageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

export default function MainLayout() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const role = String(user?.role || "").toLowerCase();
  const isSuperAdmin = ["super_admin", "owner", "admin"].includes(role);
  const isHost = !isSuperAdmin && (role === "host" || user?.isHost === true);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      // Local logout/navigation still runs if the API session is already expired.
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className={`app-shell flex min-h-screen flex-col text-slate-900 ${isSuperAdmin ? "admin-shell" : isHost ? "host-shell" : "guest-shell"}`}>
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1600px] items-center justify-between gap-3 px-3 py-2 sm:px-5 lg:px-8">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <motion.span
              whileHover={{ rotate: -5, scale: 1.05 }}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#FF385C] to-orange-400 text-lg font-black text-white shadow-lg shadow-rose-200"
            >
              S
            </motion.span>
            <span className="hidden sm:block">
              <span className="block text-xl font-black tracking-tight text-slate-950">StayNest</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                Find. Stay. Belong.
              </span>
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2">
            {isAuthenticated ? (
              <>
                {isSuperAdmin && (
                  <RoleNavigationDropdown
                    label="Super Admin"
                    links={adminLinks}
                    tone="admin"
                    compact={false}
                  />
                )}

                {isHost && (
                  <>
                    <RoleNavigationDropdown
                      label="Host workspace"
                      links={hostLinks}
                      tone="host"
                      compact={false}
                    />
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }} className="hidden xl:block">
                      <Link
                        to="/host/add-listing"
                        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF385C] to-rose-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-rose-200 transition hover:shadow-xl"
                      >
                        <FiPlus /> Add stay
                      </Link>
                    </motion.div>
                  </>
                )}

                {(isSuperAdmin || isHost) && (
                  <NotificationBell
                    to={isSuperAdmin ? "/owner/notifications" : "/host/notifications"}
                    tone={isSuperAdmin ? "admin" : "host"}
                  />
                )}

                <UserProfileMenu
                  user={user}
                  roleLabel={isSuperAdmin ? "Super Admin" : isHost ? "Host" : "Guest"}
                  tone={isSuperAdmin ? "admin" : "host"}
                  onLogout={handleLogout}
                />
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  Login
                </Link>
                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/register"
                    className="inline-flex rounded-2xl bg-gradient-to-r from-[#FF385C] to-rose-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-200"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-content min-w-0 flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/90 px-4 py-7 text-center text-xs font-semibold text-slate-400">
        © 2026 StayNest, Inc. Built for better stays.
      </footer>
    </div>
  );
}