import { useState, useRef } from "react";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import { Camera, Save, User, Mail, Send, ArrowLeft, Trash2, AlertTriangle, Smile, Info, Phone, MapPin, Calendar, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router";
import ThemePicker from "../components/ThemePicker";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { playReceivedSound } from "../lib/soundUtils";

const SettingsPage = () => {
    const { authUser, updateProfile, isUpdatingProfile, updateStatus, logout, deleteAccount, isDeletingAccount } = userAuthStore();
    const { theme } = userChatStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const [fullName, setFullName] = useState(authUser?.fullName || "");
    const [bio, setBio] = useState(authUser?.bio || "");
    const [sfxEnabled, setSfxEnabled] = useState(localStorage.getItem('aether-chat-sfx-enabled') !== 'false');
    const [phone, setPhone] = useState(authUser?.phone || "");
    const [location, setLocation] = useState(authUser?.location || "");
    const [dob, setDob] = useState(authUser?.dob ? new Date(authUser.dob).toISOString().substring(0, 10) : "");
    const [customStatus, setCustomStatus] = useState(authUser?.customStatus || "");
    const [statusEmoji, setStatusEmoji] = useState(authUser?.statusEmoji || "");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState("");

    const handleDeleteAccount = async () => {
        if (confirmEmail !== authUser?.email) {
            return toast.error("Emails do not match");
        }
        const success = await deleteAccount();
        if (success) {
            setShowDeleteModal(false);
            navigate("/login");
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
            setSelectedImg(reader.result);
        };
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        // Check if anything changed
        const hasProfileChanged =
            selectedImg !== null ||
            fullName !== authUser.fullName ||
            bio !== (authUser.bio || "") ||
            phone !== (authUser.phone || "") ||
            location !== (authUser.location || "") ||
            dob !== (authUser.dob ? new Date(authUser.dob).toISOString().substring(0, 10) : "");

        const hasStatusChanged =
            customStatus !== (authUser.customStatus || "") ||
            statusEmoji !== (authUser.statusEmoji || "");

        if (!hasProfileChanged && !hasStatusChanged) {
            return toast.error("No changes detected");
        }

        try {
            if (hasProfileChanged) {
                await updateProfile({
                    profilePic: selectedImg || undefined,
                    fullName: fullName !== authUser.fullName ? fullName : undefined,
                    bio: bio !== (authUser.bio || "") ? bio : undefined,
                    phone: phone !== (authUser.phone || "") ? phone : undefined,
                    location: location !== (authUser.location || "") ? location : undefined,
                    dob: dob !== (authUser.dob ? new Date(authUser.dob).toISOString().substring(0, 10) : "") ? dob : undefined,
                });
            }
            if (hasStatusChanged) {
                await updateStatus(customStatus, statusEmoji);
            }
            setSelectedImg(null);
        } catch (error) {
            console.error("Save error:", error);
        }
    };

    return (
        <div
            className="fixed inset-0 flex flex-col w-full h-full overflow-hidden theme-transition"
            style={{ background: 'transparent', fontFamily: 'Inter, sans-serif' }}
        >
            {/* Header */}
            <header
                className="h-16 flex items-center justify-between px-4 sm:px-6 border-b flex-shrink-0 theme-transition"
                style={{
                    background: 'var(--bg-glass)',
                    borderColor: 'var(--border-subtle)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/")}
                        className="btn-icon p-2 rounded-xl"
                        title="Back to Chats"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <img src="/logo.png" alt="Aether Chat Logo" className="w-10 h-10 object-contain animate-pulse" />
                    <div>
                        <h1 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
                        <p className="text-[10px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>Manage your profile & theme preferences</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/10 text-red-400 border border-transparent hover:border-red-500/20 transition-all"
                >
                    Logout
                </button>
            </header>

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">

                {/* LEFT SIDE - Profile & Theme Settings Form */}
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start">
                    <div className="w-full max-w-md space-y-6">

                        {/* Profile Info Form Card */}
                        <div
                            className="p-6 rounded-2xl border theme-transition"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
                        >
                            <h2
                                className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-6"
                            >
                                Profile Information
                            </h2>

                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        className="relative group cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div
                                            className="size-24 rounded-full overflow-hidden border-2 transition-all duration-300 group-hover:scale-105"
                                            style={{ borderColor: 'var(--border-medium)', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}
                                        >
                                            <img
                                                src={selectedImg || authUser.profilePic || "/avatar.png"}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Camera className="w-7 h-7 text-white" />
                                        </div>
                                        <div
                                            className="absolute bottom-0.5 right-0.5 p-1.5 rounded-full shadow-md border group-hover:scale-110 transition-transform duration-200"
                                            style={{ background: 'var(--accent-primary)', borderColor: 'var(--bg-surface)' }}
                                        >
                                            <Camera className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        Click avatar to choose a new photo
                                    </p>
                                </div>

                                {/* Inputs Section */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="auth-input-label">Full Name</label>
                                        <div className="relative">
                                            <User className="auth-input-icon" style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="aether-input"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="auth-input-label">Email Address</label>
                                        <div className="relative">
                                            <Mail className="auth-input-icon" style={{ color: 'var(--accent-primary)', opacity: 0.4 }} />
                                            <input
                                                type="email"
                                                value={authUser.email}
                                                disabled
                                                className="aether-input cursor-not-allowed opacity-60"
                                                style={{ cursor: 'not-allowed' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Set Status */}
                                    <div>
                                        <label className="auth-input-label">Set Status</label>
                                        <div className="flex gap-2 relative">
                                            <div className="relative flex-1">
                                                <Smile className="auth-input-icon" style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                                <input
                                                    type="text"
                                                    value={customStatus}
                                                    onChange={(e) => setCustomStatus(e.target.value)}
                                                    className="aether-input"
                                                    placeholder="What's your status?"
                                                    maxLength={100}
                                                />
                                            </div>

                                            {/* Status Emoji Button */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center border text-lg hover:bg-[var(--bg-glass-hover)] transition-all flex-shrink-0"
                                                    style={{
                                                        background: 'var(--bg-input-search)',
                                                        borderColor: 'var(--border-subtle)',
                                                        color: 'var(--text-primary)'
                                                    }}
                                                >
                                                    {statusEmoji || "😀"}
                                                </button>
                                                {showEmojiPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                                                        <div className="absolute right-0 bottom-12 z-50 shadow-2xl">
                                                            <EmojiPicker
                                                                theme={theme === 'amethyst' ? 'light' : 'dark'}
                                                                onEmojiClick={(emojiData) => {
                                                                    setStatusEmoji(emojiData.emoji);
                                                                    setShowEmojiPicker(false);
                                                                }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* About */}
                                    <div>
                                        <label className="auth-input-label">About (Bio)</label>
                                        <div className="relative">
                                            <Info className="absolute left-3.5 top-3 w-4 h-4" style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                            <textarea
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                className="aether-input h-15 py-2.5 resize-none font-sans"
                                                style={{ paddingLeft: '2.5rem' }}
                                                placeholder="Tell us about yourself..."
                                                maxLength={100}
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div>
                                        <label className="auth-input-label">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="auth-input-icon" style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="aether-input"
                                                placeholder="Enter your phone number"
                                            />
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <label className="auth-input-label">Location</label>
                                        <div className="relative">
                                            <MapPin className="auth-input-icon" style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="aether-input"
                                                placeholder="Enter your location"
                                            />
                                        </div>
                                    </div>

                                    {/* Date of Birth */}
                                    <div>
                                        <label className="auth-input-label">Date of Birth</label>
                                        <div className="relative">
                                            <Calendar className="auth-input-icon" style={{ color: 'var(--accent-primary)', opacity: 0.6 }} />
                                            <input
                                                type="date"
                                                value={dob}
                                                onChange={(e) => setDob(e.target.value)}
                                                className="aether-input font-sans"
                                                style={{ colorScheme: theme === 'amethyst' ? 'light' : 'dark' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className="auth-btn flex items-center justify-center gap-2 mt-2"
                                    style={{
                                        background: 'var(--accent-primary)',
                                        color: '#ffffff',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
                                >
                                    <Save className="size-4" />
                                    <span>{isUpdatingProfile ? "Saving..." : "Save Changes"}</span>
                                </button>
                            </form>
                        </div>

                        {/* Theme Switcher Card */}
                        <div
                            className="p-8 rounded-3xl glass-container border theme-transition"
                            style={{ background: 'var(--bg-glass-panel)', backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
                        >
                            <h2
                                className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-1"
                            >
                                Theme Settings
                            </h2>
                            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                                Choose a visual style that matches your environment
                            </p>
                            <ThemePicker showLabels={true} />
                        </div>

                        {/* Sound Settings Card */}
                        <div
                            className="p-8 rounded-3xl glass-container border theme-transition"
                            style={{ background: 'var(--bg-glass-panel)', backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
                        >
                            <h2
                                className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-1"
                            >
                                Sound Settings
                            </h2>
                            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                                Configure audio notification alerts for events and messages
                            </p>
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                                        style={{
                                            background: sfxEnabled ? 'var(--accent-muted)' : 'rgba(239, 68, 68, 0.1)',
                                            color: sfxEnabled ? 'var(--accent-primary)' : 'var(--danger-color)'
                                        }}
                                    >
                                        {sfxEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sound Effects (SFX)</p>
                                        <p className="text-[10px] opacity-75" style={{ color: 'var(--text-secondary)' }}>Play tones on messages and connection updates</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextValue = !sfxEnabled;
                                        setSfxEnabled(nextValue);
                                        localStorage.setItem('aether-chat-sfx-enabled', String(nextValue));
                                        if (nextValue) {
                                            setTimeout(() => playReceivedSound(), 100);
                                        }
                                    }}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${sfxEnabled ? 'bg-gray-650' : 'bg-zinc-700'}`}
                                >
                                    <span className="sr-only">Toggle SFX</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${sfxEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Account Information / About Card */}
                        <div
                            className="p-6 rounded-2xl border theme-transition"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
                        >
                            <h2
                                className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-4"
                            >
                                Account Details
                            </h2>
                            <div className="space-y-3.5 text-xs">
                                <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Member Since</span>
                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Account Status</span>
                                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--online-color)' }}>
                                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--online-color)', boxShadow: '0 0 8px var(--online-color)' }} />
                                        Active
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span style={{ color: 'var(--text-secondary)' }}>App Version</span>
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                                        v4.2.0-glass
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone Card */}
                        <div
                            className="p-6 rounded-2xl border border-red-500/10 theme-transition"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-glass)' }}
                        >
                            <h2
                                className="text-lg font-bold tracking-tight text-red-400 mb-1"
                            >
                                Danger Zone
                            </h2>
                            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                                Permanently delete your account and remove all personal messages, groups, and files.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(true)}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all active:scale-[0.98]"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Account</span>
                            </button>
                        </div>

                    </div>
                </div>

                {/* RIGHT SIDE - Interactive Live Theme Preview */}
                <div
                    className="hidden md:flex md:w-1/2 p-6 sm:p-8 flex-col justify-center items-center border-l theme-transition"
                    style={{ background: 'var(--bg-glass)', borderColor: 'var(--border-subtle)' }}
                >
                    <div className="max-w-sm w-full space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Live Theme Preview</h3>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>See colors shift instantly in real time</p>
                        </div>

                        {/* Mock Chat UI container */}
                        <div
                            className="border rounded-2xl p-4 shadow-xl flex flex-col gap-4 theme-transition"
                            style={{
                                background: 'var(--bg-surface)',
                                borderColor: 'var(--border-medium)',
                                boxShadow: 'var(--shadow-glass)'
                            }}
                        >
                            {/* Mock Chat Header */}
                            <div className="flex items-center gap-3 border-b pb-3 theme-transition" style={{ borderColor: 'var(--border-subtle)' }}>
                                <div
                                    className="size-9 rounded-full overflow-hidden border theme-transition"
                                    style={{ borderColor: 'var(--border-medium)' }}
                                >
                                    <img src="/logo.png" alt="Mock User" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Aether AI</h4>
                                    <p className="text-[10px]" style={{ color: 'var(--online-color)' }}>Online</p>
                                </div>
                            </div>

                            {/* Mock Chat Messages */}
                            <div className="space-y-3">
                                {/* Received message */}
                                <div className="flex justify-start">
                                    <div
                                        className="max-w-[85%] rounded-2xl rounded-bl-none p-3 text-xs border theme-transition shadow-sm"
                                        style={{
                                            background: 'var(--bg-bubble-other)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-subtle)'
                                        }}
                                    >
                                        <p>Hey! Tap any theme above. See the interface adapt instantly?</p>
                                        <span className="text-[9px] mt-1.5 block" style={{ color: 'var(--text-muted)' }}>10:14 AM</span>
                                    </div>
                                </div>

                                {/* Sent message */}
                                <div className="flex justify-end">
                                    <div
                                        className="max-w-[85%] rounded-2xl rounded-br-none p-3 text-xs theme-transition shadow-md"
                                        style={{
                                            background: 'var(--bg-bubble-own)',
                                            color: '#ffffff'
                                        }}
                                    >
                                        <p>Wow, that is amazing! The {theme} mode styling looks incredible here. 🔥</p>
                                        <span className="text-[9px] mt-1.5 block text-right text-white/70">10:15 AM</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mock Chat Input */}
                            <div className="mt-2 flex gap-2">
                                <div
                                    className="flex-1 rounded-lg h-9 border theme-transition"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
                                />
                                <div
                                    className="size-9 rounded-lg flex items-center justify-center theme-transition"
                                    style={{ background: 'var(--accent-muted)', color: 'var(--accent-primary)' }}
                                >
                                    <Send size={15} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Deletion Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in animate-duration-200">
                        <div
                            className="w-full max-w-md p-6 rounded-2xl border theme-transition shadow-2xl animate-scale-in"
                            style={{
                                background: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
                            }}
                        >
                            <div className="flex items-center gap-3 text-red-400 mb-4">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold tracking-tight">Delete Account Permanently?</h3>
                            </div>

                            <p className="text-xs mb-4 leading-relaxed text-zinc-400">
                                This action is **irreversible**. Your profile, direct messages, files, and group associations will be permanently deleted from our servers.
                            </p>

                            <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-300/90 mb-4 space-y-1">
                                <p className="font-semibold">Account Cleanup Details:</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li>All your sent messages and attachments will be deleted.</li>
                                    <li>All 1-to-1 chats involving you will be permanently cleared.</li>
                                    <li>You will be removed from all groups.</li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                                    To confirm, type your email address <span className="text-zinc-200 font-semibold select-all">{authUser?.email}</span> below:
                                </label>
                                <input
                                    type="text"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    className="aether-input text-xs w-full py-2.5 px-3 rounded-xl"
                                    placeholder={authUser?.email}
                                    disabled={isDeletingAccount}
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setConfirmEmail("");
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 border border-white/5 transition-all"
                                    disabled={isDeletingAccount}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={confirmEmail !== authUser?.email || isDeletingAccount}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${confirmEmail === authUser?.email && !isDeletingAccount
                                        ? 'bg-red-500 text-white hover:bg-red-650 active:scale-[0.98]'
                                        : 'bg-red-500/20 text-red-400/50 cursor-not-allowed border border-red-500/10'
                                        }`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isDeletingAccount ? "Deleting..." : "Permanently Delete"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SettingsPage;
