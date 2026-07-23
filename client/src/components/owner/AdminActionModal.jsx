import React from "react";
import { FiAlertTriangle, FiCheckCircle, FiTrash2, FiX } from "react-icons/fi";

const ACTION_CONFIG = {
  approve: {
    title: "Approve Listing",
    description:
      "Listing public Home, Search aur Guest Property Details pages par visible ho jayegi.",
    button: "Approve Listing",
    icon: FiCheckCircle,
    panel: "border-emerald-200 bg-emerald-50 text-emerald-800",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700",
    requiresReason: false,
  },
  suspend: {
    title: "Suspend Listing",
    description:
      "Listing turant Guest Home, Search aur public details se hide ho jayegi.",
    button: "Suspend Listing",
    icon: FiAlertTriangle,
    panel: "border-amber-200 bg-amber-50 text-amber-800",
    buttonClass: "bg-amber-600 hover:bg-amber-700",
    requiresReason: true,
  },
  remove: {
    title: "Remove Listing",
    description:
      "Listing soft-remove hogi. Historical booking data safe rahega, lekin property platform par visible nahi hogi.",
    button: "Remove Listing",
    icon: FiTrash2,
    panel: "border-red-200 bg-red-50 text-red-800",
    buttonClass: "bg-red-600 hover:bg-red-700",
    requiresReason: true,
  },
};

export default function AdminActionModal({
  action,
  listing,
  reason,
  setReason,
  loading,
  onClose,
  onConfirm,
}) {
  if (!action || !listing) {
    return null;
  }

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  const reasonValid = !config.requiresReason || reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">{config.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{listing.title}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX />
          </button>
        </div>

        <div className={`mt-5 flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${config.panel}`}>
          <Icon className="mt-1 shrink-0" />
          <p>{config.description}</p>
        </div>

        {config.requiresReason && (
          <>
            <label className="mt-5 block text-sm font-bold text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Minimum 10 characters me clear reason likhein..."
              className="mt-2 w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />

            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>Minimum 10 characters</span>
              <span>{reason.length}/500</span>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !reasonValid}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${config.buttonClass}`}
          >
            {loading ? "Processing..." : config.button}
          </button>
        </div>
      </div>
    </div>
  );
}