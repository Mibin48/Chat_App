import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon, PlayIcon, PauseIcon, CalendarIcon, UserIcon, InfoIcon, Lock } from "lucide-react";
import DecryptedMedia from "./DecryptedMedia";
import { formatFullDateTime } from "../lib/timeUtils";

export default function MediaGalleryLightbox({ mediaMessages, activeMessageId, onClose }) {
  const [activeId, setActiveId] = useState(activeMessageId);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const activeIndex = mediaMessages.findIndex((m) => m._id === activeId);
  const activeMsg = mediaMessages[activeIndex] || mediaMessages[0];

  // Reset scale and position when active media changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsVideoPlaying(true);
  }, [activeId]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, onClose]);

  if (!activeMsg) return null;

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveId(mediaMessages[activeIndex - 1]._id);
    }
  };

  const handleNext = () => {
    if (activeIndex < mediaMessages.length - 1) {
      setActiveId(mediaMessages[activeIndex + 1]._id);
    }
  };

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

  const isImage = !!activeMsg.image || activeMsg.fileType?.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => activeMsg.fileName?.toLowerCase().endsWith(`.${ext}`));
  const isVideo = activeMsg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => activeMsg.fileName?.toLowerCase().endsWith(`.${ext}`));
  
  const mediaFallbackUrl = activeMsg.image || activeMsg.fileUrl || activeMsg.audioUrl;
  const mediaType = isImage ? "image" : (isVideo ? "video" : "file");

  const getSenderName = () => {
    return activeMsg.senderId?.fullName || "Member";
  };

  const getSenderPic = () => {
    return activeMsg.senderId?.profilePic || "/avatar.png";
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />
      
      <div 
        ref={containerRef}
        className="fixed inset-0 sm:inset-6 md:inset-10 z-[9999] flex flex-col justify-between bg-zinc-950/98 sm:border sm:border-white/10 sm:rounded-[32px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] animate-scale-in"
        onMouseMove={isImage ? handleMouseMove : undefined}
        onMouseUp={isImage ? handleMouseUp : undefined}
        onMouseLeave={isImage ? handleMouseUp : undefined}
      >
      {/* ── TOP BAR (Glassmorphic Toolbar) ── */}
      <div 
        className="w-full flex items-center justify-between p-4 border-b transition-colors z-[100]"
        style={{ 
          background: "rgba(10, 10, 20, 0.4)", 
          borderColor: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)"
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-zinc-800 flex-shrink-0">
            <img src={getSenderPic()} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">{getSenderName()}</h4>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <CalendarIcon size={10} />
              <span>{formatFullDateTime(activeMsg.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isImage && (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 mr-2">
              <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors" title="Zoom In">
                <ZoomInIcon size={15} />
              </button>
              <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors" title="Zoom Out">
                <ZoomOutIcon size={15} />
              </button>
              <button onClick={handleReset} className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors" title="Reset Zoom">
                <RotateCcwIcon size={15} />
              </button>
            </div>
          )}

          {/* Close */}
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/10 transition-colors"
            title="Close Gallery"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {/* ── MAIN VIEWPORT (Interactive Media Frame) ── */}
      <div className="flex-1 w-full flex items-center justify-between relative overflow-hidden px-4 sm:px-12">
        {/* Navigation - Left Arrow */}
        {activeIndex > 0 ? (
          <button 
            onClick={handlePrev}
            className="absolute left-4 z-50 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-xl"
            title="Previous (Left Arrow)"
          >
            <ChevronLeftIcon size={24} />
          </button>
        ) : <div className="w-11" />}

        {/* Media Canvas */}
        <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden py-4">
          <DecryptedMedia msg={activeMsg} type={mediaType} fallbackUrl={mediaFallbackUrl}>
            {(url, isLoading, isError) => {
              if (isLoading) {
                return (
                  <div className="flex flex-col items-center gap-3 p-8">
                    <div className="w-10 h-10 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs text-zinc-400 font-semibold tracking-wider font-mono">Decrypting file client-side...</span>
                  </div>
                );
              }
              if (isError) {
                return (
                  <div className="text-center p-8 bg-zinc-950/80 rounded-3xl border border-red-500/20 max-w-sm">
                    <p className="text-sm font-bold text-red-400">Decryption Failed</p>
                    <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                      This file cannot be decrypted because the E2EE key is missing or has been rotated since this message was sent.
                    </p>
                  </div>
                );
              }

              if (isVideo) {
                return (
                  <div className="relative max-w-full max-h-[72vh] rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                    <video
                      ref={videoRef}
                      src={url}
                      autoPlay={isVideoPlaying}
                      controls
                      className="max-w-full max-h-[72vh] object-contain block"
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                    />
                    <a 
                      href={url} 
                      download={activeMsg.fileName || "video.mp4"}
                      className="absolute top-3 right-3 p-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center"
                      title="Download Video"
                    >
                      <DownloadIcon size={14} />
                    </a>
                  </div>
                );
              }

              return (
                <div 
                  className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing relative"
                  onMouseDown={handleMouseDown}
                >
                  <img
                    src={url}
                    alt="Preview"
                    className="max-w-full max-h-[74vh] object-contain select-none transition-transform duration-75 ease-out shadow-2xl"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                    draggable={false}
                  />
                  <a 
                    href={url} 
                    download={activeMsg.fileName || "photo.jpg"}
                    className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 hover:border-white/20 transition-all flex items-center justify-center"
                    title="Download Photo"
                  >
                    <DownloadIcon size={15} />
                  </a>
                </div>
              );
            }}
          </DecryptedMedia>
        </div>

        {/* Navigation - Right Arrow */}
        {activeIndex < mediaMessages.length - 1 ? (
          <button 
            onClick={handleNext}
            className="absolute right-4 z-50 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 flex items-center justify-center transition-all active:scale-95 shadow-xl"
            title="Next (Right Arrow)"
          >
            <ChevronRightIcon size={24} />
          </button>
        ) : <div className="w-11" />}
      </div>

      {/* ── BOTTOM BAR (Decrypted Thumbnail Strip & Count) ── */}
      <div 
        className="w-full flex flex-col items-center gap-3 p-4 border-t z-50"
        style={{ 
          background: "rgba(10, 10, 20, 0.4)", 
          borderColor: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)"
        }}
      >
        <span className="text-[10px] font-bold text-zinc-400 tracking-wider font-mono">
          {activeIndex + 1} OF {mediaMessages.length} MEDIA ITEMS
        </span>

        {/* Thumbnail row */}
        <div className="flex gap-2 max-w-full overflow-x-auto p-1.5 custom-scrollbar scroll-smooth">
          {mediaMessages.map((m, idx) => {
            const isImg = !!m.image || m.fileType?.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => m.fileName?.toLowerCase().endsWith(`.${ext}`));
            const isVid = m.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => m.fileName?.toLowerCase().endsWith(`.${ext}`));
            
            const fallback = m.image || m.fileUrl || m.audioUrl;
            const type = isImg ? "image" : (isVid ? "video" : "file");

            return (
              <button 
                key={m._id}
                onClick={() => setActiveId(m._id)}
                className={`w-14 h-14 rounded-xl overflow-hidden border flex-shrink-0 relative transition-all active:scale-95 duration-200
                  ${m._id === activeId 
                    ? 'border-indigo-500 scale-105 shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-2 ring-indigo-500/20' 
                    : 'border-white/10 opacity-40 hover:opacity-100'
                  }
                `}
              >
                <DecryptedMedia msg={m} type={type} fallbackUrl={fallback}>
                  {(url, isLoading, isError) => {
                    if (isLoading) {
                      return <div className="w-full h-full bg-zinc-900 animate-pulse" />;
                    }
                    if (isError) {
                      return (
                        <div className="w-full h-full bg-zinc-950 flex items-center justify-center text-[10px] text-red-500/80 font-bold font-mono">
                          <Lock size={12} className="text-red-500" />
                        </div>
                      );
                    }

                    if (isVid) {
                       return (
                        <div className="w-full h-full relative bg-zinc-950">
                          <video src={url} className="w-full h-full object-cover opacity-80" muted />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <PlayIcon size={12} className="text-white fill-white" />
                          </div>
                        </div>
                      );
                    }

                    return <img src={url} className="w-full h-full object-cover" alt="Thumbnail" />;
                  }}
                </DecryptedMedia>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </>,
  document.body
);
}
