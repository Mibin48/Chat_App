import React, { useState } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';

function MessageEditor({ message, onSave, onCancel }) {
    const getInitialText = () => {
        if (message.callInfo) {
            if (message.isEdited) {
                return message.text;
            }
            return message.callInfo.type === "video" ? "Video Call" : "Voice Call";
        }
        return message.text || '';
    };

    const [text, setText] = useState(getInitialText());

    const handleSave = () => {
        if (text.trim().length > 0) {
            onSave(message._id, text);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="bg-slate-800 border border-cyan-500/50 rounded-lg p-2 shadow-lg">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-900 text-slate-200 rounded px-3 py-2 resize-none focus:outline-none"
                rows={3}
                autoFocus
                placeholder="Edit message..."
            />
            <div className="flex justify-end gap-2 mt-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors flex items-center gap-1"
                >
                    <XIcon size={14} />
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center gap-1"
                >
                    <CheckIcon size={14} />
                    Save
                </button>
            </div>
        </div>
    );
}

export default MessageEditor;
