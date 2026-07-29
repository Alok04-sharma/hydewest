import React from "react";
import { Link } from "react-router-dom";

export default function Footer({ compact = false }) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${compact ? "py-7" : "py-9"}`}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div><Link to="/" className="text-xl font-black lowercase tracking-tight">hydewest</Link><p className="mt-2 text-xs text-white/45">Simple travel discovery with direct platform support.</p></div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-white/65">
            <Link to="/support#help-center" className="hover:text-white">Help Center</Link>
            <Link to="/support#contact-support" className="hover:text-white">Contact Support</Link>
            <Link to="/support#raise-ticket" className="hover:text-white">Raise Support Ticket</Link>
            <Link to="/support#help-center" className="hover:text-white">FAQ</Link>
          </nav>
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs font-semibold text-white/40 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 hydewest. All rights reserved.</p><div className="flex gap-4"><Link to="/privacy" className="hover:text-white">Privacy Policy</Link><Link to="/terms" className="hover:text-white">Terms & Conditions</Link></div></div>
      </div>
    </footer>
  );
}