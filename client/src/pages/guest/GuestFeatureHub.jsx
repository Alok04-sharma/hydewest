import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import guestService from "../../services/guest.service";
import guestMembershipService from "../../services/guestMembership.service";
import reviewService from "../../services/review.service";

const money = (value) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const imageUrl = (value) => {
  if (typeof value === "string") return value;
  return value?.url || "https://placehold.co/720x480?text=hydewest";
};

const BASE_FEATURES = {
  reviews: {
    icon: "⭐",
    title: "My Reviews",
    description:
      "Publish verified reviews after completed stays and manage your review history.",
  },
  offers: {
    icon: "🎁",
    title: "Offers",
    description:
      "Browse active Host coupons, long-stay savings, and payment-method deals.",
  },
  coupons: {
    icon: "🎟️",
    title: "Premium Offers",
    description:
      "Unlock member-only discounts while keeping standard Host offers in one place.",
  },
  referrals: {
    icon: "🎉",
    title: "Referral Rewards",
    description:
      "Invite friends with your personal link and earn loyalty points when they register.",
  },
  exclusive: {
    icon: "🏡",
    title: "Premium Exclusive Listings",
    description:
      "Open luxury properties that are available only to active Premium travellers.",
  },
  trending: {
    icon: "🔥",
    title: "Trending Destinations",
    description:
      "Explore destinations with the highest number of approved stays on hydewest.",
  },
  support: {
    icon: "🛎️",
    title: "Customer Support",
    description:
      "Create and track booking, payment, cancellation, or account support requests.",
  },
  wallet: {
    icon: "💰",
    title: "Wallet & Cashback",
    description:
      "Use your loyalty wallet on a future booking and review every reward transaction.",
  },
  history: {
    icon: "📈",
    title: "Price History",
    description:
      "Open a property to compare historical pricing and create a Premium price alert.",
  },
  recent: {
    icon: "📍",
    title: "Recently Viewed",
    description:
      "Continue discovering approved stays and compare the properties you open next.",
  },
};

function ActionCard({ icon, title, description, onClick, active, badge }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[28px] border p-6 text-left shadow-sm transition ${
        active
          ? "border-amber-300/70 bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-amber-950/25"
          : "border-slate-200 bg-white text-slate-950 hover:border-rose-200 hover:bg-rose-50/50"
      }`}
    >
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-slate-950/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
          {badge}
        </span>
      )}
      <h2 className="mt-5 text-lg font-black">{title}</h2>
      <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-800" : "text-slate-500"}`}>
        {description}
      </p>
      <span className="mt-5 inline-flex text-xs font-black">Open →</span>
    </motion.button>
  );
}

function LoadingPanel() {
  return (
    <div className="grid min-h-72 place-items-center rounded-[30px] border border-slate-200 bg-white">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#FF385C] border-t-transparent" />
    </div>
  );
}

function ReviewHub({ data, onRefresh }) {
  const [panel, setPanel] = useState("eligible");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedBooking?.apartment?._id) return;

    try {
      setSaving(true);
      await reviewService.addReview(selectedBooking.apartment._id, {
        bookingId: selectedBooking._id,
        rating: Number(form.rating),
        comment: form.comment.trim(),
      });
      toast.success("Review published successfully.");
      setSelectedBooking(null);
      setForm({ rating: 5, comment: "" });
      await onRefresh();
      setPanel("history");
    } catch (error) {
      toast.error(error.response?.data?.message || "Review could not be published.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (reviewId) => {
    try {
      await reviewService.deleteReview(reviewId);
      toast.success("Review removed.");
      await onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Review could not be removed.");
    }
  };

  const cards = [
    {
      icon: "✍️",
      title: "Review completed stays",
      description: `${data.eligible?.length || 0} completed stay(s) can be reviewed.`,
      key: "eligible",
    },
    {
      icon: "🗂️",
      title: "Review history",
      description: `${data.reviews?.length || 0} published review(s) in your account.`,
      key: "history",
    },
    {
      icon: "🛡️",
      title: "Review standards",
      description: "Read the verified-stay and moderation rules before publishing.",
      key: "guide",
    },
  ];

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((item) => (
          <ActionCard
            key={item.key}
            {...item}
            active={panel === item.key}
            onClick={() => setPanel(item.key)}
          />
        ))}
      </section>

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {panel === "eligible" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {(data.eligible || []).map((booking) => (
              <article key={booking._id} className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <img
                  src={imageUrl(booking.apartment?.images?.[0])}
                  alt={booking.apartment?.title || "Property"}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black text-slate-950">
                    {booking.apartment?.title || "Completed stay"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Completed {date(booking.checkOut)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-[#FF385C]"
                  >
                    Write review
                  </button>
                </div>
              </article>
            ))}
            {!data.eligible?.length && (
              <p className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
                No completed booking is waiting for a review.
              </p>
            )}
          </div>
        )}

        {panel === "history" && (
          <div className="space-y-4">
            {(data.reviews || []).map((review) => (
              <article key={review._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-950">
                      {review.apartment?.title || "Property review"}
                    </h3>
                    <p className="mt-1 text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.isPremiumReview && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">
                        👑 Premium Traveller
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(review._id)}
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>
                <p className="mt-3 text-[10px] font-bold text-slate-400">
                  Published {date(review.createdAt)} · {review.status}
                </p>
              </article>
            ))}
            {!data.reviews?.length && (
              <p className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">
                You have not published a review yet.
              </p>
            )}
          </div>
        )}

        {panel === "guide" && (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Verified stays only", "A review can be submitted only after your booking is completed."],
              ["Be specific and fair", "Describe cleanliness, location, amenities, communication, and value."],
              ["Premium identity", "An active Premium membership adds a Premium Traveller badge to the review."],
            ].map(([title, text], index) => (
              <article key={title} className="rounded-3xl bg-slate-50 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white font-black text-[#FF385C] shadow-sm">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/70 p-4 backdrop-blur"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              onSubmit={submit}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-slate-950">Review your stay</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedBooking.apartment?.title}</p>

              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Rating</span>
                <select
                  value={form.rating}
                  onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Your review</span>
                <textarea
                  rows={5}
                  required
                  minLength={5}
                  value={form.comment}
                  onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#FF385C]"
                  placeholder="Share what was good and what could be improved..."
                />
              </label>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-[#FF385C] disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Publish review"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function OffersHub({ data, premiumActive, initialPremium }) {
  const [filter, setFilter] = useState(initialPremium ? "premium" : "standard");
  const offers = data?.[filter] || [];
  const cards = [
    ["standard", "🎁", "Welcome & long-stay", `${data?.standard?.length || 0} active offer(s)`],
    ["payment", "💳", "UPI & card deals", `${data?.payment?.length || 0} payment offer(s)`],
    ["premium", "👑", "Premium-only offers", `${data?.premium?.length || 0} member offer(s)`],
  ];

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(([key, icon, title, description]) => (
          <ActionCard
            key={key}
            icon={icon}
            title={title}
            description={description}
            active={filter === key}
            badge={key === "premium" && !premiumActive ? "Locked" : undefined}
            onClick={() => setFilter(key)}
          />
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {offers.map((offer) => (
          <article key={offer.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex gap-4 p-5">
              <img
                src={imageUrl(offer.image)}
                alt={offer.propertyTitle}
                className="h-24 w-24 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-[#FF385C]">
                    {offer.code}
                  </span>
                  {offer.premiumOnly && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">👑 Premium</span>
                  )}
                  {offer.paymentMethod !== "any" && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">
                      {offer.paymentMethod}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 truncate font-black text-slate-950">{offer.label}</h3>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{offer.propertyTitle}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {offer.discountType === "percentage"
                    ? `${offer.discountValue}% off`
                    : `${money(offer.discountValue)} off`}
                  {offer.maxDiscount > 0 ? ` · up to ${money(offer.maxDiscount)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400">
                {offer.validUntil ? `Valid until ${date(offer.validUntil)}` : "No fixed expiry"}
              </p>
              {offer.premiumOnly && !premiumActive ? (
                <Link to="/guest/premium" className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">
                  Unlock Premium
                </Link>
              ) : (
                <Link to={`/apartment/${offer.apartmentId}`} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-[#FF385C]">
                  View property
                </Link>
              )}
            </div>
          </article>
        ))}
        {!offers.length && (
          <p className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
            No active offers are available in this category.
          </p>
        )}
      </section>
    </>
  );
}

function ReferralHub({ data }) {
  const [panel, setPanel] = useState("invite");
  const inviteLink = `${window.location.origin}/?ref=${data.code}`;

  const copyInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join hydewest",
          text: "Use my hydewest invite link to create your Guest account.",
          url: inviteLink,
        });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        toast.success("Invite link copied.");
      }
    } catch {
      // Sharing can be cancelled by the user.
    }
  };

  const cashValue = Number(data.totalRewardPoints || 0) / Number(data.pointsPerRupee || 100);
  const cards = [
    ["invite", "🔗", "Invite friends", `Personal code: ${data.code}`],
    ["rewards", "🎁", "Referral earnings", `${data.totalRewardPoints || 0} points · ${money(cashValue)}`],
    ["activity", "📊", "Referral activity", `${data.clicks || 0} clicks · ${data.conversionCount || 0} registrations`],
  ];

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(([key, icon, title, description]) => (
          <ActionCard key={key} icon={icon} title={title} description={description} active={panel === key} onClick={() => setPanel(key)} />
        ))}
      </section>

      <section className="mt-6 rounded-[30px] border border-amber-300/25 bg-gradient-to-br from-[#171208] to-[#0b1020] p-6 text-white shadow-xl sm:p-8">
        {panel === "invite" && (
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Your invite link</p>
              <p className="mt-3 break-all rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm text-white/75">{inviteLink}</p>
              <p className="mt-3 text-sm text-white/55">
                Earn {data.rewardPointsPerReferral || 0} points when a new Guest registers through this link. Your Premium membership must remain active.
              </p>
            </div>
            <button type="button" onClick={copyInvite} className="rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-6 py-3 text-sm font-black text-slate-950">
              Share invite
            </button>
          </div>
        )}

        {panel === "rewards" && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Total reward points", data.totalRewardPoints || 0],
              ["Cash-equivalent value", money(cashValue)],
              ["Rewarded referrals", data.rewardedCount || 0],
            ].map(([label, value]) => (
              <article key={label} className="rounded-3xl border border-amber-300/15 bg-white/5 p-5">
                <p className="text-2xl font-black text-amber-300">{value}</p>
                <p className="mt-1 text-xs font-bold text-white/45">{label}</p>
              </article>
            ))}
          </div>
        )}

        {panel === "activity" && (
          <div className="space-y-3">
            {(data.conversions || []).map((item) => (
              <article key={item._id} className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-black">{item.guest?.name || item.email || "New Guest"}</p>
                  <p className="mt-1 text-xs text-white/45">Joined {date(item.joinedAt)}</p>
                </div>
                <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-300">
                  {item.status === "rewarded" ? `+${item.rewardPoints} points` : "Registered"}
                </span>
              </article>
            ))}
            {!data.conversions?.length && <p className="py-10 text-center text-sm text-white/45">No referral registration yet.</p>}
          </div>
        )}
      </section>
    </>
  );
}

function SupportHub({ tickets, premiumActive, onRefresh }) {
  const [panel, setPanel] = useState("new");
  const [form, setForm] = useState({ category: "booking", subject: "", message: "", bookingId: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await guestService.createSupportTicket(form);
      toast.success(premiumActive ? "Priority support request created." : "Support request created.");
      setForm({ category: "booking", subject: "", message: "", bookingId: "" });
      await onRefresh();
      setPanel("track");
    } catch (error) {
      toast.error(error.response?.data?.message || "Support request could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    ["new", "💬", premiumActive ? "Start priority request" : "Contact support", premiumActive ? "Priority queue with faster handling" : "Create a standard support ticket"],
    ["guide", "🧭", "Booking & payment help", "Choose the correct category and include useful details"],
    ["track", "📋", "Track requests", `${tickets.length} support request(s)`],
  ];

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(([key, icon, title, description]) => (
          <ActionCard key={key} icon={icon} title={title} description={description} active={panel === key} badge={premiumActive && key === "new" ? "Priority" : undefined} onClick={() => setPanel(key)} />
        ))}
      </section>

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {panel === "new" && (
          <form onSubmit={submit} className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-black text-slate-950">Create a support request</h2>
            <p className="mt-1 text-sm text-slate-500">
              {premiumActive ? "Your request will enter the Premium priority queue." : "Standard support requests are handled in the order received."}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Category</span>
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="booking">Booking</option>
                  <option value="payment">Payment</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Subject</span>
                <input required minLength={4} value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="What do you need help with?" />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Message</span>
              <textarea required minLength={10} rows={5} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3" placeholder="Include booking dates, payment reference, or the exact problem..." />
            </label>
            <button type="submit" disabled={saving} className="mt-5 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-[#FF385C] disabled:opacity-50">
              {saving ? "Creating request..." : premiumActive ? "Create priority request" : "Create support request"}
            </button>
          </form>
        )}

        {panel === "guide" && (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Booking issue", "Include the property name, check-in date, and the booking ID if available."],
              ["Payment issue", "Include the payment ID, amount, and the error shown by the payment gateway."],
              ["Cancellation", "Explain why you need to cancel and review your cancellation window first."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-3xl bg-slate-50 p-5">
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        )}

        {panel === "track" && (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <article key={ticket._id} className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{ticket.subject}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${ticket.priority === "priority" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{ticket.ticketNumber} · {ticket.category} · {date(ticket.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{ticket.message}</p>
                </div>
                <span className="w-fit rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black capitalize text-white">{ticket.status.replaceAll("_", " ")}</span>
              </article>
            ))}
            {!tickets.length && <p className="py-12 text-center text-sm font-semibold text-slate-500">No support requests yet.</p>}
          </div>
        )}
      </section>
    </>
  );
}

function TrendingHub({ destinations, navigate }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {destinations.slice(0, 3).map((destination, index) => (
        <motion.button
          key={destination.city}
          type="button"
          whileHover={{ y: -7, scale: 1.015 }}
          onClick={() => navigate(`/guest/search?city=${encodeURIComponent(destination.city)}`)}
          className="overflow-hidden rounded-[30px] border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-6 text-left shadow-sm"
        >
          <span className="text-4xl">{["🏖️", "🏙️", "⛰️"][index] || "📍"}</span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF385C]">Trending #{index + 1}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{destination.city}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{destination.state || "India"}</p>
          <div className="mt-5 flex items-center justify-between text-xs font-black text-slate-600">
            <span>{destination.properties} stays</span>
            <span>From {money(destination.startingPrice)}</span>
          </div>
          <span className="mt-5 inline-flex text-xs font-black text-[#FF385C]">Search destination →</span>
        </motion.button>
      ))}
      {!destinations.length && <p className="rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-semibold text-slate-500 md:col-span-3">Trending destinations are not available yet.</p>}
    </section>
  );
}

function ExclusiveHub({ listings }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {listings.slice(0, 3).map((listing) => (
        <motion.article key={listing._id} whileHover={{ y: -7 }} className="overflow-hidden rounded-[30px] border border-amber-300/20 bg-[#111827] text-white shadow-xl">
          <img src={imageUrl(listing.images?.[0])} alt={listing.title} className="h-48 w-full object-cover" />
          <div className="p-5">
            <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-[10px] font-black text-amber-300">👑 PREMIUM EXCLUSIVE</span>
            <h2 className="mt-4 line-clamp-1 text-lg font-black">{listing.title}</h2>
            <p className="mt-1 text-xs text-white/45">{listing.location?.city}, {listing.location?.state}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-black text-amber-300">{money(listing.pricing?.rates?.day || listing.pricing?.basePrice)} / day</span>
              <Link to={`/apartment/${listing._id}`} className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-slate-950">Open</Link>
            </div>
          </div>
        </motion.article>
      ))}
      {!listings.length && <p className="rounded-[28px] border border-dashed border-amber-300/20 bg-[#111827] p-12 text-center text-sm font-semibold text-white/55 md:col-span-3">No Premium-exclusive listing is currently available.</p>}
    </section>
  );
}

export default function GuestFeatureHub() {
  const { section = "offers" } = useParams();
  const navigate = useNavigate();
  const feature = BASE_FEATURES[section] || BASE_FEATURES.offers;
  const [membership, setMembership] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const premiumActive = Boolean(membership?.isActive);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const membershipResult = await guestMembershipService.getMyMembership().catch(() => null);
      setMembership(membershipResult?.data || null);

      if (section === "reviews") {
        const [eligible, reviews] = await Promise.all([
          reviewService.getEligibleBookings(),
          reviewService.getMyReviews(),
        ]);
        setData({ eligible: eligible.data || [], reviews: reviews.data || [] });
      } else if (["offers", "coupons"].includes(section)) {
        const response = await guestService.getOffers();
        setData(response.data || {});
      } else if (section === "trending") {
        const response = await guestService.getTrendingDestinations();
        setData(response.data || []);
      } else if (section === "exclusive") {
        const response = await guestService.getExclusiveListings();
        setData(response.data || []);
      } else if (section === "referrals") {
        const response = await guestService.getReferralSummary();
        setData(response.data || null);
      } else if (section === "support") {
        const response = await guestService.getSupportTickets();
        setData(response.data || []);
      } else {
        setData(null);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "This page could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [section]);

  const headerClass = premiumActive
    ? "border-amber-300/20 bg-gradient-to-br from-[#171208] via-[#111827] to-[#0b1020]"
    : "border-rose-200/60 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950";

  const fallbackActions = useMemo(
    () => ({
      wallet: [
        ["🎁", "Reward points", "View your current balance and complete transaction ledger.", "/guest/loyalty"],
        ["🏠", "Use points on a booking", "Open any approved property and redeem points before checkout.", "/guest/search"],
        ["👑", "Premium multiplier", "Premium bookings earn points faster than Free bookings.", "/guest/premium"],
      ],
      history: [
        ["🔍", "Choose a property", "Open a property to view its current rate and price history.", "/guest/search"],
        ["📉", "Create a price alert", "Premium members can receive notifications after a target is reached.", "/guest/price-alerts"],
        ["❤️", "Track saved stays", "Save useful properties and compare them before booking.", "/guest/wishlist"],
      ],
      recent: [
        ["🔍", "Continue searching", "Browse all approved properties and open the ones you want to compare.", "/guest/search"],
        ["❤️", "Open wishlist", "Return to properties you already saved.", "/guest/wishlist"],
        ["🔥", "Trending destinations", "Discover cities with the highest number of active stays.", "/guest/hub/trending"],
      ],
    }),
    []
  );

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={`overflow-hidden rounded-[34px] border p-7 text-white shadow-2xl sm:p-10 ${headerClass}`}
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="text-5xl">{feature.icon}</div>
              <p className={`mt-5 text-xs font-black uppercase tracking-[0.24em] ${premiumActive ? "text-amber-300" : "text-rose-200"}`}>
                {premiumActive ? "Premium Guest" : "hydewest Guest"}
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">{feature.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{feature.description}</p>
            </div>
            <Link to="/guest/dashboard" className={`w-fit rounded-2xl px-5 py-3 text-sm font-black shadow-xl ${premiumActive ? "bg-amber-300 text-slate-950" : "bg-white text-slate-950"}`}>
              Back to dashboard →
            </Link>
          </div>
        </motion.section>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        <div className="mt-7">
          {loading ? (
            <LoadingPanel />
          ) : section === "reviews" ? (
            <ReviewHub data={data || { eligible: [], reviews: [] }} onRefresh={load} />
          ) : ["offers", "coupons"].includes(section) ? (
            <OffersHub data={data || {}} premiumActive={premiumActive} initialPremium={section === "coupons"} />
          ) : section === "referrals" && data ? (
            <ReferralHub data={data} />
          ) : section === "support" ? (
            <SupportHub tickets={data || []} premiumActive={premiumActive} onRefresh={load} />
          ) : section === "trending" ? (
            <TrendingHub destinations={data || []} navigate={navigate} />
          ) : section === "exclusive" ? (
            <ExclusiveHub listings={data || []} />
          ) : (
            <section className="grid gap-4 md:grid-cols-3">
              {(fallbackActions[section] || fallbackActions.recent).map(([icon, title, description, to]) => (
                <motion.div key={title} whileHover={{ y: -6 }}>
                  <Link to={to} className="block h-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:border-rose-200 hover:bg-rose-50/50">
                    <span className="text-3xl">{icon}</span>
                    <h2 className="mt-5 text-lg font-black text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                    <span className="mt-5 inline-flex text-xs font-black text-[#FF385C]">Open →</span>
                  </Link>
                </motion.div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}