import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { SmileIcon, XIcon } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';

function UserStatus() {
    const { authUser, updateStatus } = userAuthStore();
    const [showStatusEditor, setShowStatusEditor] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [customStatus, setCustomStatus] = useState(authUser?.customStatus || '');
    const [statusEmoji, setStatusEmoji] = useState(authUser?.statusEmoji || '');

    const handleSaveStatus = async () => {
        await updateStatus(customStatus, statusEmoji);
        setShowStatusEditor(false);
    };

    const handleClearStatus = async () => {
        await updateStatus('', '');
        setCustomStatus('');
        setStatusEmoji('');
        setShowStatusEditor(false);
    };

    const handleEmojiClick = (emojiData) => {
        setStatusEmoji(emojiData.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="relative">
            {/* Status Display */}
            <button
                onClick={() => {
                    setCustomStatus(authUser?.customStatus || '');
                    setStatusEmoji(authUser?.statusEmoji || '');
                    setShowStatusEditor(!showStatusEditor);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800/50 rounded-lg transition-colors w-full text-left"
            >
                {authUser?.statusEmoji && <span className="text-lg">{authUser.statusEmoji}</span>}
                <span className="text-sm text-slate-300 truncate flex-1">
                    {authUser?.customStatus || 'Set a status'}
                </span>
            </button>

            {/* Status Editor */}
            {showStatusEditor && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl z-50">
                    <h3 className="text-sm font-medium text-slate-200 mb-3">Set your status</h3>

                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            {statusEmoji || <SmileIcon size={20} className="text-slate-400" />}
                        </button>
                        <input
                            type="text"
                            value={customStatus}
                            onChange={(e) => setCustomStatus(e.target.value)}
                            placeholder="What's your status?"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                            maxLength={100}
                        />
                    </div>

                    {showEmojiPicker && (
                        <div className="mb-3">
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                theme="dark"
                                width="100%"
                                height={300}
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveStatus}
                            className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleClearStatus}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setShowStatusEditor(false)}
                            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserStatus;
