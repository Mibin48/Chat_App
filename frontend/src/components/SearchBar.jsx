import React, { useState, useEffect } from 'react';
import {
    SearchIcon,
    XIcon,
    CalendarIcon,
    MessageSquareIcon,
    ImageIcon,
    MicIcon,
    FileIcon,
    ArrowUpDownIcon,
    UserIcon,
    FilterIcon,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import { formatFullDateTime } from '../lib/timeUtils';

function SearchBar({ onClose, onJumpToMessage }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeType, setActiveType] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [senderFilter, setSenderFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

    const [currentResultIndex, setCurrentResultIndex] = useState(-1);

    const { searchMessages, selectedUser, selectedGroup, setActivePreviewFile, setSearchQuery, setShowSearch } = userChatStore();
    const { authUser } = userAuthStore();

    useEffect(() => {
        setSearchQuery(query);
        setCurrentResultIndex(-1);
        const delayDebounce = setTimeout(() => { performSearch(); }, 300);
        return () => {
            clearTimeout(delayDebounce);
        };
    }, [query, activeType]);


    const performSearch = async () => {
        if (!query.trim() && activeType === 'all') {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const searchResults = await searchMessages(query, activeType);
            setResults(searchResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleResultClick = (messageId) => {
        const idx = processedResults.findIndex(m => m._id === messageId);
        if (idx >= 0) {
            setCurrentResultIndex(idx);
        }
        if (window.innerWidth < 768) {
            setShowSearch(false);
        }
        if (onJumpToMessage) {
            onJumpToMessage(messageId);
        }
    };

    const processedResults = [...results]
        .filter((message) => {
            if (query.trim()) {
                return message.text && message.text.toLowerCase().includes(query.toLowerCase());
            }
            return true;
        })
        .filter((message) => {
            if (senderFilter === 'me') {
                return message.senderId === authUser?._id;
            }
            if (senderFilter === 'others') {
                return message.senderId !== authUser?._id;
            }
            return true;
        })
        .filter((message) => {
            if (dateFilter === 'all') return true;
            const messageTime = new Date(message.createdAt).getTime();
            const now = Date.now();
            if (dateFilter === 'today') {
                const startOfDay = new Date().setHours(0,0,0,0);
                return messageTime >= startOfDay;
            }
            if (dateFilter === 'week') {
                const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
                return messageTime >= oneWeekAgo;
            }
            if (dateFilter === 'month') {
                const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
                return messageTime >= oneMonthAgo;
            }
            return true;
        })
        .sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
        });

    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark
                    key={index}
                    style={{
                        background: 'var(--accent-primary)',
                        color: '#ffffff',
                        borderRadius: '4px',
                        padding: '1px 4px',
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
        <div className="flex flex-col h-full w-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div
                className="flex flex-col gap-3 p-4 border-b flex-shrink-0"
                style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'transparent',
                }}
            >
                {/* Search query row */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <SearchIcon
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-pulse"
                            size={14}
                            style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                        />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={activeType === 'all' ? "Search messages..." : `Search ${activeType}...`}
                            className="aether-input w-full"
                            style={{
                                paddingLeft: '2.5rem',
                                paddingRight: '2.5rem',
                                height: '42px',
                            }}
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon p-1 rounded-full flex items-center justify-center hover:bg-white/10"
                                style={{ width: '24px', height: '24px' }}
                            >
                                <XIcon size={12} />
                            </button>
                        )}
                    </div>
                    {/* Search Result Navigator (Chevron Up/Down + index counter) */}
                    {processedResults.length > 0 && (
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                            <span className="text-[10px] font-bold px-1.5 opacity-60 tabular-nums">
                                {currentResultIndex >= 0 ? currentResultIndex + 1 : 0}/{processedResults.length}
                            </span>
                            <button
                                onClick={() => {
                                    const nextIdx = currentResultIndex <= 0 ? processedResults.length - 1 : currentResultIndex - 1;
                                    setCurrentResultIndex(nextIdx);
                                    onJumpToMessage(processedResults[nextIdx]._id);
                                }}
                                className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                title="Previous match"
                            >
                                <ChevronUp size={14} className="stroke-[2.5]" />
                            </button>
                            <button
                                onClick={() => {
                                    const nextIdx = currentResultIndex === processedResults.length - 1 ? 0 : currentResultIndex + 1;
                                    setCurrentResultIndex(nextIdx);
                                    onJumpToMessage(processedResults[nextIdx]._id);
                                }}
                                className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                title="Next match"
                            >
                                <ChevronDown size={14} className="stroke-[2.5]" />
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={onClose} 
                        className="btn-icon p-2 rounded-xl flex-shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" 
                        title="Close"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {filters.map((f) => {
                        const Icon = f.icon;
                        const isActive = activeType === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setActiveType(f.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.03] active:scale-95"
                                style={{
                                    background: isActive ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' : 'var(--bg-glass-hover)',
                                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                    border: `1px solid ${isActive ? 'transparent' : 'var(--border-subtle)'}`,
                                    boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none',
                                }}
                            >
                                <Icon size={11} />
                                <span>{f.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Advanced Filtering options */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[var(--border-subtle)] flex-wrap">
                    {/* Date filter select dropdown */}
                    <div className="flex items-center gap-1">
                        <CalendarIcon size={12} className="text-[var(--text-muted)]" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] focus:outline-none cursor-pointer border-none p-0 w-max"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="all" className="bg-[#18181b] text-white">All Time</option>
                            <option value="today" className="bg-[#18181b] text-white">Today</option>
                            <option value="week" className="bg-[#18181b] text-white">Past Week</option>
                            <option value="month" className="bg-[#18181b] text-white">Past Month</option>
                        </select>
                    </div>

                    {/* Sender filter select dropdown */}
                    <div className="flex items-center gap-1">
                        <UserIcon size={12} className="text-[var(--text-muted)]" />
                        <select
                            value={senderFilter}
                            onChange={(e) => setSenderFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] focus:outline-none cursor-pointer border-none p-0 w-max"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="all" className="bg-[#18181b] text-white">All Senders</option>
                            <option value="me" className="bg-[#18181b] text-white">Sent by Me</option>
                            <option value="others" className="bg-[#18181b] text-white">Sent by Others</option>
                        </select>
                    </div>

                    {/* Sort order toggle button */}
                    <button
                        onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-none p-0"
                        title={sortBy === 'newest' ? "Sort: Newest First" : "Sort: Oldest First"}
                    >
                        <ArrowUpDownIcon size={11} className="text-[var(--text-muted)]" />
                        <span>{sortBy === 'newest' ? 'Newest' : 'Oldest'}</span>
                    </button>
                </div>

                {/* Result count */}
                {(query || activeType !== 'all') && !isSearching && (
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider px-0.5 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <span>Found {processedResults.length} {processedResults.length === 1 ? 'message' : 'messages'}</span>
                        {results.length !== processedResults.length && (
                            <span className="text-[var(--accent-primary)] font-medium text-[9px]">({results.length} total matching)</span>
                        )}
                    </div>
                )}
            </div>

            {/* Results scroll area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-3">
                {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div
                            className="w-8 h-8 rounded-full border-2 animate-spin"
                            style={{ borderStyle: 'solid', borderColor: 'var(--border-medium)', borderTopColor: 'var(--accent-primary)' }}
                        />
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Searching messages...</p>
                    </div>
                ) : processedResults.length > 0 ? (
                    processedResults.map((message) => (
                        <div
                            key={message._id}
                            onClick={() => handleResultClick(message._id)}
                            className="glass-card p-4 flex flex-col gap-2.5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                        >
                            {/* Card header: Sender + time */}
                            <div className="flex items-center justify-between">
                                <span
                                    className="text-[10px] uppercase font-extrabold tracking-wider"
                                    style={{ color: message.senderId === selectedUser?._id ? 'var(--text-accent)' : 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}
                                >
                                    {message.senderId === selectedUser?._id ? selectedUser.fullName : 'Me'}
                                </span>
                                <div className="flex items-center gap-1 opacity-70" style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-body)' }}>
                                    <CalendarIcon size={10} />
                                    <span>{formatFullDateTime(message.createdAt)}</span>
                                </div>
                            </div>

                            {/* Message text */}
                            {message.text && (
                                <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                                    {highlightText(message.text, query)}
                                </p>
                            )}

                            {/* Image Attachment preview */}
                            {message.image && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePreviewFile({ url: message.image, name: 'Photo', type: 'image' });
                                    }}
                                    className="rounded-xl overflow-hidden max-w-[160px] bg-zinc-950 border border-white/5 hover:opacity-90 transition-opacity"
                                    style={{ border: '1.5px solid var(--border-subtle)' }}
                                >
                                    <img src={message.image} alt="Attachment" className="w-full max-h-[100px] object-cover transition-transform duration-500 group-hover:scale-105" />
                                </div>
                            )}

                            {/* File Attachment preview */}
                            {message.fileUrl && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const isPdf = message.fileType?.toLowerCase().includes('pdf') || message.fileName?.toLowerCase().endsWith('.pdf');
                                        const isVideo = message.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => message.fileName?.toLowerCase().endsWith(`.${ext}`));
                                        setActivePreviewFile({
                                            url: message.fileUrl,
                                            name: message.fileName || 'Document',
                                            type: isPdf ? 'pdf' : isVideo ? 'video' : 'other',
                                            fileSize: message.fileSize,
                                            fileType: message.fileType
                                        });
                                    }}
                                    className="flex items-center gap-3 p-2.5 rounded-xl max-w-full hover:bg-[var(--bg-glass-hover)] transition-colors"
                                    style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border-subtle)' }}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0 border border-[var(--border-subtle)]">
                                        <FileIcon size={14} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{message.fileName || 'File'}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{(message.fileSize / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            )}

                            {/* Voice Note Attachment preview */}
                            {message.audioUrl && (
                                <div
                                    className="flex items-center gap-2 py-1.5 px-3.5 rounded-full w-max hover:brightness-105 transition-all"
                                    style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)' }}
                                >
                                    <MicIcon size={12} style={{ color: 'var(--accent-primary)' }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-display)' }}>
                                        Voice Note · {message.audioDuration ? `${Math.floor(message.audioDuration)}s` : '0:00'}
                                    </span>
                                </div>
                            )}

                            {message.isEdited && (
                                <span
                                    className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md w-max"
                                    style={{ background: 'var(--bg-glass-hover)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                                >
                                    Edited
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    /* Gorgeous Empty State */
                    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 hover:scale-[1.03]"
                            style={{
                                border: '3.5px solid var(--border-medium)',
                                background: 'var(--bg-input-search)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                padding: '3px'
                            }}
                        >
                            <SearchIcon size={24} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                        </div>
                        <h4 className="text-sm font-extrabold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                            {(query || activeType !== 'all' || senderFilter !== 'all' || dateFilter !== 'all') ? 'No results found' : 'Search Messages'}
                        </h4>
                        <p className="text-xs max-w-[200px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            {(query || activeType !== 'all' || senderFilter !== 'all' || dateFilter !== 'all')
                                ? 'Try a different keyword or reset your filter settings.'
                                : 'Filter by type or type to search through this chat.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchBar;
