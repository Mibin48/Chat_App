import React, { useState, useEffect } from 'react';
import {
    SearchIcon,
    XIcon,
    CalendarIcon,
    MessageSquareIcon,
    ImageIcon,
    MicIcon,
    FileIcon
} from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { formatFullDateTime } from '../lib/timeUtils';

function SearchBar({ onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeType, setActiveType] = useState('all');
    const { searchMessages, selectedUser } = userChatStore();

    useEffect(() => {
        const delayDebounce = setTimeout(() => { performSearch(); }, 300);
        return () => clearTimeout(delayDebounce);
    }, [query, activeType]);

    const performSearch = async () => {
        if (!query.trim() && activeType === 'all') {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const searchResults = await searchMessages(query, selectedUser?._id, activeType);
            setResults(searchResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleResultClick = (messageId) => {
        onClose();
        setTimeout(() => {
            const element = document.getElementById(`msg-${messageId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('animate-message-highlight');
                setTimeout(() => element.classList.remove('animate-message-highlight'), 2550);
            }
        }, 150);
    };

    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark
                    key={index}
                    style={{
                        background: 'var(--accent-muted)',
                        color: 'var(--text-accent)',
                        borderRadius: '3px',
                        padding: '0 3px',
                    }}
                >
                    {part}
                </mark>
            ) : part
        );
    };

    const filters = [
        { id: 'all', label: 'All', icon: SearchIcon },
        { id: 'text', label: 'Text', icon: MessageSquareIcon },
        { id: 'image', label: 'Images', icon: ImageIcon },
        { id: 'audio', label: 'Voice', icon: MicIcon },
        { id: 'file', label: 'Files', icon: FileIcon },
    ];

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div
                className="p-3.5 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-glass)' }}
            >
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <SearchIcon
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            size={16}
                            style={{ color: 'var(--text-muted)' }}
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={activeType === 'all' ? "Search messages..." : `Search ${activeType}...`}
                            className="w-full rounded-xl text-sm outline-none transition-all"
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                padding: '0.5rem 2.25rem',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            autoFocus
                            onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon p-0.5 rounded-full"
                            >
                                <XIcon size={13} />
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="btn-icon p-2 rounded-xl flex-shrink-0" title="Close">
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {filters.map((f) => {
                        const Icon = f.icon;
                        const isActive = activeType === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setActiveType(f.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                style={{
                                    background: isActive ? 'var(--accent-primary)' : 'var(--bg-glass-hover)',
                                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                    border: `1px solid ${isActive ? 'transparent' : 'var(--border-subtle)'}`,
                                    boxShadow: isActive ? '0 2px 8px var(--accent-glow)' : 'none',
                                }}
                            >
                                <Icon size={11} />
                                <span>{f.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Result count */}
                {(query || activeType !== 'all') && !isSearching && (
                    <p className="mt-2 text-xs px-0.5" style={{ color: 'var(--text-muted)' }}>
                        {results.length} {results.length === 1 ? 'result' : 'results'}
                    </p>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar space-y-2">
                {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div
                            className="w-8 h-8 rounded-full animate-spin"
                            style={{ border: '2px solid var(--border-medium)', borderTopColor: 'var(--accent-primary)' }}
                        />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Searching...</p>
                    </div>
                ) : results.length > 0 ? (
                    results.map((message) => (
                        <div
                            key={message._id}
                            onClick={() => handleResultClick(message._id)}
                            className="group rounded-xl p-3 cursor-pointer transition-all duration-200"
                            style={{
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border-subtle)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--bg-glass-hover)';
                                e.currentTarget.style.borderColor = 'var(--border-accent)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'var(--bg-glass)';
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Sender + time */}
                            <div className="flex items-center justify-between mb-1.5">
                                <span
                                    className="text-[10px] uppercase font-bold tracking-wider"
                                    style={{ color: message.senderId === selectedUser?._id ? 'var(--text-accent)' : 'var(--text-secondary)' }}
                                >
                                    {message.senderId === selectedUser?._id ? selectedUser.fullName : 'Me'}
                                </span>
                                <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                    <CalendarIcon size={9} />
                                    <span>{formatFullDateTime(message.createdAt)}</span>
                                </div>
                            </div>

                            {/* Text */}
                            {message.text && (
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                    {highlightText(message.text, query)}
                                </p>
                            )}

                            {/* Image thumbnail */}
                            {message.image && (
                                <div
                                    className="mt-2 rounded-lg overflow-hidden max-w-[140px]"
                                    style={{ border: '1px solid var(--border-subtle)' }}
                                >
                                    <img src={message.image} alt="Image" className="w-full max-h-[80px] object-cover" />
                                </div>
                            )}

                            {/* File */}
                            {message.fileUrl && (
                                <div
                                    className="mt-2 flex items-center gap-2.5 p-2 rounded-lg max-w-[260px]"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                                >
                                    <div className="p-1.5 rounded-lg" style={{ background: 'var(--accent-muted)', color: 'var(--accent-primary)' }}>
                                        <FileIcon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{message.fileName || 'File'}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{(message.fileSize / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            )}

                            {/* Audio */}
                            {message.audioUrl && (
                                <div
                                    className="mt-2 flex items-center gap-2 py-1.5 px-3 rounded-full max-w-[200px]"
                                    style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)' }}
                                >
                                    <MicIcon size={12} style={{ color: 'var(--accent-primary)' }} />
                                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-accent)' }}>
                                        Voice Note · {message.audioDuration ? `${Math.floor(message.audioDuration)}s` : '0:00'}
                                    </span>
                                </div>
                            )}

                            {message.isEdited && (
                                <span
                                    className="mt-1.5 inline-block text-[9px] px-1.5 py-0.5 rounded"
                                    style={{ background: 'var(--bg-glass-hover)', color: 'var(--text-muted)' }}
                                >
                                    Edited
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
                        >
                            <SearchIcon size={22} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                        </div>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {(query || activeType !== 'all') ? 'No results found' : 'Search messages'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {(query || activeType !== 'all')
                                ? 'Try a different keyword or filter'
                                : 'Filter by type or type to search'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchBar;
