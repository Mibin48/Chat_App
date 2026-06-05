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
    const [activeType, setActiveType] = useState('all'); // 'all', 'text', 'image', 'audio', 'file'
    const { searchMessages, selectedUser } = userChatStore();

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            performSearch();
        }, 300);

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
                setTimeout(() => {
                    element.classList.remove('animate-message-highlight');
                }, 2550);
            }
        }, 150);
    };

    const highlightText = (text, query) => {
        if (!query || !text) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (part.toLowerCase() === query.toLowerCase()) {
                return (
                    <mark key={index} className="bg-cyan-500/30 text-cyan-300 rounded px-1">
                        {part}
                    </mark>
                );
            }
            return part;
        });
    };

    const filters = [
        { id: 'all', label: 'All', icon: SearchIcon },
        { id: 'text', label: 'Text', icon: MessageSquareIcon },
        { id: 'image', label: 'Images', icon: ImageIcon },
        { id: 'audio', label: 'Voice Notes', icon: MicIcon },
        { id: 'file', label: 'Files', icon: FileIcon },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-slate-900/20">
            {/* Search Header */}
            <div className="p-3.5 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={activeType === 'all' ? "Search messages..." : `Search ${activeType} messages...`}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <XIcon size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                        title="Close search"
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 py-0.5">
                    {filters.map((f) => {
                        const Icon = f.icon;
                        const isActive = activeType === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setActiveType(f.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 ${
                                    isActive 
                                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-md" 
                                        : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-600"
                                }`}
                            >
                                <Icon size={13} className={isActive ? "text-cyan-400 animate-pulse" : ""} />
                                <span>{f.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Stats */}
                {(query || activeType !== 'all') && !isSearching && (
                    <div className="mt-2.5 text-xs text-slate-500 px-1">
                        Found {results.length} {results.length === 1 ? 'message' : 'messages'}
                    </div>
                )}
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar bg-slate-950/20">
                {isSearching ? (
                    <div className="text-center text-slate-400 py-12">
                        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
                        <p className="text-sm">Searching chat history...</p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="space-y-3">
                        {results.map((message) => (
                            <div
                                key={message._id}
                                onClick={() => handleResultClick(message._id)}
                                className="group bg-slate-900/40 backdrop-blur-sm border border-slate-800/80 rounded-xl p-3.5 hover:bg-slate-800/50 hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                            >
                                {/* Message Sender */}
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                        message.senderId === selectedUser?._id ? "text-cyan-400" : "text-slate-400"
                                    }`}>
                                        {message.senderId === selectedUser?._id ? selectedUser.fullName : "Me"}
                                    </span>
                                    {/* Date */}
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                        <CalendarIcon size={10} />
                                        <span>{formatFullDateTime(message.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Text content */}
                                {message.text && (
                                    <div className="mb-1">
                                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                                            {highlightText(message.text, query)}
                                        </p>
                                    </div>
                                )}

                                {/* Attachments Previews */}
                                {message.image && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-w-[150px] shadow-sm group-hover:border-cyan-500/20 transition-all">
                                        <img src={message.image} alt="Image Attachment" className="max-h-[90px] w-full object-cover hover:scale-105 transition-transform duration-300" />
                                    </div>
                                )}

                                {message.fileUrl && (
                                    <div className="mt-2 bg-slate-950/40 rounded-lg p-2.5 border border-white/5 flex items-center gap-3 max-w-[320px] shadow-inner">
                                        <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">
                                            <FileIcon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-slate-300 truncate">{message.fileName || 'Attachment'}</p>
                                            <p className="text-[10px] text-slate-500">{(message.fileSize / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                )}

                                {message.audioUrl && (
                                    <div className="mt-2 bg-slate-950/20 rounded-full py-1.5 px-3 border border-white/5 flex items-center gap-2 max-w-[200px] text-xs">
                                        <MicIcon size={13} className="text-cyan-400 animate-pulse" />
                                        <span className="text-slate-400 font-mono text-[10px]">
                                            Voice Note • {message.audioDuration ? `${Math.floor(message.audioDuration)}s` : '0:00'}
                                        </span>
                                    </div>
                                )}

                                {message.isEdited && (
                                    <div className="mt-2 flex">
                                        <span className="px-1.5 py-0.5 bg-slate-800/80 rounded text-[9px] text-slate-500">
                                            Edited
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (query.trim() || activeType !== 'all') ? (
                    <div className="text-center text-slate-400 py-16">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500">
                            <SearchIcon size={24} className="opacity-60" />
                        </div>
                        <p className="text-base font-semibold text-slate-300 mb-1">No results found</p>
                        <p className="text-xs text-slate-500">No messages matched your query and filters.</p>
                    </div>
                ) : (
                    <div className="text-center text-slate-400 py-16">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500">
                            <SearchIcon size={24} className="opacity-60" />
                        </div>
                        <p className="text-base font-semibold text-slate-300 mb-1">Search messages</p>
                        <p className="text-xs text-slate-500">Filter by type or enter keywords to browse chat history.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchBar;
