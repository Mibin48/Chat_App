import { useEffect } from "react";
import { userChatStore } from "../store/userChatStore";
import { useCallStore } from "../store/useCallStore";
import { userAuthStore } from "../store/userAuthStore";
import { Phone, Video, PhoneMissed, PhoneCall, Trash2 } from "lucide-react";
import UserLoadingSkeleton from "./UserLoadingSkeleton";

function RecentCallsList({ onSelectCall }) {
  const { callHistory, getCallHistory, isCallHistoryLoading, setSelectedUser, setActiveTab, sidebarSearchQuery, deleteMessage } = userChatStore();
  const { authUser, onlineUsers } = userAuthStore();
  const { initiateCall } = useCallStore();

  useEffect(() => {
    getCallHistory();
  }, [getCallHistory]);

  if (isCallHistoryLoading) return <UserLoadingSkeleton />;

  // Filter out any invalid items
  const validCalls = (callHistory || []).filter(c => c.callInfo && c.senderId && c.recieverId);

  const filteredCalls = validCalls.filter(call => {
    const partner = call.senderId._id === authUser._id ? call.recieverId : call.senderId;
    return partner.fullName?.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
  });

  if (filteredCalls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center select-none w-full animate-fade-in my-6">
        <div 
          className="glass-panel p-7 rounded-3xl flex flex-col items-center gap-5 shadow-xl relative overflow-hidden w-full max-w-[290px] border"
          style={{
            background: 'var(--bg-glass-panel)',
            borderColor: 'var(--border-subtle)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div 
            className="absolute w-20 h-20 rounded-full blur-[35px] opacity-15 pointer-events-none"
            style={{
              background: 'var(--accent-primary)',
              top: '5%',
              left: '30%',
            }}
          />

          <div className="relative">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 animate-float overflow-hidden"
              style={{ 
                background: 'var(--accent-muted)', 
                border: '1.5px solid var(--border-accent)',
                boxShadow: '0 0 24px var(--accent-glow)'
              }}
            >
              <Phone size={24} className="text-[var(--accent-primary)]" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 z-10">
            <h4
              className="text-sm font-black tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              No Recent Calls
            </h4>
            <p
              className="text-[11px] leading-relaxed max-w-[220px] mx-auto"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            >
              Your call history is empty. Start a voice or video call with your contacts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatCallTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleRowClick = (partner) => {
    setSelectedUser(partner);
    setActiveTab("chats");
    if (onSelectCall) onSelectCall();
  };

  return (
    <div className="space-y-0.5">
      {filteredCalls.map((call) => {
        const partner = call.senderId._id === authUser._id ? call.recieverId : call.senderId;
        const isOnline = onlineUsers?.includes(partner._id);
        const { type, status, duration } = call.callInfo;
        const isOutgoing = call.senderId._id === authUser._id;

        let statusColor = "var(--text-muted)";
        let StatusIcon = PhoneCall;
        let callLabel = "";

        if (status === "missed") {
          statusColor = "#ef4444";
          StatusIcon = PhoneMissed;
          callLabel = isOutgoing ? "Outgoing Missed" : "Incoming Missed";
        } else if (status === "rejected") {
          statusColor = "#f59e0b";
          StatusIcon = PhoneMissed;
          callLabel = isOutgoing ? "Outgoing Declined" : "Incoming Declined";
        } else {
          statusColor = "#10b981";
          StatusIcon = type === "video" ? Video : PhoneCall;
          const direction = isOutgoing ? "Outgoing" : "Incoming";
          if (duration < 60) {
            callLabel = `${direction} - < 1 min`;
          } else {
            const mins = Math.floor(duration / 60);
            callLabel = `${direction} - ${mins} min`;
          }
        }

        return (
          <div
            key={call._id}
            className="chat-item group relative flex items-center justify-between"
            onClick={() => handleRowClick(partner)}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div
                  className="w-11 h-11 rounded-full overflow-hidden transition-all duration-200"
                  style={{ border: `2px solid ${statusColor}`, padding: '1px', background: 'var(--bg-surface)' }}
                >
                  <img
                    src={partner.profilePic || "/avatar.png"}
                    alt={partner.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isOnline && (
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                    style={{ background: 'var(--online-color)', border: '2px solid var(--bg-surface)', boxShadow: '0 0 5px var(--online-color)' }}
                  />
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h4
                  className="font-semibold text-sm truncate leading-tight tracking-tight"
                  style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}
                >
                  {partner.fullName}
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <StatusIcon size={12} style={{ color: statusColor }} />
                  <span 
                    className="text-[11px] truncate leading-none"
                    style={{ color: statusColor, fontWeight: status === 'missed' ? 'bold' : 'normal' }}
                  >
                    {callLabel}
                  </span>
                  <span className="text-[10px] text-zinc-500 leading-none">•</span>
                  <span className="text-[10px] text-zinc-500 leading-none">
                    {formatCallTime(call.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => initiateCall(partner, type)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-[var(--bg-glass-hover)] border border-white/5 hover:bg-[var(--accent-primary)] text-zinc-300 hover:text-white"
                title={`Call back (${type})`}
              >
                {type === "video" ? <Video size={14} /> : <Phone size={14} />}
              </button>

              <button
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this call log?")) {
                    await deleteMessage(call._id);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-[var(--bg-glass-hover)] border border-white/5 hover:bg-rose-600 hover:text-white text-zinc-400"
                title="Delete call log"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RecentCallsList;
