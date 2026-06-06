import React, { useState, useEffect, useRef } from "react";
import { XIcon, CameraIcon, UserPlusIcon, UsersIcon, CheckIcon } from "lucide-react";
import { userChatStore } from "../store/userChatStore";
import toast from "react-hot-toast";

function CreateGroupModal({ onClose }) {
  const { allContacts, getAllContacts, createGroup } = userChatStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [avatar, setAvatar] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 3) {
      toast.error("Image must be smaller than 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      await createGroup({
        name,
        description,
        avatar,
        members: selectedMembers,
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-fade-in"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-logo, 24px)",
          boxShadow: "var(--shadow-panel)",
          backdropFilter: "blur(24px)",
          fontFamily: "var(--font-body)",
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2.5">
            <UsersIcon size={20} style={{ color: "var(--accent-primary)" }} />
            <h3 className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              Create Chat Group
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon"
            style={{ color: "var(--text-secondary)" }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2.5">
            <div 
              className="relative group cursor-pointer transition-transform duration-200 active:scale-95" 
              onClick={() => fileInputRef.current?.click()}
            >
              <div 
                className="w-20 h-20 overflow-hidden flex items-center justify-center transition-all duration-200 group-hover:border-[var(--accent-primary)]"
                style={{
                  background: "var(--bg-input-search)",
                  border: "2px dashed var(--border-medium)",
                  borderRadius: "var(--radius-squircle, 14px)",
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="Group avatar" className="w-full h-full object-cover" />
                ) : (
                  <UsersIcon size={32} style={{ color: "var(--text-secondary)" }} />
                )}
              </div>
              <div 
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ borderRadius: "var(--radius-squircle, 14px)" }}
              >
                <CameraIcon size={18} className="text-white" />
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Set Group Avatar
            </span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Group Inputs */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Group Name *
              </label>
              <input
                type="text"
                placeholder="Enter group name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                style={{
                  background: "var(--bg-input-search)",
                  border: "1.5px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Description (Optional)
              </label>
              <textarea
                placeholder="What is this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2.5}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 resize-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                style={{
                  background: "var(--bg-input-search)",
                  border: "1.5px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
              />
            </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                Select Group Members
              </label>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--accent-muted)", color: "var(--text-accent)" }}>
                {selectedMembers.length} selected
              </span>
            </div>

            <div 
              className="rounded-xl max-h-[160px] overflow-y-auto divide-y border custom-scrollbar"
              style={{
                background: "var(--bg-input-search)",
                borderColor: "var(--border-subtle)",
                divideColor: "var(--border-subtle)",
              }}
            >
              {allContacts.length === 0 ? (
                <div className="p-5 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  No contacts found.
                </div>
              ) : (
                allContacts.map((contact) => {
                  const isChecked = selectedMembers.includes(contact._id);
                  return (
                    <div 
                      key={contact._id}
                      onClick={() => toggleMember(contact._id)}
                      className="flex items-center gap-3 p-3 hover:bg-[var(--bg-glass-hover)] cursor-pointer transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <img 
                          src={contact.profilePic || "/avatar.png"} 
                          alt={contact.fullName} 
                          className="w-8 h-8 rounded-full object-cover" 
                          style={{ border: "1.5px solid var(--border-subtle)" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {contact.fullName}
                        </p>
                      </div>
                      <div 
                        className="w-5 h-5 flex items-center justify-center border transition-all duration-200"
                        style={{
                          background: isChecked ? "var(--accent-primary)" : "transparent",
                          borderColor: isChecked ? "transparent" : "var(--border-medium)",
                          borderRadius: "var(--radius-swatch, 6px)",
                          boxShadow: isChecked ? "0 2px 8px var(--accent-glow)" : "none",
                        }}
                      >
                        {isChecked && <CheckIcon size={12} className="text-white font-bold" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              style={{ padding: "0.5rem 1.25rem" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              style={{ padding: "0.5rem 1.25rem" }}
            >
              <UserPlusIcon size={16} />
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupModal;
