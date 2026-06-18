import React, { useEffect, useState } from "react";
import { userChatStore } from "../store/userChatStore";
import { userAuthStore } from "../store/userAuthStore";
import { UserIcon, MessageSquareIcon, UserPlusIcon, CheckIcon, ClockIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function ContactCardBubble({ msg, isOwn }) {
  const {
    allContacts,
    pendingRequests,
    sentRequests,
    sendFriendRequest,
    respondToFriendRequest,
    setSelectedUser,
    getPendingRequests,
    getSentRequests,
    getAllContacts,
    theme
  } = userChatStore();

  const { authUser } = userAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sharedContact = msg.sharedContact;

  // Sync request statuses when component mounts
  useEffect(() => {
    const syncRequests = async () => {
      try {
        await Promise.all([getPendingRequests(), getSentRequests(), getAllContacts()]);
      } catch (err) {
        console.error("Failed to sync friend requests:", err);
      }
    };
    if (sharedContact?.userId) {
      syncRequests();
    }
  }, [sharedContact?.userId]);

  if (!sharedContact) {
    return (
      <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold">
        Invalid Contact Card
      </div>
    );
  }

  const { userId, fullName, email, profilePic } = sharedContact;
  const isMe = userId && authUser?._id && userId.toString() === authUser._id.toString();
  const isFriend = allContacts.some(c => {
    const cId = (c._id || c).toString();
    return cId === userId?.toString();
  });

  // Find incoming request
  const incomingReq = pendingRequests.find(r => {
    const senderId = typeof r.senderId === "object" ? r.senderId._id : r.senderId;
    return senderId && userId && senderId.toString() === userId.toString();
  });

  // Find outgoing request
  const outgoingReq = sentRequests.find(r => {
    const receiverId = typeof r.receiverId === "object" ? r.receiverId._id : r.receiverId;
    return receiverId && userId && receiverId.toString() === userId.toString();
  });

  const handleMessageClick = () => {
    const contactUser = allContacts.find(c => c._id === userId);
    if (contactUser) {
      setSelectedUser(contactUser);
    } else {
      // Fallback: create mock user from card details if not in allContacts but we want to message them
      setSelectedUser({
        _id: userId,
        fullName,
        email,
        profilePic
      });
    }
  };

  const handleAddContactClick = async () => {
    setIsRefreshing(true);
    await sendFriendRequest(userId);
    await getSentRequests();
    setIsRefreshing(false);
  };

  const handleAcceptRequestClick = async () => {
    if (!incomingReq) return;
    setIsRefreshing(true);
    await respondToFriendRequest(incomingReq._id, "accepted");
    setIsRefreshing(false);
  };

  // Glassmorphic styling rules matching Aether themes
  const cardBg = isOwn
    ? "rgba(255, 255, 255, 0.08)"
    : theme === "amethyst"
    ? "rgba(255, 255, 255, 0.9)"
    : "rgba(255, 255, 255, 0.04)";

  const cardBorder = isOwn
    ? "rgba(255, 255, 255, 0.12)"
    : theme === "amethyst"
    ? "rgba(99, 102, 241, 0.12)"
    : "rgba(255, 255, 255, 0.06)";

  const textPrimary = isOwn
    ? "#ffffff"
    : "var(--text-primary)";

  const textSecondary = isOwn
    ? "rgba(255, 255, 255, 0.7)"
    : "var(--text-secondary)";

  return (
    <div
      className="p-3.5 rounded-[18px] border flex flex-col gap-3 min-w-[240px] max-w-[280px] shadow-sm select-none"
      style={{
        background: cardBg,
        borderColor: cardBorder,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)"
      }}
    >
      {/* Contact Details */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {profilePic ? (
            <img
              src={profilePic}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10"
              style={{
                background: isOwn ? "rgba(255,255,255,0.15)" : "var(--accent-muted)"
              }}
            >
              <UserIcon
                size={22}
                style={{ color: isOwn ? "#ffffff" : "var(--accent-primary)" }}
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold truncate"
            style={{ color: textPrimary, fontFamily: "var(--font-body)" }}
          >
            {fullName}
          </p>
          <p
            className="text-[11px] truncate mt-0.5"
            style={{ color: textSecondary, fontFamily: "var(--font-body)" }}
          >
            {email || "No email provided"}
          </p>
        </div>
      </div>

      {/* Dynamic Action Button */}
      <div className="mt-0.5">
        {isMe ? (
          <div
            className="text-center py-1.5 px-3 rounded-xl text-xs font-bold bg-white/5 border border-white/10"
            style={{ color: textSecondary }}
          >
            Your Contact Profile
          </div>
        ) : isFriend ? (
          <button
            onClick={handleMessageClick}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-98 shadow-sm cursor-pointer"
            style={{
              background: isOwn ? "rgba(255, 255, 255, 0.2)" : "var(--accent-muted)",
              border: isOwn ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid var(--border-accent)",
              color: isOwn ? "#ffffff" : "var(--accent-primary)"
            }}
          >
            <MessageSquareIcon size={13} />
            View Contact
          </button>
        ) : incomingReq ? (
          <button
            onClick={handleAcceptRequestClick}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-98 shadow-sm text-white cursor-pointer"
            style={{
              background: "var(--online-color)",
              border: "1px solid rgba(16, 185, 129, 0.3)"
            }}
          >
            <CheckIcon size={13} className="stroke-[2.5]" />
            Accept Request
          </button>
        ) : outgoingReq ? (
          <div
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-white/5 border border-transparent select-none"
            style={{ color: textSecondary }}
          >
            <ClockIcon size={12} />
            Request Sent
          </div>
        ) : (
          <button
            onClick={handleAddContactClick}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-98 shadow-sm cursor-pointer"
            style={{
              background: isOwn ? "rgba(255, 255, 255, 0.2)" : "var(--accent-muted)",
              border: isOwn ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid var(--border-accent)",
              color: isOwn ? "#ffffff" : "var(--accent-primary)"
            }}
          >
            <UserPlusIcon size={13} />
            Add Contact
          </button>
        )}
      </div>
    </div>
  );
}
