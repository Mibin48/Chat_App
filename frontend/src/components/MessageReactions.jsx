import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { SmileIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';

function MessageReactions({ message, onAddReaction, authUserId }) {
    const [showPicker, setShowPicker] = useState(false);
    const { theme } = userChatStore();

    const handleEmojiClick = (emojiData) => {
        onAddReaction(message._id, emojiData.emoji);
        setShowPicker(false);
    };

    // Group reactions by emoji
    const groupedReactions = message.reactions?.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction.userId);
        return acc;
    }, {}) || {};

    return (
        <div className="relative">
            {/* Reaction Display */}
            {Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(groupedReactions).map(([emoji, userIds]) => {
                        const hasReacted = userIds.includes(authUserId);
                        return (
                            <button
                                key={emoji}
                                onClick={() => onAddReaction(message._id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${hasReacted
                                        ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                                        : 'bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700'
                                    }`}
                            >
                                <span>{emoji}</span>
                                <span className="text-xs">{userIds.length}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Add Reaction Button */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="absolute -bottom-2 -right-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-slate-600"
                title="Add reaction"
            >
                <SmileIcon size={14} />
            </button>

            {/* Emoji Picker */}
            {showPicker && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPicker(false)}
                    />
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={theme === 'amethyst' ? 'light' : 'dark'}
                            width={300}
                            height={400}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default MessageReactions;
