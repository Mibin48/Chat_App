import React, { useState, useRef, useEffect } from "react";
import { XIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon, DownloadIcon, FileTextIcon, ExternalLink } from "lucide-react";

function FilePreviewModal({ file, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef(null);

  // Reset scale and position when file changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [file]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!file) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return; // Only allow drag when zoomed in
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const isImage = file.type === "image";
  const isPdf = file.type === "pdf";
  const isVideo = file.type === "video";
  const isCloudinary = file.url?.includes("res.cloudinary.com");

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in"
      onMouseMove={isImage ? handleMouseMove : undefined}
      onMouseUp={isImage ? handleMouseUp : undefined}
      onMouseLeave={isImage ? handleMouseUp : undefined}
    >
      {/* Top Toolbar */}
      <div 
        className="w-full max-w-6xl flex items-center justify-between p-3 rounded-xl z-50 mb-4"
        style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileTextIcon size={16} className="text-[var(--accent-primary)] flex-shrink-0" />
          <span className="text-xs sm:text-sm text-zinc-200 font-semibold truncate max-w-[200px] sm:max-w-md">
            {file.name || (isImage ? "Image Preview" : "Document Preview")}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isImage && (
            <>
              {/* Zoom In */}
              <button 
                onClick={handleZoomIn} 
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                title="Zoom In"
              >
                <ZoomInIcon size={16} />
              </button>
              
              {/* Zoom Out */}
              <button 
                onClick={handleZoomOut} 
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOutIcon size={16} />
              </button>

              {/* Reset */}
              <button 
                onClick={handleReset} 
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                title="Reset Zoom"
              >
                <RotateCcwIcon size={16} />
              </button>
            </>
          )}

          {/* Open in New Tab */}
          <a 
            href={file.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors flex items-center justify-center"
            title="Open in New Tab"
          >
            <ExternalLink size={16} />
          </a>

          {/* Download */}
          <a 
            href={file.url} 
            download={file.name || "download"} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors flex items-center justify-center"
            title="Download File"
          >
            <DownloadIcon size={16} />
          </a>

          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Close */}
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            title="Close"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {/* Content Viewport */}
      <div className="flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-black/40">
        {isImage && (
          <div 
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <img
              ref={imageRef}
              src={file.url}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain select-none transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
              draggable={false}
            />
          </div>
        )}

        {isPdf && (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <iframe
              src={`${file.url}#toolbar=0`}
              title="PDF Preview"
              className="w-full border-0 bg-zinc-900 rounded-xl flex-1"
              style={{ minHeight: isCloudinary ? "55vh" : "70vh" }}
            />
            {isCloudinary ? (
              <div 
                className="mt-4 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-zinc-300 text-[11px] sm:text-xs max-w-2xl w-full space-y-2 flex-shrink-0"
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <span className="text-sm">⚠️ PDF Load Troubleshooting</span>
                </div>
                <p>
                  If the preview does not load or displays a connection error, it is likely due to the Cloudinary product environment security settings which restrict PDF delivery by default on new accounts.
                </p>
                <p className="font-medium text-zinc-200">
                  To fix this: Go to your <span className="text-amber-400">Cloudinary Console &gt; Settings &gt; Security</span> tab, scroll to the bottom, and enable <span className="text-amber-400">"Allow delivery of PDF and ZIP files"</span>.
                </p>
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all inline-flex items-center gap-1.5 text-[11px] sm:text-xs"
                  >
                    <ExternalLink size={12} /> Open PDF in New Tab
                  </a>
                  <a
                    href="https://cloudinary.com/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all inline-flex items-center gap-1.5 text-[11px] sm:text-xs"
                    style={{ boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)' }}
                  >
                    Go to Cloudinary Console
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3 flex-shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <ExternalLink size={12} /> Open PDF in New Tab
                </a>
              </div>
            )}
          </div>
        )}

        {isVideo && (
          <video
            src={file.url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
          />
        )}

        {!isImage && !isPdf && !isVideo && (
          <div className="text-center p-8 flex flex-col items-center gap-4">
            <FileTextIcon size={48} className="text-zinc-500" />
            <p className="text-sm text-zinc-400">Preview not available for this file type.</p>
            <a
              href={file.url}
              download={file.name}
              className="btn-primary mt-2 inline-flex items-center gap-2"
            >
              <DownloadIcon size={14} /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilePreviewModal;
