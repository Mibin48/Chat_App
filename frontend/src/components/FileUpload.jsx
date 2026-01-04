import React, { useState, useRef } from 'react';
import { PaperclipIcon, XIcon, FileIcon, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

function FileUpload({ onFileSelect }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
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

        setSelectedFile(file);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }

        // Convert to base64 and pass to parent
        const reader = new FileReader();
        reader.onloadend = () => {
            onFileSelect(reader.result, file);
        };
        reader.readAsDataURL(file);
    };

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

    const clearFile = () => {
        setSelectedFile(null);
        setPreview(null);
        onFileSelect(null, null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="relative">
            {/* File Input Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                title="Attach file"
            >
                <PaperclipIcon size={20} />
            </button>

            <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
            />

            {/* File Preview */}
            {selectedFile && (
                <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[200px]">
                    <div className="flex items-start gap-3">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                        ) : (
                            <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center">
                                <FileIcon size={24} className="text-slate-400" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-slate-400">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <button
                            onClick={clearFile}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                </div>
            )}

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
}

export default FileUpload;
