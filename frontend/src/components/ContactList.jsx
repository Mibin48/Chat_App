import { useEffect } from "react";
import { userChatStore } from "../store/userChatStore";
import UserLoadingSkeleton from "./UserLoadingSkeleton";
import { userAuthStore } from "../store/userAuthStore";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, selectedUser, isUsersLoading, sidebarSearchQuery } = userChatStore();
  const { onlineUsers } = userAuthStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UserLoadingSkeleton />;

  const filteredContacts = allContacts.filter(contact =>
    contact.fullName?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-0.5">
      {filteredContacts.map((contact) => {
        const isOnline = onlineUsers?.includes(contact._id);
        const isActive = selectedUser?._id === contact._id;

        return (
          <div
            key={contact._id}
            className="chat-item"
            style={isActive ? {
              background: 'var(--accent-muted)',
              borderColor: 'var(--border-accent)',
            } : {}}
            onClick={() => setSelectedUser(contact)}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-full overflow-hidden transition-all duration-200"
                style={{ border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}` }}
              >
                <img
                  src={contact.profilePic || "/avatar.png"}
                  alt={contact.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              {isOnline && (
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2"
                  style={{ background: 'var(--online-color)', ringColor: 'var(--bg-sidebar)' }}
                />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0">
              <h4
                className="font-semibold text-sm truncate leading-tight tracking-tight"
                style={{ color: isActive ? 'var(--text-accent)' : 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}
              >
                {contact.fullName}
              </h4>
              <p 
                className="text-xs truncate leading-tight mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ContactList;