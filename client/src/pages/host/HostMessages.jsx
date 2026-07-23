import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiArrowLeft,
  FiMessageCircle,
  FiSend,
} from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import chatService from "../../services/chat.service";
import { getSocket } from "../../services/socket.service";

const DEFAULT_GUEST_AVATAR =
  "https://placehold.co/100x100?text=Guest";

const avatarUrl = (avatar) => {
  if (typeof avatar === "string" && avatar.trim()) {
    return avatar;
  }

  if (avatar?.url) {
    return avatar.url;
  }

  return DEFAULT_GUEST_AVATAR;
};

const messageTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function PremiumBadge({ compact = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 font-black uppercase tracking-wide text-amber-700 ${
        compact
          ? "gap-1 px-2 py-0.5 text-[9px]"
          : "gap-1.5 px-2.5 py-1 text-[10px]"
      }`}
    >
      <span aria-hidden="true">👑</span>
      Premium
    </span>
  );
}

export default function HostMessages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const user = useSelector((state) => state.auth.user);

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          String(conversation._id) === String(conversationId)
      ),
    [conversations, conversationId]
  );

  const loadConversations = async () => {
    try {
      const response = await chatService.getConversations();

      const items = Array.isArray(response?.data)
        ? response.data
        : [];

      setConversations(items);

      if (!conversationId && items.length > 0) {
        navigate(`/host/messages/${items[0]._id}`, {
          replace: true,
        });
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Chat conversations load nahi hui."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const handleNewMessage = ({
      conversationId: incomingConversationId,
      message,
    }) => {
      if (
        String(incomingConversationId) ===
          String(conversationId) &&
        message
      ) {
        setMessages((currentMessages) => {
          const messageAlreadyExists = currentMessages.some(
            (currentMessage) =>
              String(currentMessage._id) ===
              String(message._id)
          );

          if (messageAlreadyExists) {
            return currentMessages;
          }

          return [...currentMessages, message];
        });
      }

      loadConversations();
    };

    socket.on("chat:new-message", handleNewMessage);

    return () => {
      socket.off("chat:new-message", handleNewMessage);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return undefined;
    }

    let componentIsActive = true;

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);

        const response =
          await chatService.getMessages(conversationId);

        if (!componentIsActive) {
          return;
        }

        setMessages(
          Array.isArray(response?.data)
            ? response.data
            : []
        );
      } catch (error) {
        if (componentIsActive) {
          toast.error(
            error.response?.data?.message ||
              "Messages load nahi hue."
          );
        }
      } finally {
        if (componentIsActive) {
          setMessagesLoading(false);
        }
      }
    };

    loadMessages();

    const socket = getSocket();

    if (socket) {
      socket.emit("chat:join", conversationId);
    }

    return () => {
      componentIsActive = false;

      if (socket) {
        socket.emit("chat:leave", conversationId);
      }
    };
  }, [conversationId]);

  const sendMessage = async (event) => {
    event.preventDefault();

    const cleanedMessage = text.trim();

    if (
      !conversationId ||
      !cleanedMessage ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      const response = await chatService.sendMessage(
        conversationId,
        cleanedMessage
      );

      const sentMessage = response?.data;

      if (sentMessage) {
        setMessages((currentMessages) => {
          const messageAlreadyExists = currentMessages.some(
            (currentMessage) =>
              String(currentMessage._id) ===
              String(sentMessage._id)
          );

          if (messageAlreadyExists) {
            return currentMessages;
          }

          return [...currentMessages, sentMessage];
        });
      }

      setText("");
      loadConversations();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Message send nahi hua."
      );
    } finally {
      setSending(false);
    }
  };

  const handleMessageKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage(event);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-transparent px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mx-auto grid min-h-[calc(100vh-130px)] max-w-7xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.16)] lg:grid-cols-[350px_minmax(0,1fr)]"
      >
        {/* Conversation list */}
        <aside
          className={`${
            conversationId
              ? "hidden lg:block"
              : "block"
          } min-w-0 border-r border-slate-200 bg-white`}
        >
          <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-rose-950 to-[#FF385C] p-5 text-white sm:p-6">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-rose-200">
              <span aria-hidden="true">👑</span>
              Premium chat
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Guest messages
            </h1>

            <p className="mt-2 text-xs leading-5 text-white/65">
              Premium guests ke questions aur booking
              conversations yahan manage karein.
            </p>
          </div>

          <div className="staynest-scrollbar max-h-[calc(100vh-300px)] overflow-y-auto lg:max-h-[calc(100vh-230px)]">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="flex gap-3 rounded-2xl p-3"
                    >
                      <div className="skeleton-shimmer h-12 w-12 shrink-0 rounded-2xl" />

                      <div className="flex-1 space-y-2">
                        <div className="skeleton-shimmer h-3 rounded-full" />
                        <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conversation) => {
                const conversationIsActive =
                  String(conversationId) ===
                  String(conversation._id);

                return (
                  <Link
                    key={conversation._id}
                    to={`/host/messages/${conversation._id}`}
                    className={`group flex gap-3 border-b border-slate-100 p-4 transition ${
                      conversationIsActive
                        ? "bg-rose-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl(
                          conversation.guest?.avatar
                        )}
                        alt={
                          conversation.guest?.name ||
                          "Guest"
                        }
                        className="h-12 w-12 rounded-2xl bg-slate-100 object-cover shadow-sm"
                        onError={(event) => {
                          event.currentTarget.src =
                            DEFAULT_GUEST_AVATAR;
                        }}
                      />

                      <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-amber-400 text-[9px] shadow-sm">
                        👑
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-slate-900">
                          {conversation.guest?.name ||
                            "Premium Guest"}
                        </p>

                        {Number(
                          conversation.unreadForHost || 0
                        ) > 0 && (
                          <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#FF385C] px-1.5 text-[10px] font-black text-white">
                            {conversation.unreadForHost}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                        {conversation.apartment?.title ||
                          "Property conversation"}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-600">
                        {conversation.lastMessage ||
                          "Conversation started"}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-50 text-3xl">
                  💬
                </div>

                <h2 className="mt-4 font-black text-slate-900">
                  No conversations yet
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Premium Guest ka message aate hi
                  conversation yahan appear hogi.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Active chat */}
        <main
          className={`${
            !conversationId
              ? "hidden lg:flex"
              : "flex"
          } min-h-[70vh] min-w-0 flex-col bg-slate-50`}
        >
          {activeConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 bg-white p-3 sm:p-4">
                <Link
                  to="/host/messages"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-rose-50 hover:text-[#FF385C] lg:hidden"
                  aria-label="Back to conversations"
                >
                  <FiArrowLeft aria-hidden="true" />
                </Link>

                <img
                  src={avatarUrl(
                    activeConversation.guest?.avatar
                  )}
                  alt={
                    activeConversation.guest?.name ||
                    "Guest"
                  }
                  className="h-11 w-11 shrink-0 rounded-2xl bg-slate-100 object-cover shadow-sm"
                  onError={(event) => {
                    event.currentTarget.src =
                      DEFAULT_GUEST_AVATAR;
                  }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-black text-slate-950">
                      {activeConversation.guest?.name ||
                        "Premium Guest"}
                    </h2>

                    <PremiumBadge compact />
                  </div>

                  <p className="truncate text-xs font-semibold text-slate-500">
                    {activeConversation.apartment?.title ||
                      "Property conversation"}
                  </p>
                </div>
              </header>

              <div className="staynest-scrollbar flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
                {messagesLoading ? (
                  <div className="space-y-4">
                    <div className="skeleton-shimmer h-16 w-3/5 rounded-2xl" />

                    <div className="ml-auto skeleton-shimmer h-20 w-2/3 rounded-2xl" />

                    <div className="skeleton-shimmer h-14 w-1/2 rounded-2xl" />
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const messageSenderId =
                        message.sender?._id ||
                        message.sender;

                      const ownMessage =
                        String(messageSenderId) ===
                        String(user?._id);

                      return (
                        <motion.div
                          key={message._id}
                          initial={{
                            opacity: 0,
                            y: 8,
                            scale: 0.98,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.98,
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                          className={`flex ${
                            ownMessage
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%] ${
                              ownMessage
                                ? "rounded-br-md bg-gradient-to-r from-[#FF385C] to-rose-600 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {message.text}
                            </p>

                            <p
                              className={`mt-1 text-right text-[9px] font-bold ${
                                ownMessage
                                  ? "text-rose-100"
                                  : "text-slate-400"
                              }`}
                            >
                              {messageTime(
                                message.createdAt
                              )}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}

                {!messagesLoading &&
                  messages.length === 0 && (
                    <div className="grid min-h-[48vh] place-items-center text-center">
                      <div>
                        <FiMessageCircle
                          aria-hidden="true"
                          className="mx-auto text-5xl text-slate-300"
                        />

                        <h3 className="mt-4 text-lg font-black text-slate-800">
                          Start the conversation
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          Neeche message box se Guest ko
                          reply karein.
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              <form
                onSubmit={sendMessage}
                className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 sm:p-4"
              >
                <textarea
                  rows={1}
                  value={text}
                  onChange={(event) =>
                    setText(event.target.value)
                  }
                  onKeyDown={handleMessageKeyDown}
                  placeholder="Write a message..."
                  className="max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                />

                <motion.button
                  type="submit"
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.96,
                  }}
                  disabled={
                    !text.trim() || sending
                  }
                  className="flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 text-white shadow-lg transition hover:bg-[#FF385C] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-5"
                >
                  <FiSend aria-hidden="true" />

                  <span className="hidden text-sm font-black sm:inline">
                    {sending ? "Sending..." : "Send"}
                  </span>
                </motion.button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <div>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-gradient-to-br from-rose-100 to-violet-100 text-4xl">
                  💬
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">
                  Select a conversation
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Premium guests ke messages aur
                  property questions yahan appear
                  honge.
                </p>
              </div>
            </div>
          )}
        </main>
      </motion.div>
    </div>
  );
}