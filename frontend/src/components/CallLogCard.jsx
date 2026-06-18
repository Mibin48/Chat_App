import React from "react";
import { useCallStore } from "../store/useCallStore";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import { Phone, Video, PhoneCall, PhoneMissed } from "lucide-react";

export default function CallLogCard({ msg, isOwn }) {
  const { type, status, duration } = msg.callInfo;
  const { initiateCall } = useCallStore();
  const { authUser, onlineUsers } = userAuthStore();
  const { blockedUsers, selectedUser } = userChatStore();

  // Resolve partner string ID and full user object accurately
  const senderId = msg.senderId?._id || msg.senderId;
  const receiverId = msg.recieverId?._id || msg.recieverId;
  const partnerId = senderId === authUser?._id ? receiverId : senderId;

  let partner = senderId === authUser?._id ? msg.recieverId : msg.senderId;
  if (partnerId && (!partner || typeof partner !== "object" || !partner.fullName) && selectedUser && selectedUser._id === partnerId) {
    partner = selectedUser;
  }

  // Determine block and online states
  const isOnline = partnerId && onlineUsers?.includes(partnerId);
  const isBlocked = partnerId && blockedUsers?.some(u => (u._id || u) === partnerId);
  const isDisableCallback = !isOnline || isBlocked;

  let statusColor = "var(--text-muted)";
  let StatusIcon = PhoneCall;
  let callLabel = "";

  if (status === "missed") {
    statusColor = isOwn ? "#f87171" : "var(--danger-color)";
    StatusIcon = PhoneMissed;
    callLabel = isOwn ? "Outgoing Missed" : "Missed Call";
  } else if (status === "rejected") {
    statusColor = isOwn ? "#fbbf24" : "var(--warning-color)";
    StatusIcon = PhoneMissed;
    callLabel = isOwn ? "Declined Call" : "Incoming Declined";
  } else {
    statusColor = isOwn ? "#34d399" : "var(--online-color)";
    StatusIcon = type === "video" ? Video : PhoneCall;
    if (duration === 0) {
      callLabel = "Connected - Less than a minute";
    } else if (duration < 60) {
      callLabel = "Connected - Less than a minute";
    } else {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      callLabel = `Connected - ${mins}m ${secs}s`;
    }
  }

  const handleCallBack = (e) => {
    e.stopPropagation();
    if (partnerId && !isDisableCallback) {
      initiateCall(partner, type);
    }
  };

  let btnTitle = `Call back (${type})`;
  if (isBlocked) {
    btnTitle = "Cannot call blocked user";
  } else if (!isOnline) {
    btnTitle = "User is offline";
  }

  const cardTitle = msg.isEdited && msg.text ? msg.text : (type === "video" ? "Video Call" : "Voice Call");

  const btnBackground = isOwn
    ? (isDisableCallback ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.2)')
    : (isDisableCallback ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)' : 'var(--accent-primary)');

  const btnColor = isOwn
    ? (isDisableCallback ? 'rgba(255, 255, 255, 0.45)' : '#ffffff')
    : (isDisableCallback ? 'var(--text-muted)' : '#ffffff');

  const btnBorder = isOwn
    ? 'rgba(255, 255, 255, 0.15)'
    : 'var(--border-subtle)';

  return (
    <div 
      className="flex flex-col gap-3 p-3.5 rounded-2xl border select-none animate-fade-in"
      style={{
        minWidth: '220px',
        maxWidth: '300px',
        background: isOwn ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-glass-panel, rgba(30, 30, 50, 0.45))',
        borderColor: isOwn ? 'rgba(255, 255, 255, 0.18)' : 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center relative flex-shrink-0"
          style={{
            background: isOwn ? 'rgba(255, 255, 255, 0.15)' : 'var(--accent-muted, rgba(99, 102, 241, 0.1))',
            border: `1.5px solid ${isOwn ? 'rgba(255, 255, 255, 0.25)' : 'var(--border-accent, rgba(99, 102, 241, 0.2))'}`,
          }}
        >
          {type === "video" ? (
            <Video size={18} className={isOwn ? "text-white" : "text-[var(--accent-primary)]"} />
          ) : (
            <Phone size={18} className={isOwn ? "text-white" : "text-[var(--accent-primary)]"} />
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold truncate capitalize leading-tight" style={{ color: isOwn ? '#ffffff' : 'var(--text-primary)' }}>
              {cardTitle}
            </p>
            {msg.isEdited && (
              <span className="text-[9px] text-zinc-400 font-medium italic opacity-70" title="Call name edited">
                (edited)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusIcon size={12} style={{ color: statusColor }} />
            <span className="text-[11px] truncate leading-none" style={{ color: statusColor }}>
              {callLabel}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleCallBack}
        disabled={isDisableCallback}
        className={`w-full py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 border flex items-center justify-center gap-1.5
          ${isDisableCallback ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          background: btnBackground,
          borderColor: btnBorder,
          color: btnColor,
          boxShadow: (isDisableCallback || isOwn) ? 'none' : '0 2px 8px var(--accent-glow)',
          fontFamily: 'var(--font-body)'
        }}
        title={btnTitle}
        onMouseEnter={e => {
          if (!isOwn && !isDisableCallback) e.currentTarget.style.background = 'var(--accent-hover)';
          else if (isOwn && !isDisableCallback) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
        }}
        onMouseLeave={e => {
          if (!isOwn && !isDisableCallback) e.currentTarget.style.background = 'var(--accent-primary)';
          else if (isOwn && !isDisableCallback) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
      >
        {type === "video" ? <Video size={12} /> : <Phone size={12} />}
        <span>{isBlocked ? "Blocked" : (!isOnline ? "Offline" : "Call Back")}</span>
      </button>
    </div>
  );
}
