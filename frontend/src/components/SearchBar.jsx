import React, { useState, useEffect } from 'react';
import { SearchIcon, XIcon, CalendarIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { formatFullDateTime } from '../lib/timeUtils';

function SearchBar({ onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const { searchMessages, selectedUser } = userChatStore();

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (query.trim().length > 0) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    const performSearch = async () => {
        setIsSearching(true);
        try {
            const searchResults = await searchMessages(query, selectedUser?._id);
            setResults(searchResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const highlightText = (text, query) => {
        if (!query || !text) return text;

        // Case-insensitive search
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

    return (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col">
            {/* Search Header - Compact */}
            <div className="p-3 border-b border-white/5 bg-slate-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search messages..."
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

                {/* Search Stats - Compact */}
                {query && !isSearching && (
                    <div className="mt-1.5 text-xs text-slate-500">
                        {results.length} {results.length === 1 ? 'result' : 'results'}
                    </div>
                )}
            </div>

            {/* Search Results - Maximized Space */}
            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                {isSearching ? (
                    <div className="text-center text-slate-400 py-8">
                        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm">Searching...</p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="space-y-2">
                        {results.map((message) => (
                            <div
                                key={message._id}
                                className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 hover:bg-slate-800 hover:border-cyan-500/30 transition-all cursor-pointer"
                            >
                                {/* Message Content */}
                                <div className="mb-1.5">
                                    <p className="text-slate-200 text-sm leading-relaxed">
                                        {highlightText(message.text, query)}
                                    </p>
                                </div>

                                {/* Message Meta - Compact */}
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <CalendarIcon size={11} />
                                        <span>{formatFullDateTime(message.createdAt)}</span>
                                    </div>
                                    {message.isEdited && (
                                        <span className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px]">
                                            Edited
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : query.trim().length > 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
                            <SearchIcon size={24} className="opacity-50" />
                        </div>
                        <p className="text-base font-medium mb-1">No messages found</p>
                        <p className="text-xs text-slate-500">Try different keywords</p>
                    </div>
                ) : (
                    <div className="text-center text-slate-400 py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800/50 flex items-center justify-center">
                            <SearchIcon size={24} className="opacity-50" />
                        </div>
                        <p className="text-base font-medium mb-1">Search messages</p>
                        <p className="text-xs text-slate-500">Type to find messages</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SearchBar;
