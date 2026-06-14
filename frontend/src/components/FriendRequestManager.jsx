import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { userChatStore } from "../store/userChatStore";
import { XIcon, SearchIcon, UserPlusIcon, CheckIcon, XCircle, UsersIcon, UserCheck, Clock } from "lucide-react";

function FriendRequestManager({ onClose }) {
  const {
    pendingRequests,
    getPendingRequests,
    sentRequests,
    getSentRequests,
    blockedUsers,
    getBlockedUsers,
    unblockUser,
    searchResults,
    isSearchingUsers,
    searchUsersGlobally,
    sendFriendRequest,
    respondToFriendRequest,
    theme,
  } = userChatStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("search"); // "search", "pending", or "sent"

  useEffect(() => {
    getPendingRequests();
    getSentRequests();
    getBlockedUsers();
  }, [getPendingRequests, getSentRequests, getBlockedUsers]);

  // Debounced/delayed search on query change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchUsersGlobally(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, searchUsersGlobally]);

  const handleSendRequest = async (userId) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      // Re-trigger search to update state in results
      searchUsersGlobally(searchQuery);
      getSentRequests(); // Refresh sent list as well
    }
  };

  const handleRespond = async (requestId, status) => {
    const success = await respondToFriendRequest(requestId, status);
    if (success && searchQuery) {
      searchUsersGlobally(searchQuery);
    }
  };

  const isAmethyst = theme === "amethyst";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative w-full sm:max-w-lg h-full sm:h-auto overflow-hidden flex flex-col max-h-screen sm:max-h-[85vh] shadow-2xl animate-fade-in rounded-none sm:rounded-[24px]"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-panel)",
          backdropFilter: "blur(24px)",
          fontFamily: "var(--font-body)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 sm:p-5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2.5">
            <UsersIcon size={20} style={{ color: "var(--accent-primary)" }} />
            <h3
              className="font-bold text-base sm:text-lg tracking-tight"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              Manage Contacts & Friends
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-icon hover:rotate-90 transition-transform duration-200 p-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex p-1 mx-3 sm:mx-5 mt-4 rounded-xl border flex-shrink-0"
          style={{
            background: "var(--bg-input)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5
              ${
                activeTab === "search"
                  ? "bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            `}
          >
            <SearchIcon size={13} />
            <span className="hidden xs:inline">Find Friends</span>
            <span className="xs:hidden">Find</span>
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 relative
              ${
                activeTab === "pending"
                  ? "bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            `}
          >
            <UserCheck size={13} />
            <span className="hidden xs:inline">Pending</span>
            <span className="xs:hidden">Pending</span>
            {pendingRequests.length > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold animate-pulse ml-1"
                style={{
                  background: "var(--danger-color, #ef4444)",
                  color: "#ffffff",
                }}
              >
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("sent");
              getSentRequests();
            }}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5
              ${
                activeTab === "sent"
                  ? "bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            `}
          >
            <Clock size={13} />
            <span className="hidden xs:inline">Sent</span>
            <span className="xs:hidden">Sent</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("blocked");
              getBlockedUsers();
            }}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5
              ${
                activeTab === "blocked"
                  ? "bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            `}
          >
            <XCircle size={13} />
            <span>Blocked</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-[300px]">
          {activeTab === "search" ? (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <SearchIcon
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-secondary)" }}
                />
                <input
                  type="text"
                  placeholder="Search globally by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                  style={{
                    background: "var(--bg-input-search)",
                    border: "1.5px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Search results */}
              <div className="space-y-2">
                {isSearchingUsers ? (
                  <div className="py-10 text-center text-xs flex flex-col items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <div className="w-6 h-6 border-2 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
                    <span>Searching users...</span>
                  </div>
                ) : searchQuery.trim() === "" ? (
                  <div className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                    Type a name or email address to find users globally.
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                    No users found matching "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 rounded-xl border transition-all duration-200"
                      style={{
                        background: "var(--bg-glass)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover border"
                          style={{ borderColor: "var(--border-subtle)" }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {user.fullName}
                          </h4>
                          <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Relationship status action */}
                      <div>
                        {user.relationship === "friends" && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(16,185,129,0.15)",
                              color: "var(--online-color)",
                            }}
                          >
                            <CheckIcon size={12} /> Friends
                          </span>
                        )}

                        {user.relationship === "sent-pending" && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(245,158,11,0.15)",
                              color: "var(--warning-color, #f59e0b)",
                            }}
                          >
                            Requested
                          </span>
                        )}

                        {user.relationship === "sent-declined" && (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                color: "var(--danger-color, #ef4444)",
                              }}
                            >
                              Declined
                            </span>
                            <button
                              onClick={() => handleSendRequest(user._id)}
                              className="btn-primary py-1 px-3.5 text-xs flex items-center gap-1.5 active:scale-95"
                            >
                              <UserPlusIcon size={13} />
                              Resend
                            </button>
                          </div>
                        )}

                        {user.relationship === "blocked-by-you" && (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                color: "var(--danger-color, #ef4444)",
                              }}
                            >
                              Blocked
                            </span>
                            <button
                              onClick={() => unblockUser(user._id).then(() => searchUsersGlobally(searchQuery))}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-600 hover:bg-zinc-550 text-white transition-all active:scale-95 border border-[var(--border-subtle)]"
                              style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                            >
                              Unblock
                            </button>
                          </div>
                        )}

                        {user.relationship === "blocked-by-them" && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "var(--danger-color, #ef4444)",
                            }}
                          >
                            Blocked
                          </span>
                        )}

                        {user.relationship === "received-pending" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleRespond(user.requestId, "accepted")}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespond(user.requestId, "declined")}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 transition-all active:scale-95"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {user.relationship === "none" && (
                          <button
                            onClick={() => handleSendRequest(user._id)}
                            className="btn-primary py-1 px-3.5 text-xs flex items-center gap-1.5 active:scale-95"
                          >
                            <UserPlusIcon size={13} />
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "pending" ? (
            /* Pending tab */
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="py-16 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  No pending friend requests.
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex items-center justify-between p-3 rounded-xl border transition-all duration-200"
                    style={{
                      background: "var(--bg-glass)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={request.sender.profilePic || "/avatar.png"}
                        alt={request.sender.fullName}
                        className="w-10 h-10 rounded-full object-cover border"
                        style={{ borderColor: "var(--border-subtle)" }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {request.sender.fullName}
                        </h4>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {request.sender.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(request._id, "accepted")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95 flex items-center gap-1"
                      >
                        <CheckIcon size={12} /> Accept
                      </button>
                      <button
                        onClick={() => handleRespond(request._id, "declined")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 transition-all active:scale-95 flex items-center gap-1"
                      >
                        <XCircle size={12} /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            ) : activeTab === "sent" ? (
            /* Sent requests tab */
            <div className="space-y-3">
              {sentRequests.length === 0 ? (
                <div className="py-16 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  No sent friend requests.
                </div>
              ) : (
                sentRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex items-center justify-between p-3 rounded-xl border transition-all duration-200"
                    style={{
                      background: "var(--bg-glass)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={request.receiver.profilePic || "/avatar.png"}
                        alt={request.receiver.fullName}
                        className="w-10 h-10 rounded-full object-cover border"
                        style={{ borderColor: "var(--border-subtle)" }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {request.receiver.fullName}
                        </h4>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {request.receiver.email}
                        </p>
                      </div>
                    </div>

                    <div>
                      {request.status === "pending" && (
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(245,158,11,0.15)",
                            color: "var(--warning-color, #f59e0b)",
                          }}
                        >
                          Pending
                        </span>
                      )}
                      {request.status === "accepted" && (
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(16,185,129,0.15)",
                            color: "var(--online-color)",
                          }}
                        >
                          Accepted
                        </span>
                      )}
                      {request.status === "declined" && (
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: "rgba(239,68,68,0.15)",
                            color: "var(--danger-color)",
                          }}
                        >
                          Declined
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Blocked tab */
            <div className="space-y-3">
              {blockedUsers.length === 0 ? (
                <div className="py-16 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  No blocked users.
                </div>
              ) : (
                blockedUsers.map((blockedUser) => (
                  <div
                    key={blockedUser._id}
                    className="flex items-center justify-between p-3 rounded-xl border transition-all duration-200"
                    style={{
                      background: "var(--bg-glass)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={blockedUser.profilePic || "/avatar.png"}
                        alt={blockedUser.fullName}
                        className="w-10 h-10 rounded-full object-cover border"
                        style={{ borderColor: "var(--border-subtle)" }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {blockedUser.fullName}
                        </h4>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {blockedUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => unblockUser(blockedUser._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-600 hover:bg-zinc-500 text-white transition-all active:scale-95 border border-[var(--border-subtle)]"
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default FriendRequestManager;
