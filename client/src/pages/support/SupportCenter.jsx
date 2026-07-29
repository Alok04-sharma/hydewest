import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import supportService from "../../services/support.service";
import "./SupportCenter.css";

const FAQS = [
  {
    question: "How do I change booking dates?",
    answer:
      "Open My Bookings and review the booking details. Date changes depend on property availability and Host approval.",
  },
  {
    question: "Where can I download a receipt?",
    answer:
      "Successful booking and membership payments include a PDF receipt in Payment History.",
  },
  {
    question: "How do I contact a Host?",
    answer:
      "Premium Guests can use Host Chat. Booking-related questions can also be raised through a support ticket.",
  },
  {
    question: "How quickly will support respond?",
    answer:
      "Priority tickets are handled first. Standard requests remain visible in your CRM ticket history until they are resolved.",
  },
];

const CATEGORY_OPTIONS = [
  ["booking", "Booking"],
  ["payment", "Payment"],
  ["cancellation", "Cancellation"],
  ["listing", "Listing"],
  ["subscription", "Subscription"],
  ["account", "Account"],
  ["technical", "Technical"],
  ["other", "Other"],
];

const normaliseStatus = (value) =>
  String(value || "open")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export default function SupportCenter() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({
    category: "other",
    subject: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(0);

  const loadTickets = useCallback(async () => {
    if (!isAuthenticated) {
      setTickets([]);
      return;
    }

    try {
      setLoadingTickets(true);
      const response = await supportService.getMine();
      setTickets(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please login to raise a support ticket.");
      return;
    }

    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Please enter a subject and describe the issue.");
      return;
    }

    try {
      setSaving(true);

      await supportService.create({
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      toast.success("Support ticket created.");
      setForm({
        category: "other",
        subject: "",
        message: "",
      });
      await loadTickets();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Support ticket could not be created."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="support-center-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="support-hero relative overflow-hidden rounded-[34px] p-6 sm:p-9"
        >
          <span className="pointer-events-none absolute -right-10 -top-20 text-[13rem] opacity-[0.05]">
            🎧
          </span>

          <p className="support-hero-eyebrow relative text-[10px] font-black uppercase tracking-[0.22em]">
            hydewest CRM Support
          </p>

          <h1 className="support-hero-title relative mt-3 max-w-3xl text-balance text-3xl font-black sm:text-5xl">
            Help, answers and support in one place.
          </h1>

          <p className="support-hero-copy relative mt-3 max-w-2xl text-sm font-semibold leading-7">
            Find practical answers, raise a secure request and track every
            response from the Super Admin support team.
          </p>
        </motion.header>

        <section
          id="help-center"
          className="mt-7 grid items-start gap-6 lg:grid-cols-[1.04fr_.96fr]"
        >
          <section className="support-faq-panel rounded-[30px] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="support-panel-eyebrow text-[10px] font-black uppercase tracking-[0.2em]">
                  Help Centre
                </p>

                <h2 className="support-panel-title mt-2 text-2xl font-black">
                  Frequently asked questions
                </h2>

                <p className="support-panel-copy mt-2 text-sm font-medium leading-6">
                  Select a question to view a clear and practical answer.
                </p>
              </div>

              <span className="support-faq-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl">
                ❓
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {FAQS.map(({ question, answer }, index) => {
                const open = expandedFaq === index;

                return (
                  <article
                    key={question}
                    className={`support-faq-item overflow-hidden rounded-[22px] ${
                      open ? "is-open" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFaq((current) =>
                          current === index ? -1 : index
                        )
                      }
                      className="support-faq-trigger flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                      aria-expanded={open}
                    >
                      <span className="support-faq-question font-black leading-6">
                        {question}
                      </span>

                      <span
                        className={`support-faq-toggle grid h-8 w-8 shrink-0 place-items-center rounded-xl text-lg font-black ${
                          open ? "is-open" : ""
                        }`}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <p className="support-faq-answer px-4 py-4 text-sm font-semibold leading-7 sm:px-5">
                            {answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                );
              })}
            </div>
          </section>

          <form
            id="raise-ticket"
            onSubmit={submit}
            className="support-ticket-panel rounded-[30px] p-5 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="support-ticket-eyebrow text-[10px] font-black uppercase tracking-[0.2em]">
                  Direct CRM Request
                </p>

                <h2 className="support-ticket-title mt-2 text-2xl font-black">
                  Raise Support Ticket
                </h2>

                <p className="support-ticket-copy mt-2 text-sm font-medium leading-6">
                  Your request is securely stored and becomes visible in the
                  Super Admin CRM queue.
                </p>
              </div>

              <span className="support-ticket-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl">
                📨
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="support-field-label mb-2 block text-[10px] font-black uppercase tracking-[0.16em]">
                  Request category
                </span>

                <select
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  className="support-field w-full rounded-2xl px-4 py-3.5 text-sm font-bold outline-none"
                >
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="support-field-label mb-2 block text-[10px] font-black uppercase tracking-[0.16em]">
                  Subject
                </span>

                <input
                  value={form.subject}
                  onChange={(event) =>
                    updateForm("subject", event.target.value)
                  }
                  placeholder="Short summary of the issue"
                  className="support-field w-full rounded-2xl px-4 py-3.5 text-sm font-bold outline-none"
                  maxLength={140}
                />
              </label>

              <label className="block">
                <span className="support-field-label mb-2 block text-[10px] font-black uppercase tracking-[0.16em]">
                  What happened?
                </span>

                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(event) =>
                    updateForm("message", event.target.value)
                  }
                  placeholder="Describe the booking, payment, account or technical issue..."
                  className="support-field support-textarea w-full resize-none rounded-2xl px-4 py-3.5 text-sm font-semibold leading-6 outline-none"
                  maxLength={2000}
                />
              </label>

              <motion.button
                type="submit"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={saving}
                className="support-submit-button w-full rounded-2xl py-3.5 text-sm font-black"
              >
                {saving
                  ? "Creating ticket..."
                  : isAuthenticated
                    ? "Submit support request"
                    : "Login required"}
              </motion.button>
            </div>
          </form>
        </section>

        {isAuthenticated && (
          <section
            id="contact-support"
            className="support-crm-panel mt-7 rounded-[30px] p-5 sm:p-7"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="support-crm-eyebrow text-[10px] font-black uppercase tracking-[0.2em]">
                  CRM History
                </p>

                <h2 className="support-crm-title mt-2 text-2xl font-black">
                  My CRM Requests
                </h2>

                <p className="support-crm-copy mt-2 text-sm font-medium">
                  Track ticket progress and read the latest Super Admin reply.
                </p>
              </div>

              <span className="support-ticket-count w-fit rounded-full px-3 py-1.5 text-xs font-black">
                {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
              </span>
            </div>

            {loadingTickets ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="support-crm-skeleton h-44 rounded-[24px]"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {tickets.map((ticket) => {
                  const status = normaliseStatus(ticket.status);
                  const latestReply = Array.isArray(ticket.replies)
                    ? ticket.replies.at(-1)
                    : null;

                  return (
                    <motion.article
                      key={ticket._id}
                      whileHover={{ y: -3 }}
                      className="support-crm-ticket rounded-[24px] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="support-ticket-number text-sm font-black">
                          {ticket.ticketNumber || "Support request"}
                        </strong>

                        <span
                          className="support-status-badge rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
                          data-status={status}
                        >
                          {status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <h3 className="support-crm-subject mt-4 font-black">
                        {ticket.subject}
                      </h3>

                      <p className="support-crm-message mt-2 line-clamp-3 text-sm font-medium leading-6">
                        {ticket.message}
                      </p>

                      {latestReply && (
                        <div className="support-admin-reply mt-4 rounded-2xl p-3">
                          <p className="support-admin-reply-label text-[9px] font-black uppercase tracking-[0.14em]">
                            Latest reply
                          </p>

                          <p className="support-admin-reply-text mt-1 text-xs font-semibold leading-5">
                            {latestReply.message}
                          </p>
                        </div>
                      )}
                    </motion.article>
                  );
                })}

                {!tickets.length && (
                  <div className="support-empty-state rounded-[24px] px-6 py-12 text-center md:col-span-2">
                    <div className="text-4xl">📭</div>

                    <p className="support-empty-title mt-3 font-black">
                      No support tickets yet
                    </p>

                    <p className="support-empty-copy mt-1 text-sm font-medium">
                      New CRM requests will appear here after submission.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}