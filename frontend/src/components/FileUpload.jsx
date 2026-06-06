import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { PaperclipIcon, XIcon, FileIcon, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const FileUpload = forwardRef(({ onFileSelect }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const handleFileChange = (file) => {
        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error('File size must be less than 10MB');
            return;
        }

        // Convert to base64 and pass to parent
        const reader = new FileReader();
        reader.onloadend = () => {
            onFileSelect(reader.result, file);
        };
        reader.readAsDataURL(file);
    };

    const clear = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    useImperativeHandle(ref, () => ({
        clear
    }));

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileChange(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <div className="relative">
            {/* File Input Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-colors flex items-center justify-center"
                title="Attach file"
            >
                <PaperclipIcon size={18} className="sm:w-5 sm:h-5" />
            </button>

            <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            />

            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center"
                >
                    <div className="bg-slate-800 border-2 border-dashed border-cyan-500 rounded-2xl p-12 text-center">
                        <PaperclipIcon size={48} className="mx-auto text-cyan-400 mb-4" />
                        <p className="text-xl text-slate-200">Drop file here</p>
                        <p className="text-sm text-slate-400 mt-2">Max size: 10MB</p>
                    </div>
                </div>
            )}
        </div>
    );
});

export default FileUpload;
