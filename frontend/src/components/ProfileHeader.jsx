import { useState, useRef } from 'react';
import { LogOutIcon, VolumeOffIcon, Volume2Icon, UserPlusIcon } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';
import { userChatStore } from '../store/userChatStore';
import UserStatus from './UserStatus';
import CreateGroupModal from './CreateGroupModal';

function ProfileHeader() {
    const { logout, authUser, updateProfile, onlineUsers } = userAuthStore();
    const { isSoundEnabled, toggleSound } = userChatStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const fileInputRef = useRef(null);

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

    const iconBtnBase = {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '32px', height: '32px',
        border: 'none', cursor: 'pointer',
        borderRadius: 'var(--radius-icon)',
        transition: 'all 0.2s ease',
        background: 'transparent',
        color: 'var(--text-muted)',
        flexShrink: 0,
    };

    return (
        <div
            style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
            }}
        >
            <div className="px-3.5 pt-4 pb-2.5">
                <div className="flex items-center justify-between gap-2">

                    {/* Avatar + info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div
                            className="relative group cursor-pointer flex-shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div
                                className="rounded-full overflow-hidden transition-all duration-300 group-hover:scale-105"
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    border: '2px solid var(--accent-primary)',
                                    boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
                                }}
                            >
                                <img
                                    src={selectedImg || authUser.profilePic || '/avatar.png'}
                                    alt={authUser.fullName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Edit overlay */}
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <span style={{ fontSize: '9px', color: '#fff', fontWeight: 600 }}>Edit</span>
                            </div>
                            {/* Online dot */}
                            <span
                                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                                style={{
                                    background: 'var(--online-color)',
                                    border: '2px solid var(--bg-surface)',
                                    boxShadow: '0 0 6px var(--online-color)',
                                }}
                            />
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                        </div>

                        <div className="flex flex-col min-w-0">
                            <h3
                                className="truncate leading-tight"
                                style={{
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                {authUser.fullName}
                            </h3>
                            {onlineCount > 0 && (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        color: 'var(--online-color)',
                                        fontFamily: 'var(--font-body)',
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {onlineCount} online
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                            style={iconBtnBase}
                            onClick={() => setIsCreateGroupOpen(true)}
                            title="Create Group Chat"
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--text-accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <UserPlusIcon size={16} />
                        </button>
                        <button
                            style={{
                                ...iconBtnBase,
                                ...(isSoundEnabled ? { color: 'var(--accent-primary)', background: 'var(--accent-muted)' } : {}),
                            }}
                            onClick={toggleSound}
                            title={isSoundEnabled ? 'Mute sounds' : 'Enable sounds'}
                            onMouseEnter={e => { if (!isSoundEnabled) { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--text-accent)'; } }}
                            onMouseLeave={e => { if (!isSoundEnabled) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                        >
                            {isSoundEnabled ? <Volume2Icon size={16} /> : <VolumeOffIcon size={16} />}
                        </button>
                        <button
                            style={iconBtnBase}
                            onClick={logout}
                            title="Logout"
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'var(--danger-color)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <LogOutIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <UserStatus />
            {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />}
        </div>
    );
}

export default ProfileHeader;