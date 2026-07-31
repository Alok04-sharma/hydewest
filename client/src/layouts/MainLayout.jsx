import React, {
  useEffect,
  useState,
} from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { FiSearch } from "react-icons/fi";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import { logoutUser } from "../redux/slices/authSlice";
import NotificationBell from "../components/common/NotificationBell";
import RoleSidebar from "../components/layout/RoleSidebar";
import Footer from "../components/layout/Footer";
import SearchBar from "../components/home/SearchBar";
import BrandLogo from "../components/brand/BrandLogo";
import guestMembershipService from "../services/guestMembership.service";
import subscriptionService from "../services/subscription.service";

// ======================================
// User role resolver
// ======================================

const getRoleType = (
  user
) => {
  const role = String(
    user?.role || ""
  ).toLowerCase();

  if (
    [
      "super_admin",
      "owner",
      "admin",
    ].includes(role)
  ) {
    return "admin";
  }

  if (
    role === "host" ||
    user?.isHost === true
  ) {
    return "host";
  }

  return "guest";
};

// ======================================
// Role based notifications
// ======================================

const roleMeta = {
  admin: {
    notificationPath:
      "/owner/notifications",

    tone: "admin",
  },

  host: {
    notificationPath:
      "/host/notifications",

    tone: "host",
  },

  guest: {
    notificationPath:
      "/notifications",

    tone: "host",
  },
};

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

  const location =
    useLocation();

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] = useState(false);

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(false);

  const [
    guestMembership,
    setGuestMembership,
  ] = useState(null);

  const [
    hostSubscription,
    setHostSubscription,
  ] = useState(null);

  const [
    homeSearchDocked,
    setHomeSearchDocked,
  ] = useState(false);

  const [
    homeNavbarSearchOpen,
    setHomeNavbarSearchOpen,
  ] = useState(false);

  const [
    homeMobileSearchRequest,
    setHomeMobileSearchRequest,
  ] = useState(0);

  const roleType =
    getRoleType(user);

  const meta =
    roleMeta[roleType];

  const isHomePage =
    location.pathname === "/";

  const useWorkspaceSidebar =
    Boolean(
      isAuthenticated &&
        !isHomePage
    );

  const avatarUrl =
    typeof user?.avatar ===
    "string"
      ? user.avatar
      : user?.avatar?.url ||
        "";

  // ======================================
  // Close mobile sidebar after navigation
  // ======================================

  useEffect(() => {
    setMobileSidebarOpen(
      false
    );
  }, [
    location.pathname,
    location.search,
  ]);

  // ======================================
  // Homepage search dock listener
  // ======================================

  useEffect(() => {
    const handleDockState = (
      event
    ) => {
      setHomeSearchDocked(
        Boolean(
          event.detail
            ?.docked
        )
      );
    };

    window.addEventListener(
      "hydewest:home-search-docked",
      handleDockState
    );

    return () => {
      window.removeEventListener(
        "hydewest:home-search-docked",
        handleDockState
      );
    };
  }, []);

  // ======================================
  // Reset homepage search outside homepage
  // ======================================

  useEffect(() => {
    if (!isHomePage) {
      setHomeSearchDocked(
        false
      );

      setHomeNavbarSearchOpen(
        false
      );
    }
  }, [isHomePage]);

  useEffect(() => {
    if (
      !homeSearchDocked
    ) {
      setHomeNavbarSearchOpen(
        false
      );
    }
  }, [homeSearchDocked]);

  // ======================================
  // Load Guest membership
  // ======================================

  useEffect(() => {
    let active = true;

    async function loadGuestMembership() {
      if (
        !isAuthenticated ||
        roleType !== "guest"
      ) {
        if (active) {
          setGuestMembership(
            null
          );
        }

        return;
      }

      try {
        const response =
          await guestMembershipService.getMyMembership();

        if (active) {
          setGuestMembership(
            response.data ||
              null
          );
        }
      } catch {
        if (active) {
          setGuestMembership(
            null
          );
        }
      }
    }

    loadGuestMembership();

    return () => {
      active = false;
    };
  }, [
    isAuthenticated,
    roleType,
    user?._id,
    location.pathname,
  ]);

  // ======================================
  // Load Host subscription
  // ======================================

  useEffect(() => {
    let active = true;

    async function loadHostSubscription() {
      if (
        !isAuthenticated ||
        roleType !== "host"
      ) {
        if (active) {
          setHostSubscription(
            null
          );
        }

        return;
      }

      try {
        const response =
          await subscriptionService.getMySubscription();

        if (active) {
          setHostSubscription(
            response.data ||
              null
          );
        }
      } catch {
        if (active) {
          setHostSubscription(
            null
          );
        }
      }
    }

    loadHostSubscription();

    return () => {
      active = false;
    };
  }, [
    isAuthenticated,
    roleType,
    user?._id,
    location.pathname,
  ]);

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
        // Logout API fail hone par thunk local session clear karta hai.
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
  // Explore homepage listings
  // ======================================

  const handleExploreListings =
    (event) => {
      event.preventDefault();

      if (
        location.pathname !==
        "/"
      ) {
        navigate(
          "/#home-properties"
        );

        return;
      }

      document
        .getElementById(
          "home-properties"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    };

  // ======================================
  // Docked navbar search
  // ======================================

  const handleHomeSearchTrigger =
    () => {
      const isMobile =
        window.matchMedia(
          "(max-width: 767px)"
        ).matches;

      if (isMobile) {
        setHomeNavbarSearchOpen(
          false
        );

        setHomeMobileSearchRequest(
          (current) =>
            current + 1
        );

        return;
      }

      setHomeNavbarSearchOpen(
        (current) =>
          !current
      );
    };

  const isPremiumGuest =
    Boolean(
      roleType ===
        "guest" &&
        guestMembership?.isActive
    );

  const isPremiumHost =
    Boolean(
      roleType ===
        "host" &&
        hostSubscription?.isActive
    );

  const contentOffset =
    useWorkspaceSidebar
      ? sidebarCollapsed
        ? "lg:pl-[92px]"
        : "lg:pl-[280px]"
      : "";

  const dashboardPath =
    roleType === "admin"
      ? "/owner/dashboard"
      : roleType ===
          "host"
        ? "/host/dashboard"
        : "/guest/dashboard";

  return (
    <div
      className={`min-h-screen text-slate-900 ${
        isPremiumGuest &&
        !isHomePage
          ? "premium-guest-shell premium-theme-dark"
          : isPremiumHost &&
              !isHomePage
            ? "premium-host-shell"
            : "hydewest-shell"
      }`}
    >
      {/* Role workspace sidebar */}
      {useWorkspaceSidebar && (
        <RoleSidebar
          roleType={roleType}
          user={user}
          avatarUrl={
            avatarUrl
          }
          collapsed={
            sidebarCollapsed
          }
          mobileOpen={
            mobileSidebarOpen
          }
          onCloseMobile={() =>
            setMobileSidebarOpen(
              false
            )
          }
          onLogout={
            handleLogout
          }
          isPremiumGuest={
            isPremiumGuest
          }
          isPremiumHost={
            isPremiumHost
          }
          membership={
            guestMembership
          }
          hostSubscription={
            hostSubscription
          }
        />
      )}

      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ${contentOffset}`}
      >
        {/* ======================================
            Homepage navbar
        ====================================== */}

        {isHomePage && (
          <>
            <motion.header
              initial={{
                y: -12,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              transition={{
                duration: 0.35,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
              className={`fixed inset-x-0 top-0 z-[100] border-b shadow-[0_14px_45px_rgba(0,0,0,.18)] transition-all duration-500 ${
                homeSearchDocked
                  ? "border-white/[0.12] bg-[#070a12]/62 backdrop-blur-[26px]"
                  : "border-white/[0.1] bg-[#070a12]/30 backdrop-blur-xl"
              }`}
            >
              {/* 
                Navbar layout:
                Logo exact left,
                navigation exact centre,
                user actions exact right.
              */}
              <div className="relative grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 sm:px-4 lg:px-5">
                {/* 
                  Logo image already contains the wordmark.
                  Purana h icon aur separate hydewest text remove hai.
                */}
                <Link
                  to="/"
                  className="col-start-1 flex min-w-0 items-center justify-self-start overflow-hidden"
                  aria-label="Go to hydewest homepage"
                >
                  <motion.span
                    whileHover={{
                      scale: 1.03,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    className="inline-flex min-w-0 items-center text-white"
                  >
                    <BrandLogo variant="navbar" />
                  </motion.span>
                </Link>

                {/* Desktop centred navigation */}
                <nav className="col-start-2 hidden items-center justify-self-center gap-1 md:flex">
                  <Link
                    to="/"
                    className="relative rounded-xl px-3 py-2 text-xs font-black text-white after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#ff4f78]"
                  >
                    Home
                  </Link>

                  <Link
                    to="/#home-properties"
                    onClick={
                      handleExploreListings
                    }
                    className="rounded-xl px-3 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Explore
                  </Link>

                  {isAuthenticated && (
                    <Link
                      to={
                        dashboardPath
                      }
                      className="rounded-xl px-3 py-2 text-xs font-black text-white/68 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      Dashboard
                    </Link>
                  )}
                </nav>

                {/* Right navbar actions */}
                <div className="col-start-3 flex min-w-0 items-center justify-self-end gap-1.5 sm:gap-2">
                  <AnimatePresence
                    initial={false}
                  >
                    {homeSearchDocked && (
                      <motion.button
                        type="button"
                        initial={{
                          opacity: 0,
                          scale: 0.75,
                          x: 10,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.75,
                          x: 10,
                        }}
                        whileHover={{
                          y: -1,
                          scale: 1.03,
                        }}
                        whileTap={{
                          scale: 0.94,
                        }}
                        onClick={
                          handleHomeSearchTrigger
                        }
                        className={`grid h-10 w-10 place-items-center rounded-2xl border text-base font-black shadow-lg transition sm:w-auto sm:px-3 ${
                          homeNavbarSearchOpen
                            ? "border-rose-300 bg-white text-[#a90838]"
                            : "border-white/20 bg-white/[0.10] text-white hover:bg-white/[0.18]"
                        }`}
                        aria-label="Open search"
                        aria-expanded={
                          homeNavbarSearchOpen
                        }
                      >
                        <FiSearch
                          aria-hidden="true"
                        />

                        <span className="ml-2 hidden text-xs sm:inline">
                          Search
                        </span>
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {isAuthenticated ? (
                    <>
                      <NotificationBell
                        to={
                          meta.notificationPath
                        }
                        tone={
                          isPremiumGuest
                            ? "admin"
                            : meta.tone
                        }
                      />

                      <Link
                        to={
                          dashboardPath
                        }
                        className="hidden rounded-full bg-gradient-to-r from-[#ff4f78] to-[#b90e44] px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_30px_rgba(255,56,92,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(255,56,92,.34)] lg:inline-flex"
                      >
                        Open dashboard
                      </Link>

                      <Link
                        to="/profile"
                        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-white/[0.12] text-xs font-black text-white shadow-sm backdrop-blur"
                      >
                        {avatarUrl ? (
                          <img
                            src={
                              avatarUrl
                            }
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
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="hidden rounded-xl px-3 py-2 text-xs font-black text-white/[0.85] hover:bg-white/[0.12] hover:text-white sm:inline-flex"
                      >
                        Login
                      </Link>

                      <Link
                        to="/register"
                        className="rounded-xl bg-gradient-to-r from-[#ff385c] to-[#b20b3b] px-3 py-2.5 text-xs font-black text-white shadow-lg shadow-rose-950/25 sm:px-4"
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </div>

                {/* Desktop floating search */}
                <AnimatePresence>
                  {homeSearchDocked &&
                    homeNavbarSearchOpen && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: -10,
                          scale: 0.97,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: -8,
                          scale: 0.98,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 30,
                        }}
                        className="absolute inset-x-4 top-[calc(100%+10px)] hidden md:block"
                      >
                        <div className="mx-auto max-w-[790px] rounded-[24px] border border-white/[0.15] bg-slate-950/[0.92] p-1.5 shadow-[0_24px_70px_rgba(2,6,23,.42)] backdrop-blur-2xl">
                          <SearchBar
                            compact
                            hideMobileTrigger
                            variant="luxury"
                          />
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </motion.header>

            {/* Mobile homepage search controller */}
            <SearchBar
              compact
              hideMobileTrigger
              hideDesktopForm
              mobileOpenRequest={
                homeMobileSearchRequest
              }
              variant="luxury"
            />
          </>
        )}

        {/* ======================================
            Workspace mobile controls
        ====================================== */}

        {useWorkspaceSidebar && (
          <>
            <motion.button
              type="button"
              whileTap={{
                scale: 0.94,
              }}
              onClick={() =>
                setMobileSidebarOpen(
                  true
                )
              }
              className={`fixed left-3 top-3 z-30 grid h-11 w-11 place-items-center rounded-2xl border text-lg font-black shadow-xl backdrop-blur lg:hidden ${
                isPremiumGuest ||
                isPremiumHost
                  ? "border-amber-400/30 bg-[#171208]/90 text-amber-200"
                  : "border-rose-200/70 bg-[#fff8f8]/90 text-[#b20b3b]"
              }`}
              aria-label="Open sidebar"
            >
              ☰
            </motion.button>

            <motion.button
              type="button"
              whileHover={{
                x: 2,
              }}
              whileTap={{
                scale: 0.95,
              }}
              onClick={() =>
                setSidebarCollapsed(
                  (current) =>
                    !current
                )
              }
              className={`fixed top-4 z-50 hidden h-10 w-10 place-items-center rounded-2xl border text-sm font-black shadow-lg backdrop-blur lg:grid ${
                sidebarCollapsed
                  ? "left-[72px]"
                  : "left-[260px]"
              } ${
                isPremiumGuest ||
                isPremiumHost
                  ? "border-amber-400/25 bg-[#171208]/92 text-amber-200"
                  : "border-rose-200 bg-[#fff8f8]/92 text-[#b20b3b]"
              }`}
              aria-label={
                sidebarCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {sidebarCollapsed
                ? "»"
                : "«"}
            </motion.button>
          </>
        )}

        {/* ======================================
            Main application content
        ====================================== */}

        <main
          className={`app-content relative flex-1 ${
            isPremiumGuest &&
            !isHomePage
              ? "premium-guest-content premium-theme-dark"
              : isPremiumHost &&
                  !isHomePage
                ? "premium-host-content"
                : ""
          }`}
          data-premium-guest={
            isPremiumGuest &&
            !isHomePage
              ? "true"
              : "false"
          }
          data-premium-host={
            isPremiumHost &&
            !isHomePage
              ? "true"
              : "false"
          }
        >
          {isPremiumGuest &&
            !isHomePage && (
              <div
                aria-hidden="true"
                className="premium-guest-ambient pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden"
              >
                <span className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

                <span className="absolute left-1/4 top-16 h-52 w-52 rounded-full bg-yellow-600/8 blur-3xl" />
              </div>
            )}

          <AnimatePresence
            mode="wait"
            initial={false}
          >
            <motion.div
              key={`${location.pathname}${location.search}`}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -6,
              }}
              transition={{
                duration: 0.24,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
              className="relative z-[1] min-h-full"
            >
              <Outlet
                context={{
                  roleType,
                  isPremiumGuest,
                  guestMembership,
                  isPremiumHost,
                  hostSubscription,
                }}
              />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global footer */}
        <Footer
          compact={!isHomePage}
          premium={
            (isPremiumGuest ||
              isPremiumHost) &&
            !isHomePage
          }
          theme="dark"
          luxury={isHomePage}
        />
      </div>
    </div>
  );
}