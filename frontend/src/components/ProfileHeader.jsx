import { useState, useRef } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, SettingsIcon } from "lucide-react";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import { useNavigate } from "react-router";
import UserStatus from "./UserStatus";

function ProfileHeader() {
    const { logout, authUser, updateProfile } = userAuthStore();
    const { isSoundEnabled, toggleSound } = userChatStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const navigate = useNavigate();

    const fileInputRef = useRef(null);

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
        <div className="border-b border-white/5 bg-slate-900/30">
            <div className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* AVATAR */}
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                            <div className="size-10 rounded-full overflow-hidden border border-slate-600 group-hover:border-cyan-500 transition-colors">
                                <img src={selectedImg || authUser.profilePic || "/avatar.png"} alt="User image" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-white font-medium">Edit</span>
                            </div>
                            <span className="absolute bottom-0 right-0 size-2.5 bg-cyan-500 rounded-full ring-2 ring-slate-900"></span>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                        </div>

                        {/* User Info */}
                        <div className="flex flex-col">
                            <h3 className="text-slate-200 font-medium text-sm truncate max-w-[140px]">{authUser.fullName}</h3>
                            <span className="text-[10px] text-cyan-500 font-medium bg-cyan-500/10 px-1.5 py-0.5 rounded w-fit">Online</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            className={`p-2 rounded-lg transition-colors ${isSoundEnabled ? "text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                            onClick={toggleSound}
                            title={isSoundEnabled ? "Mute sounds" : "Enable sounds"}
                        >
                            {isSoundEnabled ? <Volume2Icon size={18} /> : <VolumeOffIcon size={18} />}
                        </button>
                        <button
                            className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            onClick={() => navigate("/settings")}
                            title="Settings"
                        >
                            <SettingsIcon size={18} />
                        </button>
                        <button
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            onClick={logout}
                            title="Logout"
                        >
                            <LogOutIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* User Status */}
            <UserStatus />
        </div>
    )
}

export default ProfileHeader