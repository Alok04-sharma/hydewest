import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

const SIDEBAR_LOGO_PATH = "/images/logo-transparent.webp";

const SIDEBAR_DARK_LOGO_STYLE = {
  background:
    "linear-gradient(90deg, #f8fafc 0%, #f8fafc 50.1%, #ed1c24 50.1%, #ed1c24 100%)",
  WebkitMaskImage: `url("${SIDEBAR_LOGO_PATH}")`,
  maskImage: `url("${SIDEBAR_LOGO_PATH}")`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

function SidebarBrandLogo({
  collapsed,
  premiumShell,
}) {
  const sizeClass = collapsed
    ? "h-6 w-[58px]"
    : "h-9 w-[145px] sm:h-10 sm:w-[160px]";

  if (premiumShell) {
    return (
      <span
        role="img"
        aria-label="hydewest"
        className={`block shrink-0 bg-transparent ${sizeClass}`}
        style={SIDEBAR_DARK_LOGO_STYLE}
      />
    );
  }

  return (
    <img
      src={SIDEBAR_LOGO_PATH}
      alt="hydewest"
      loading="eager"
      decoding="async"
      className={`block shrink-0 object-contain ${sizeClass}`}
    />
  );
}

const ADMIN_LINKS = [
  {
    to: "/owner/dashboard",
    label: "Dashboard",
    icon: "📊",
  },
  {
    to: "/owner/revenue-analytics",
    label: "Total Earnings",
    icon: "💰",
  },
  {
    to: "/owner/search-analytics",
    label: "Search Demand",
    icon: "🔥",
  },
  {
    to: "/owner/hosts",
    label: "Hosts",
    icon: "👥",
  },
  {
    to: "/owner/listings",
    label: "Listings",
    icon: "🏠",
  },
  {
    to: "/owner/bookings",
    label: "Bookings",
    icon: "📅",
  },
  {
    to: "/owner/subscriptions",
    label: "Subscriptions",
    icon: "💳",
  },
  {
    to: "/owner/notifications",
    label: "Notifications",
    icon: "🔔",
  },
  {
    to: "/owner/support",
    label: "CRM Support",
    icon: "🎧",
  },
];

const HOST_LINKS = [
  {
    to: "/host/dashboard",
    label: "Dashboard",
    icon: "📊",
  },
  {
    to: "/host/listings",
    label: "My Properties",
    icon: "🏡",
  },
  {
    to: "/host/add-listing",
    label: "Add Property",
    icon: "➕",
  },
  {
    to: "/host/bookings",
    label: "Bookings",
    icon: "📅",
  },
  {
    to: "/host/availability",
    label: "Availability",
    icon: "🗓️",
  },
  {
    to: "/host/revenue",
    label: "Revenue",
    icon: "💰",
  },
  {
    to: "/host/messages",
    label: "Messages",
    icon: "💬",
  },
  {
    to: "/host/subscription",
    label: "Subscription",
    icon: "💳",
  },
  {
    to: "/host/notifications",
    label: "Notifications",
    icon: "🔔",
  },
];

const BOOKING_GROUP = {
  type: "booking-group",
  label: "My Bookings",
  icon: "📅",

  children: [
    {
      to: "/guest/trips?tab=upcoming",
      label: "Upcoming",
      icon: "🛫",
    },
    {
      to: "/guest/trips?tab=current",
      label: "Current Stay",
      icon: "🛎️",
    },
    {
      to: "/guest/trips?tab=completed",
      label: "Booking History",
      icon: "🕒",
    },
    {
      to: "/guest/trips?tab=cancelled",
      label: "Cancelled",
      icon: "↩️",
    },
  ],
};

const FREE_GUEST_LINKS = [
  {
    to: "/guest/dashboard",
    label: "Dashboard",
    icon: "🏠",
  },
  {
    to: "/guest/search",
    label: "Search Stays",
    icon: "🔍",
  },
  {
    to: "/guest/wishlist",
    label: "Wishlist",
    icon: "❤️",
  },

  BOOKING_GROUP,

  {
    to: "/guest/hub/reviews",
    label: "My Reviews",
    icon: "⭐",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: "🔔",
  },
  {
    to: "/profile",
    label: "My Profile",
    icon: "👤",
  },
  {
    to: "/guest/payments",
    label: "Payments",
    icon: "💳",
  },
  {
    to: "/guest/hub/offers",
    label: "Offers",
    icon: "🎁",
  },
  {
    to: "/guest/hub/recent",
    label: "Recently Viewed",
    icon: "📍",
  },
  {
    to: "/guest/hub/trending",
    label: "Trending Destinations",
    icon: "🔥",
  },
  {
    to: "/guest/hub/support",
    label: "Customer Support",
    icon: "🛎️",
  },
  {
    to: "/guest/premium",
    label: "Upgrade to Premium",
    icon: "👑",
    upgrade: true,
  },
];

const PREMIUM_GUEST_LINKS = [
  {
    to: "/guest/dashboard",
    label: "Dashboard",
    icon: "🏠",
  },
  {
    to: "/guest/search",
    label: "Search Stays",
    icon: "🔍",
  },
  {
    to: "/guest/wishlist",
    label: "Unlimited Wishlist",
    icon: "❤️",
  },

  BOOKING_GROUP,

  {
    to: "/guest/hub/reviews",
    label: "Premium Reviews",
    icon: "⭐",
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: "🔔",
  },
  {
    to: "/profile",
    label: "My Profile",
    icon: "👤",
  },
  {
    to: "/guest/payments",
    label: "Payments",
    icon: "💳",
  },
  {
    to: "/guest/hub/coupons",
    label: "Premium Offers",
    icon: "🎟️",
  },
  {
    to: "/guest/messages",
    label: "Chat with Hosts",
    icon: "💬",
  },
  {
    to: "/guest/hub/wallet",
    label: "Wallet & Cashback",
    icon: "💰",
  },
  {
    to: "/guest/price-alerts",
    label: "Price Drop Alerts",
    icon: "📉",
  },
  {
    to: "/guest/hub/history",
    label: "Price History",
    icon: "📊",
  },
  {
    to: "/guest/hub/exclusive",
    label: "Exclusive Listings",
    icon: "🏡",
  },
  {
    to: "/guest/premium-tools?view=recommendations",
    label: "Recommendations",
    icon: "🎯",
  },
  {
    to: "/guest/premium-tools?view=planner",
    label: "AI Trip Planner",
    icon: "🤖",
  },
  {
    to: "/guest/loyalty",
    label: "Reward Points",
    icon: "🎁",
  },
  {
    to: "/guest/hub/referrals",
    label: "Referral Rewards",
    icon: "🎉",
  },
  {
    to: "/guest/hub/support",
    label: "Priority Support",
    icon: "📞",
  },
  {
    to: "/guest/premium",
    label: "Premium Membership",
    icon: "👑",
    premium: true,
  },
];

const TONES = {
  admin: {
    badge:
      "border-violet-200 bg-violet-50 text-violet-700",

    active:
      "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-200",

    hover:
      "hover:bg-violet-100 hover:text-violet-800",

    dot:
      "bg-violet-500",
  },

  host: {
    badge:
      "border-rose-200 bg-rose-50 text-rose-700",

    active:
      "bg-gradient-to-r from-[#FF385C] to-rose-600 text-white shadow-lg shadow-rose-200",

    hover:
      "hover:bg-rose-100 hover:text-rose-800",

    dot:
      "bg-[#FF385C]",
  },

  guest: {
    badge:
      "border-slate-200 bg-slate-50 text-slate-700",

    active:
      "bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-lg shadow-slate-200",

    hover:
      "hover:bg-rose-100 hover:text-[#8f0d34]",

    dot:
      "bg-slate-700",
  },

  premium: {
    badge:
      "border-amber-400/30 bg-gradient-to-r from-amber-300/15 to-yellow-500/5 text-amber-100",

    active:
      "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-950/30",

    hover:
      "hover:bg-amber-300/15 hover:text-amber-200",

    dot:
      "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.85)]",
  },
};

function getLinks(
  roleType,
  isPremiumGuest
) {
  if (roleType === "admin") {
    return ADMIN_LINKS;
  }

  if (roleType === "host") {
    return HOST_LINKS;
  }

  return isPremiumGuest
    ? PREMIUM_GUEST_LINKS
    : FREE_GUEST_LINKS;
}

function parseTarget(to) {
  const [
    pathname,
    search = "",
  ] = String(to || "").split("?");

  return {
    pathname,

    params:
      new URLSearchParams(
        search
      ),
  };
}

function isLinkActive(
  to,
  location
) {
  const target =
    parseTarget(to);

  const pathMatches =
    location.pathname ===
      target.pathname ||
    (
      target.pathname !==
        "/" &&
      location.pathname.startsWith(
        `${target.pathname}/`
      )
    );

  if (!pathMatches) {
    return false;
  }

  const targetEntries = [
    ...target.params.entries(),
  ];

  if (
    targetEntries.length ===
    0
  ) {
    return true;
  }

  const currentParams =
    new URLSearchParams(
      location.search
    );

  return targetEntries.every(
    ([key, value]) =>
      currentParams.get(
        key
      ) === value
  );
}

function BookingGroup({
  collapsed,
  premiumShell,
  tone,
  onNavigate,
}) {
  const location =
    useLocation();

  const onBookingPage =
    location.pathname ===
    "/guest/trips";

  const [
    open,
    setOpen,
  ] = useState(
    onBookingPage
  );

  useEffect(() => {
    if (onBookingPage) {
      setOpen(true);
    }
  }, [onBookingPage]);

  if (collapsed) {
    return (
      <Link
        to="/guest/trips?tab=upcoming"
        title="My Bookings"
        className={`group flex items-center justify-center rounded-2xl px-3 py-3 text-sm font-black transition ${
          onBookingPage
            ? tone.active
            : premiumShell
              ? `text-white/65 ${tone.hover}`
              : `text-slate-600 ${tone.hover}`
        }`}
      >
        <motion.span
          whileHover={{
            scale: 1.12,
            rotate: 2,
          }}
          className="text-lg"
        >
          📅
        </motion.span>
      </Link>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition ${
          onBookingPage
            ? tone.active
            : premiumShell
              ? `text-white/65 ${tone.hover}`
              : `text-slate-600 ${tone.hover}`
        }`}
      >
        <motion.span
          whileHover={{
            scale: 1.12,
            rotate: 2,
          }}
          className="text-lg"
        >
          📅
        </motion.span>

        <span className="min-w-0 flex-1 truncate">
          My Bookings
        </span>

        <motion.span
          animate={{
            rotate:
              open
                ? 180
                : 0,
          }}
          className="text-xs"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence
        initial={false}
      >
        {open && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            className={`ml-5 overflow-hidden border-l pl-3 ${
              premiumShell
                ? "border-amber-400/20"
                : "border-slate-200"
            }`}
          >
            {BOOKING_GROUP.children.map(
              (child) => {
                const active =
                  isLinkActive(
                    child.to,
                    location
                  );

                return (
                  <Link
                    key={
                      child.to
                    }
                    to={
                      child.to
                    }
                    onClick={
                      onNavigate
                    }
                    className={`my-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                      active
                        ? premiumShell
                          ? "bg-amber-300/15 text-amber-200"
                          : "bg-rose-50 text-[#FF385C]"
                        : premiumShell
                          ? "text-white/50 hover:bg-white/5 hover:text-white"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>
                      {
                        child.icon
                      }
                    </span>

                    <span>
                      {
                        child.label
                      }
                    </span>
                  </Link>
                );
              }
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({
  roleType,
  user,
  avatarUrl,
  collapsed,
  onNavigate,
  onLogout,
  isPremiumGuest,
  isPremiumHost,
  membership,
  hostSubscription,
}) {
  const location =
    useLocation();

  const premiumGuestShell =
    roleType === "guest" &&
    isPremiumGuest;

  const premiumHostShell =
    roleType === "host" &&
    isPremiumHost;

  const premiumShell =
    premiumGuestShell ||
    premiumHostShell;

  /*
    Normal Guest workspace uses the same visual language as
    the Super Admin workspace. Guest routes, links, access and
    premium behaviour remain unchanged.
  */
  const adminVisualShell =
    roleType === "admin" ||
    (roleType === "guest" &&
      !isPremiumGuest);

  const links = useMemo(
    () =>
      getLinks(
        roleType,
        isPremiumGuest
      ),
    [
      roleType,
      isPremiumGuest,
    ]
  );

  const tone =
    premiumShell
      ? TONES.premium
      : adminVisualShell
        ? TONES.admin
        : TONES[roleType] ||
          TONES.guest;

  const roleLabel =
    roleType === "admin"
      ? "Super Admin"
      : roleType ===
          "host"
        ? premiumHostShell
          ? "Subscribed Host"
          : "Free Host Workspace"
        : premiumShell
          ? "Premium Traveller"
          : "Guest Account";

  const planLabel =
    premiumHostShell
      ? hostSubscription
          ?.activeSubscription
          ?.planName ||
        "Unlimited listings · 90% Host share"
      : membership
          ?.planName ||
        membership
          ?.planCode
          ?.replaceAll(
            "_",
            " "
          ) ||
        "Premium Membership";

  return (
    <div
      className={`role-sidebar-shell role-sidebar-${roleType} ${
        adminVisualShell &&
        roleType !== "admin"
          ? "role-sidebar-admin guest-admin-sidebar"
          : ""
      } flex h-full flex-col ${
        premiumShell
          ? "premium-sidebar-dark bg-[radial-gradient(circle_at_top,rgba(251,191,36,.14),transparent_19rem),linear-gradient(180deg,#171208,#0b1020)] text-white"
          : "bg-white"
      }`}
    >
      <div
        className={`border-b px-4 py-5 ${
          premiumShell
            ? "border-white/10"
            : "border-slate-100"
        }`}
      >
        <Link
          to="/"
          onClick={
            onNavigate
          }
          aria-label="Go to hydewest homepage"
          className={`flex min-w-0 ${
            collapsed
              ? "justify-center"
              : "items-start"
          }`}
        >
          <span
            className={`flex min-w-0 flex-col ${
              collapsed
                ? "items-center"
                : "items-start"
            }`}
          >
            <SidebarBrandLogo
              collapsed={
                collapsed
              }
              premiumShell={
                premiumShell
              }
            />

            {!collapsed && (
              <span
                className={`mt-1.5 block text-[10px] font-black uppercase tracking-[0.18em] ${
                  premiumShell
                    ? "text-amber-300"
                    : "text-slate-400"
                }`}
              >
                {premiumHostShell
                  ? "Premium hosting studio"
                  : premiumGuestShell
                    ? "Premium travel club"
                    : "Find your perfect stay"}
              </span>
            )}
          </span>
        </Link>
      </div>

      <div className="px-3 py-4">
        <div
          className={`flex items-center rounded-2xl border p-3 ${tone.badge} ${
            collapsed
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`}
          />

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-[0.14em]">
                {premiumShell
                  ? "👑 "
                  : ""}

                {roleLabel}
              </p>

              <p className="mt-0.5 truncate text-[11px] font-semibold opacity-70">
                {premiumShell
                  ? planLabel
                  : "Role-based navigation"}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="staynest-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {links.map(
          (
            item,
            index
          ) => {
            if (
              item.type ===
              "booking-group"
            ) {
              return (
                <BookingGroup
                  key="guest-booking-group"
                  collapsed={
                    collapsed
                  }
                  premiumShell={
                    premiumShell
                  }
                  tone={
                    tone
                  }
                  onNavigate={
                    onNavigate
                  }
                />
              );
            }

            const active =
              isLinkActive(
                item.to,
                location
              );

            const special =
              item.upgrade
                ? "bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-lg shadow-amber-200"
                : item.premium
                  ? "border border-amber-400/30 bg-amber-300/10 text-amber-200"
                  : "";

            return (
              <Link
                key={`${item.to}-${item.label}-${index}`}
                to={
                  item.to
                }
                onClick={
                  onNavigate
                }
                title={
                  collapsed
                    ? item.label
                    : undefined
                }
                className={`group flex items-center rounded-2xl px-3 py-3 text-sm font-black transition ${
                  collapsed
                    ? "justify-center"
                    : "gap-3"
                } ${
                  special ||
                  (
                    active
                      ? tone.active
                      : premiumShell
                        ? `text-white/65 ${tone.hover}`
                        : `text-slate-600 ${tone.hover}`
                  )
                }`}
              >
                <motion.span
                  whileHover={{
                    scale: 1.12,
                    rotate: 2,
                  }}
                  className="text-lg"
                  aria-hidden="true"
                >
                  {
                    item.icon
                  }
                </motion.span>

                {!collapsed && (
                  <span className="truncate">
                    {
                      item.label
                    }
                  </span>
                )}

                {!collapsed &&
                  item.upgrade && (
                    <span className="ml-auto rounded-full bg-slate-950/10 px-2 py-0.5 text-[8px] font-black">
                      UPGRADE
                    </span>
                  )}
              </Link>
            );
          }
        )}
      </nav>

      <div
        className={`border-t p-3 ${
          premiumShell
            ? "border-white/10"
            : "border-slate-100"
        }`}
      >
        <Link
          to="/profile"
          onClick={
            onNavigate
          }
          className={`relative flex items-center overflow-hidden rounded-[22px] border p-3 transition ${
            collapsed
              ? "justify-center"
              : "gap-3"
          } ${
            premiumShell
              ? "border-amber-400/30 bg-gradient-to-br from-amber-300/15 via-white/5 to-transparent shadow-[0_16px_38px_rgba(0,0,0,.28)] hover:border-amber-300/60 hover:bg-amber-300/20"
              : "border-transparent bg-slate-50 hover:border-rose-200 hover:bg-rose-50"
          }`}
        >
          {premiumShell && (
            <>
              <span className="absolute -right-5 -top-7 text-7xl opacity-[0.07]">
                👑
              </span>

              <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
            </>
          )}

          <div
            className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border text-sm font-black shadow-md ${
              premiumShell
                ? "border-amber-200/60 bg-gradient-to-br from-amber-200 to-yellow-600 text-slate-950 ring-4 ring-amber-300/10"
                : "border-white bg-gradient-to-br from-slate-800 to-slate-600 text-white"
            }`}
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

            <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>

          {!collapsed && (
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`truncate text-sm font-black ${
                    premiumShell
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  {user?.name ||
                    "hydewest User"}
                </p>

                {premiumShell && (
                  <span className="text-sm">
                    👑
                  </span>
                )}
              </div>

              <p
                className={`truncate text-[10px] font-black uppercase tracking-[0.12em] ${
                  premiumShell
                    ? "text-amber-300"
                    : "text-slate-400"
                }`}
              >
                {premiumHostShell
                  ? "Premium Host"
                  : premiumGuestShell
                    ? "Premium Traveller"
                    : roleLabel}
              </p>

              <p
                className={`mt-0.5 truncate text-[10px] font-semibold ${
                  premiumShell
                    ? "text-white/45"
                    : "text-slate-400"
                }`}
              >
                {premiumShell
                  ? planLabel
                  : user?.email ||
                    "View profile"}
              </p>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={
            onLogout
          }
          className={`mt-2 flex w-full items-center rounded-2xl px-3 py-3 text-sm font-black transition hover:bg-red-50 hover:text-red-600 ${
            collapsed
              ? "justify-center"
              : "gap-3"
          } ${
            premiumShell
              ? "text-white/55"
              : "text-slate-500"
          }`}
          title={
            collapsed
              ? "Logout"
              : undefined
          }
        >
          <span
            className="text-lg"
            aria-hidden="true"
          >
            ↪️
          </span>

          {!collapsed && (
            <span>
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function RoleSidebar({
  roleType,
  user,
  avatarUrl,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onLogout,
  isPremiumGuest = false,
  isPremiumHost = false,
  membership = null,
  hostSubscription = null,
}) {
  const premiumGuestShell =
    roleType === "guest" &&
    isPremiumGuest;

  const premiumHostShell =
    roleType === "host" &&
    isPremiumHost;

  const premiumShell =
    premiumGuestShell ||
    premiumHostShell;

  const adminVisualShell =
    roleType === "admin" ||
    (roleType === "guest" &&
      !isPremiumGuest);

  const regularShellClass =
    adminVisualShell
      ? "border-violet-200/80 bg-[linear-gradient(180deg,#faf7ff_0%,#f2ebff_100%)]"
      : roleType ===
          "host"
        ? "border-rose-200/80 bg-[linear-gradient(180deg,#fff7f8_0%,#fcecef_100%)]"
        : "border-rose-200/80 bg-[linear-gradient(180deg,#fff9f9_0%,#f8eef1_100%)]";

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r shadow-[12px_0_40px_rgba(15,23,42,0.06)] transition-[width] duration-300 lg:block ${
          collapsed
            ? "w-[92px]"
            : "w-[280px]"
        } ${
          premiumShell
            ? "border-amber-400/20 bg-[#171208]"
            : regularShellClass
        }`}
      >
        <SidebarContent
          roleType={
            roleType
          }
          user={
            user
          }
          avatarUrl={
            avatarUrl
          }
          collapsed={
            collapsed
          }
          onNavigate={() => {}}
          onLogout={
            onLogout
          }
          isPremiumGuest={
            isPremiumGuest
          }
          isPremiumHost={
            isPremiumHost
          }
          membership={
            membership
          }
          hostSubscription={
            hostSubscription
          }
        />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={
                onCloseMobile
              }
              className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-sm lg:hidden"
            />

            <motion.aside
              initial={{
                x: "-100%",
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: "-100%",
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 32,
              }}
              className={`fixed inset-y-0 left-0 z-[80] w-[min(88vw,330px)] border-r shadow-2xl lg:hidden ${
                premiumShell
                  ? "border-amber-400/20 bg-[#171208]"
                  : regularShellClass
              }`}
            >
              <button
                type="button"
                onClick={
                  onCloseMobile
                }
                className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl text-lg font-black ${
                  premiumShell
                    ? "bg-white/10 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
                aria-label="Close sidebar"
              >
                ×
              </button>

              <SidebarContent
                roleType={
                  roleType
                }
                user={
                  user
                }
                avatarUrl={
                  avatarUrl
                }
                collapsed={
                  false
                }
                onNavigate={
                  onCloseMobile
                }
                onLogout={
                  onLogout
                }
                isPremiumGuest={
                  isPremiumGuest
                }
                isPremiumHost={
                  isPremiumHost
                }
                membership={
                  membership
                }
                hostSubscription={
                  hostSubscription
                }
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}