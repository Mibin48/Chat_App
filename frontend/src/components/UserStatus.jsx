import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { SmileIcon, XIcon } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';
import { userChatStore } from '../store/userChatStore';

function UserStatus() {
    const { authUser, updateStatus } = userAuthStore();
    const { theme } = userChatStore();
    const [showStatusEditor, setShowStatusEditor] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [customStatus, setCustomStatus] = useState(authUser?.customStatus || '');
    const [statusEmoji, setStatusEmoji] = useState(authUser?.statusEmoji || '');
    const [isFocused, setIsFocused] = useState(false);

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
                className="flex items-center gap-2 px-3.5 py-2 w-full text-left transition-all hover:bg-[var(--bg-glass-hover)] border-y border-transparent"
                style={{ fontFamily: 'Inter, sans-serif' }}
            >
                {authUser?.statusEmoji && <span className="text-base">{authUser.statusEmoji}</span>}
                <span 
                    className="text-xs truncate flex-1 font-medium transition-colors"
                    style={{ color: authUser?.customStatus ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                    {authUser?.customStatus || 'Set a custom status...'}
                </span>
            </button>

            {/* Status Editor Modal */}
            {showStatusEditor && (
                <>
                    <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => {
                            setShowEmojiPicker(false);
                            setShowStatusEditor(false);
                        }} 
                    />
                    <div 
                        className="absolute top-full left-2.5 right-2.5 mt-1.5 rounded-xl p-3.5 shadow-xl z-50 border theme-transition animate-fade-in"
                        style={{ 
                            background: 'var(--bg-surface)', 
                            borderColor: 'var(--border-medium)', 
                            boxShadow: 'var(--shadow-glass)' 
                        }}
                    >
                        <h3 className="text-xs font-semibold mb-2.5" style={{ color: 'var(--text-primary)' }}>
                            Set your status
                        </h3>

                        <div className="flex items-center gap-1.5 mb-3">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2.5 rounded-lg transition-colors border flex items-center justify-center hover:bg-[var(--bg-glass-hover)]"
                                style={{ 
                                    background: 'var(--bg-input)', 
                                    borderColor: 'var(--border-subtle)', 
                                    color: 'var(--text-primary)' 
                                }}
                            >
                                {statusEmoji || <SmileIcon size={16} style={{ color: 'var(--text-secondary)' }} />}
                            </button>
                            <input
                                type="text"
                                value={customStatus}
                                onChange={(e) => setCustomStatus(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="What's your status?"
                                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none border transition-all"
                                style={{ 
                                    background: 'var(--bg-input)', 
                                    borderColor: isFocused ? 'var(--accent-primary)' : 'var(--border-subtle)', 
                                    color: 'var(--text-primary)',
                                    boxShadow: isFocused ? '0 0 0 2px var(--accent-muted)' : 'none'
                                }}
                                maxLength={100}
                            />
                        </div>

                        {showEmojiPicker && (
                            <div className="mb-3 rounded-xl overflow-hidden">
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    theme={theme === 'amethyst' ? 'light' : 'dark'}
                                    width="100%"
                                    height={240}
                                    previewConfig={{ showPreview: false }}
                                    searchDisabled
                                />
                            </div>
                        )}

                        <div className="flex gap-1.5">
                            <button
                                onClick={handleSaveStatus}
                                className="flex-1 px-3 py-2 rounded-lg transition-all text-xs font-semibold hover:opacity-90"
                                style={{ 
                                    background: 'var(--accent-primary)', 
                                    color: '#ffffff'
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={handleClearStatus}
                                className="px-3 py-2 rounded-lg transition-colors text-xs font-semibold border hover:bg-[var(--bg-glass-hover)]"
                                style={{ 
                                    background: 'var(--bg-input)', 
                                    borderColor: 'var(--border-subtle)', 
                                    color: 'var(--text-primary)' 
                                }}
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => {
                                    setShowEmojiPicker(false);
                                    setShowStatusEditor(false);
                                }}
                                className="p-2 rounded-lg transition-colors border flex items-center justify-center hover:bg-[var(--bg-glass-hover)]"
                                style={{ 
                                    background: 'var(--bg-input)', 
                                    borderColor: 'var(--border-subtle)', 
                                    color: 'var(--text-secondary)' 
                                }}
                            >
                                <XIcon size={14} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default UserStatus;
