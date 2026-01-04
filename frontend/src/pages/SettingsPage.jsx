import { useState, useRef } from "react";
import { userAuthStore } from "../store/userAuthStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import { Camera, Save, User, Mail, Send } from "lucide-react";
import toast from "react-hot-toast";

const SettingsPage = () => {
    const { authUser, updateProfile, isUpdatingProfile } = userAuthStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const [fullName, setFullName] = useState(authUser?.fullName || "");
    const fileInputRef = useRef(null);

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

        // If no changes
        if (!selectedImg && fullName === authUser.fullName) {
            return toast.error("No changes detected");
        }

        await updateProfile({
            profilePic: selectedImg,
            fullName: fullName !== authUser.fullName ? fullName : undefined
        });

        // Clear selected image after successful update if needed, 
        // but keeping it might be better UI feedback until page refresh.
        // For now, we rely on authUser update to show new state.
        setSelectedImg(null);
    };

    return (
        <div className="flex items-center justify-center p-4 min-h-screen">
            <BorderAnimatedContainer className="relative w-full max-w-6xl h-[calc(100vh-8rem)]">
                <div className="w-full h-full flex flex-col md:flex-row glass-panel overflow-hidden">

                    {/* LEFT SIDE - Profile Settings */}
                    <div className="md:w-1/2 p-8 overflow-y-auto border-r border-white/5 custom-scrollbar">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Settings</h2>
                            <p className="text-slate-400 text-sm mt-1">Manage your account preferences</p>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-sm mx-auto">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="size-24 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-cyan-500 transition-colors shadow-xl">
                                        <img
                                            src={selectedImg || authUser.profilePic || "/avatar.png"}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-cyan-500 p-1.5 rounded-full shadow-lg border border-slate-900 group-hover:scale-110 transition-transform">
                                        <Camera className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                <p className="text-xs text-slate-500">Click to update profile picture</p>
                            </div>

                            {/* Info Section */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-1.5 block flex items-center gap-2">
                                        <User className="size-4 text-cyan-400" /> Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-slate-800/50 text-slate-100 border border-slate-700/50 rounded-lg px-4 py-2.5 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder-slate-500"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-1.5 block flex items-center gap-2">
                                        <Mail className="size-4 text-cyan-400" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={authUser.email}
                                        disabled
                                        className="w-full bg-slate-800/20 text-slate-400 border border-slate-700/50 rounded-lg px-4 py-2.5 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="size-4" /> Save Changes
                            </button>
                        </form>
                    </div>

                    {/* RIGHT SIDE - Theme Preview */}
                    <div className="md:w-1/2 p-8 bg-slate-900/30 flex flex-col justify-center items-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 to-blue-900/10 pointer-events-none" />

                        <div className="max-w-md w-full space-y-6 relative z-10">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-200">Theme Preview</h3>
                                <p className="text-slate-400 text-sm mt-1">Glassmorphism & Cyan Accents</p>
                            </div>

                            {/* Mock Chat UI */}
                            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
                                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                    <div className="size-10 rounded-full bg-slate-700 overflow-hidden">
                                        <img src="/avatar.png" alt="User" className="w-full h-full object-cover opacity-80" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-200">John Doe</h4>
                                        <p className="text-xs text-cyan-500">Online</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Received Message */}
                                    <div className="flex justify-start">
                                        <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-slate-800/80 p-3 text-sm text-slate-100 border border-slate-700/50 shadow-sm">
                                            <p>Hey! This theme looks amazing 🤩</p>
                                            <span className="text-[10px] text-slate-500 mt-1 block">10:00 AM</span>
                                        </div>
                                    </div>

                                    {/* Sent Message */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[80%] rounded-2xl rounded-br-none bg-gradient-to-r from-cyan-600 to-blue-600 p-3 text-sm text-white border border-cyan-500/20 shadow-lg">
                                            <p>Totally! The glassmorphism effect is 🔥</p>
                                            <span className="text-[10px] text-cyan-100/70 mt-1 block text-right">10:01 AM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mock Input */}
                                <div className="mt-2 flex gap-2">
                                    <div className="flex-1 bg-slate-800/50 rounded-lg h-10 border border-slate-700/50" />
                                    <div className="size-10 bg-cyan-600/20 rounded-lg flex items-center justify-center text-cyan-400">
                                        <Send size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </BorderAnimatedContainer>
        </div>
    );
};

export default SettingsPage;
