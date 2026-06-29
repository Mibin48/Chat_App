import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { SmileIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';

function MessageReactions({ message, onAddReaction, authUserId }) {
    const [showPicker, setShowPicker] = useState(false);
    const { theme } = userChatStore();
    const pickerRef = useRef(null);
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showPicker && pickerRef.current && !pickerRef.current.contains(event.target) && !event.target.closest('.add-reaction-btn')) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPicker]);

    useEffect(() => {
        const handleReactionVisual = (e) => {
            const { messageId, emoji } = e.detail;
            if (messageId !== message._id) return;
            
            const particleCount = 10;
            const newParticles = [];
            const timestamp = Date.now();
            for (let i = 0; i < particleCount; i++) {
                const angle = -Math.PI / 4 - (Math.random() * Math.PI) / 2; // Burst upwards
                const speed = 70 + Math.random() * 60;
                const duration = 380 + Math.random() * 140;
                newParticles.push({
                    id: `${timestamp}-${i}`,
                    emoji,
                    tx: Math.cos(angle) * speed,
                    ty: Math.sin(angle) * speed,
                    rot: (Math.random() - 0.5) * 120,
                    size: 14 + Math.random() * 11,
                    duration,
                });
            }

            setParticles(prev => [...prev, ...newParticles]);

            setTimeout(() => {
                setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 1000);
        };

        window.addEventListener('message-reaction-added', handleReactionVisual);
        return () => {
            window.removeEventListener('message-reaction-added', handleReactionVisual);
        };
    }, [message._id]);

    const handleEmojiClick = (emojiData) => {
        onAddReaction(message._id, emojiData.emoji);
        setShowPicker(false);
    };

    const groupedReactions = message.reactions?.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction.userId);
        return acc;
    }, {}) || {};

    return (
        <div className="relative">
            {/* CSS Hardware-Accelerated Particles */}
            {particles.map(p => (
                <span
                    key={p.id}
                    className="absolute pointer-events-none select-none z-[100] animate-reaction-particle flex items-center justify-center"
                    style={{
                        fontSize: `${p.size}px`,
                        bottom: '8px',
                        right: '8px',
                        '--tx': `${p.tx}px`,
                        '--ty': `${p.ty}px`,
                        '--rot': `${p.rot}deg`,
                        animationDuration: `${p.duration}ms`,
                    }}
                >
                    {p.emoji}
                </span>
            ))}

            {/* Reaction Display */}
            {Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {Object.entries(groupedReactions).map(([emoji, userIds]) => {
                        const hasReacted = userIds.includes(authUserId);
                        const isAmethyst = theme === 'amethyst';
                        
                        let btnClass = "";
                        if (hasReacted) {
                            btnClass = isAmethyst
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                : 'bg-[var(--accent-muted)] border-[var(--border-accent)] text-[var(--text-accent)] hover:brightness-110';
                        } else {
                            btnClass = isAmethyst
                                ? 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-200/80'
                                : 'bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10';
                        }

                        return (
                            <button
                                key={emoji}
                                onClick={() => onAddReaction(message._id, emoji)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border select-none active:scale-90 cursor-pointer ${btnClass}`}
                            >
                                <span className="text-sm leading-none">{emoji}</span>
                                <span className="text-[10px] tabular-nums">{userIds.length}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Add Reaction Button */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className={`add-reaction-btn absolute -bottom-2 -right-2 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-90 border cursor-pointer
                    ${theme === 'amethyst' 
                        ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 shadow-indigo-100/50' 
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-400'
                    }
                `}
                title="Add reaction"
            >
                <SmileIcon size={13} className="stroke-[2.5]" />
            </button>

            {/* Emoji Picker */}
            {showPicker && (
                <div ref={pickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={theme === 'amethyst' ? 'light' : 'dark'}
                        width={300}
                        height={400}
                    />
                </div>
            )}
        </div>
    );
}

export default MessageReactions;
