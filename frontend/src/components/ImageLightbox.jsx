import React, { useState, useRef, useEffect } from "react";
import { XIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon, DownloadIcon } from "lucide-react";

function ImageLightbox({ imageUrl, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef(null);

  // Reset scale and position when imageUrl changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Toolbar */}
      <div 
        className="absolute top-4 left-4 right-4 flex items-center justify-between p-2 rounded-xl z-50"
        style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="text-xs text-zinc-300 font-medium px-2 truncate">Image Preview</span>
        <div className="flex items-center gap-1.5">
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

          {/* Download */}
          <a 
            href={imageUrl} 
            download="preview_image.jpg" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors flex items-center justify-center"
            title="Download Image"
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

      {/* Image Viewport */}
      <div 
        className="flex-1 w-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Preview"
          className="max-w-full max-h-[85vh] object-contain select-none transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

export default ImageLightbox;
