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
        className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-fade-in"
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border-medium)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <UsersIcon size={20} style={{ color: "var(--accent-primary)" }} />
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              Create Chat Group
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div 
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: "var(--bg-input)",
                  border: "2px dashed var(--border-medium)",
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="Group avatar" className="w-full h-full object-cover" />
                ) : (
                  <UsersIcon size={32} style={{ color: "var(--text-muted)" }} />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon size={18} className="text-white" />
              </div>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
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
                className="w-full px-3.5 py-2 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
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
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl text-sm outline-none transition-all resize-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
              />
            </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
              Select Group Members ({selectedMembers.length} selected)
            </label>

            <div 
              className="rounded-xl max-h-[160px] overflow-y-auto divide-y divide-white/5 border custom-scrollbar"
              style={{
                background: "var(--bg-input)",
                borderColor: "var(--border-subtle)",
              }}
            >
              {allContacts.length === 0 ? (
                <div className="p-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  No contacts found.
                </div>
              ) : (
                allContacts.map((contact) => {
                  const isChecked = selectedMembers.includes(contact._id);
                  return (
                    <div 
                      key={contact._id}
                      onClick={() => toggleMember(contact._id)}
                      className="flex items-center gap-3 p-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <img 
                          src={contact.profilePic || "/avatar.png"} 
                          alt={contact.fullName} 
                          className="w-8 h-8 rounded-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {contact.fullName}
                        </p>
                      </div>
                      <div 
                        className="w-5 h-5 rounded-md flex items-center justify-center border transition-all"
                        style={{
                          background: isChecked ? "var(--accent-primary)" : "transparent",
                          borderColor: isChecked ? "transparent" : "var(--border-medium)",
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
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: "var(--bg-glass-hover)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all text-white"
              style={{
                background: "var(--accent-primary)",
                boxShadow: "0 2px 10px var(--accent-glow)",
              }}
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
