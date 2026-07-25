import React from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";

const FEATURES = {
  reviews: {
    icon: "⭐",
    title: "My Reviews",
    description: "Your completed-stay reviews and Premium Traveller badge will appear here.",
    action: "/guest/trips",
    actionLabel: "View completed stays",
    cards: ["Write reviews after completed bookings", "Premium Traveller badge on Premium reviews", "Review history and moderation status"],
  },
  offers: {
    icon: "🎁",
    title: "Offers",
    description: "Explore Host coupons, long-stay prices and Premium-only offers.",
    action: "/guest/search",
    actionLabel: "Explore stays",
    cards: ["Welcome and long-stay coupons", "UPI and Card payment deals", "Premium-only hidden discounts"],
  },
  recent: {
    icon: "📍",
    title: "Recently Viewed",
    description: "Recently explored properties will be collected here as the browsing-history module grows.",
    action: "/guest/search",
    actionLabel: "Continue exploring",
    cards: ["Resume property discovery", "Compare previous prices", "Enable Premium price-drop alerts"],
  },
  trending: {
    icon: "🔥",
    title: "Trending Destinations",
    description: "Discover high-demand cities and popular StayNest categories.",
    action: "/guest/search",
    actionLabel: "Search trending stays",
    cards: ["Popular cities", "High-rated properties", "Seasonal destination ideas"],
  },
  support: {
    icon: "🛎️",
    title: "Customer Support",
    description: "Free guests receive standard support. Premium members receive priority handling.",
    action: "/notifications",
    actionLabel: "Open notifications",
    cards: ["Booking and payment help", "Cancellation guidance", "Premium priority support queue"],
  },
  wallet: {
    icon: "💰",
    title: "Wallet & Cashback",
    description: "Loyalty points and future promotional credits are managed from your rewards wallet.",
    action: "/guest/loyalty",
    actionLabel: "Open rewards wallet",
    cards: ["Booking reward points", "Redeem on future bookings", "Premium earning multiplier"],
  },
  coupons: {
    icon: "🎟️",
    title: "Premium Coupons",
    description: "Premium coupons remain visible to every guest, but unlock only with an active membership.",
    action: "/guest/search",
    actionLabel: "Find available coupons",
    cards: ["PREMIUM15 Host offers", "Flat-value Premium deals", "Payment-method and long-stay offers"],
  },
  referrals: {
    icon: "🎉",
    title: "Referral Rewards",
    description: "Referral credit settlement is prepared as a Premium foundation and can be activated in the next campaign phase.",
    action: "/guest/premium",
    actionLabel: "View Premium membership",
    cards: ["Invite friends", "Earn promotional credits", "Track future referral campaigns"],
  },
  exclusive: {
    icon: "🏡",
    title: "Premium Exclusive Listings",
    description: "Luxury and Premium-only properties are available to active Premium guests.",
    action: "/guest/search?premiumExclusive=true",
    actionLabel: "Browse exclusive stays",
    cards: ["Luxury stays", "Premium-only access", "Hidden Host offers"],
  },
  history: {
    icon: "📈",
    title: "Price History",
    description: "Open a property to view its historical pricing graph and decide when to book.",
    action: "/guest/search",
    actionLabel: "Choose a property",
    cards: ["Recent price changes", "Current-day comparison", "Premium price-drop alerts"],
  },
};

export default function GuestFeatureHub() {
  const { section = "offers" } = useParams();
  const feature = FEATURES[section] || FEATURES.offers;

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[34px] border border-white/60 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-7 text-white shadow-2xl sm:p-10"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="text-5xl">{feature.icon}</div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-rose-200">StayNest Guest</p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">{feature.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{feature.description}</p>
            </div>
            <Link to={feature.action} className="w-fit rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-xl transition hover:-translate-y-1">
              {feature.actionLabel} →
            </Link>
          </div>
        </motion.section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {feature.cards.map((item, index) => (
            <motion.article
              key={item}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              whileHover={{ y: -5 }}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-lg font-black text-[#FF385C]">{index + 1}</span>
              <h2 className="mt-5 text-lg font-black text-slate-950">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">This section is connected to the current Guest experience and ready for deeper campaign or support automation later.</p>
            </motion.article>
          ))}
        </section>
      </div>
    </div>
  );
}