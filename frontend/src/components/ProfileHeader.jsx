import { useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, UserPlusIcon } from "lucide-react";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import UserStatus from "./UserStatus";
import CreateGroupModal from "./CreateGroupModal";

function ProfileHeader() {
    const { logout, authUser, updateProfile } = userAuthStore();
    const { isSoundEnabled, toggleSound } = userChatStore();
    const { onlineUsers } = userAuthStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Online user count (excluding self)
    const onlineCount = onlineUsers.filter(id => id !== authUser._id).length;

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Image = reader.result;
            setSelectedImg(base64Image);
            await updateProfile({ profilePic: base64Image });
        };
    };

    return (
        <div
            className="border-b"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-glass)' }}
        >
            {/* Main header row */}
            <div className="px-3 pt-3 pb-2">
                <div className="flex items-center justify-between gap-2">

                    {/* Avatar + info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar with edit overlay */}
                        <div
                            className="relative group cursor-pointer flex-shrink-0"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <div
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden transition-all duration-200 group-hover:ring-2"
                                style={{ border: '2px solid var(--border-medium)', ringColor: 'var(--accent-primary)' }}
                            >
                                <img
                                    src={selectedImg || authUser.profilePic || "/avatar.png"}
                                    alt={authUser.fullName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Edit overlay */}
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] text-white font-semibold">Edit</span>
                            </div>
                            {/* Online dot */}
                            <span
                                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 animate-pulse"
                                style={{ background: 'var(--online-color)', ringColor: 'var(--bg-sidebar)' }}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Name + online count */}
                        <div className="flex flex-col min-w-0">
                            <h3
                                className="font-semibold text-sm truncate leading-tight"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {authUser.fullName}
                            </h3>
                            {onlineCount > 0 && (
                                <span
                                    className="text-[10px] font-medium leading-tight"
                                    style={{ color: 'var(--online-color)' }}
                                >
                                    {onlineCount} online
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        {/* Create group */}
                        <button
                            className="btn-icon p-1.5 sm:p-2 rounded-lg"
                            onClick={() => setIsCreateGroupOpen(true)}
                            title="Create Group Chat"
                        >
                            <UserPlusIcon size={16} />
                        </button>

                        {/* Sound toggle */}
                        <button
                            className="btn-icon p-1.5 sm:p-2 rounded-lg"
                            onClick={toggleSound}
                            title={isSoundEnabled ? "Mute sounds" : "Enable sounds"}
                            style={isSoundEnabled ? { color: 'var(--accent-primary)', background: 'var(--accent-muted)' } : {}}
                        >
                            {isSoundEnabled ? <Volume2Icon size={16} /> : <VolumeOffIcon size={16} />}
                        </button>

                        {/* Logout */}
                        <button
                            className="btn-icon p-1.5 sm:p-2 rounded-lg"
                            onClick={logout}
                            title="Logout"
                            style={{ '--hover-color': 'var(--danger-color)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger-color)'}
                            onMouseLeave={e => e.currentTarget.style.color = ''}
                        >
                            <LogOutIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* User Status */}
            <UserStatus />

            {/* Create Group Modal */}
            {isCreateGroupOpen && (
                <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />
            )}
        </div>
    );
}

export default ProfileHeader;