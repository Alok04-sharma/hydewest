import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const CONTENT = {
  "/privacy": {
    eyebrow: "Privacy Policy",
    title: "Your information should support the stay, not become the product.",
    intro:
      "This Phase-1 policy page explains the categories of information used by hydewest to operate accounts, listings, bookings, payments, support and platform security.",
    sections: [
      [
        "Information we process",
        "Account and profile details, booking and payment references, listing content, support requests, notification preferences and operational search analytics may be processed to provide the service.",
      ],
      [
        "How information is used",
        "Information is used for authentication, booking fulfilment, fraud prevention, customer support, platform analytics, Host operations and legal or security requirements.",
      ],
      [
        "Payment and external providers",
        "Payment credentials are handled by the configured payment provider. Media and approved AI or weather requests use the providers configured by the platform; sensitive API keys remain on the server.",
      ],
      [
        "Your controls",
        "You can update profile information, manage notifications and contact support for account, booking or privacy questions. Retention and deletion requests remain subject to booking, payment and legal record requirements.",
      ],
    ],
  },
  "/terms": {
    eyebrow: "Terms & Conditions",
    title: "Clear rules for Guests, Hosts and the platform.",
    intro:
      "These Phase-1 terms summarize the operational rules that apply while using hydewest. They are a project-ready product page and should be reviewed by qualified legal counsel before a commercial launch.",
    sections: [
      [
        "Accounts and eligibility",
        "Users must provide accurate information, protect account access and use the platform only for lawful booking, hosting and administration activities.",
      ],
      [
        "Listings and bookings",
        "Hosts are responsible for accurate listing content, availability, rules and fulfilment. Guests must review dates, prices, policies and property rules before confirming a booking.",
      ],
      [
        "Payments, cancellations and refunds",
        "Charges, commissions, Host shares, platform shares and refunds are calculated using the active platform rules and the booking state recorded by the system.",
      ],
      [
        "Platform safety",
        "The platform may review, suspend or remove accounts, listings or activity that violates policies, creates security risks or misuses payments, reviews, support or communication tools.",
      ],
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const page = CONTENT[location.pathname] || CONTENT["/privacy"];

  return (
    <div className="min-h-screen bg-[linear-gradient(155deg,#f8f3ef_0%,#f5f7fb_52%,#fff8ef_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[34px] border border-rose-200/70 bg-slate-950 p-6 text-white shadow-[0_28px_85px_rgba(15,23,42,.18)] sm:p-10"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-300">
            {page.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-black leading-tight sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/60">
            {page.intro}
          </p>
        </motion.header>

        <main className="mt-6 grid gap-4">
          {page.sections.map(([heading, body], index) => (
            <motion.section
              key={heading}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-7"
            >
              <h2 className="text-lg font-black text-slate-950">{heading}</h2>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">{body}</p>
            </motion.section>
          ))}
        </main>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/support"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-[#b20b3b]"
          >
            Contact support
          </Link>
          <Link
            to="/"
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-rose-300 hover:text-[#a90838]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
