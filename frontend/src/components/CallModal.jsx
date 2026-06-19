import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { userAuthStore } from "../store/userAuthStore";
import {
  PhoneIcon,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  MonitorPlay,
  MonitorOff,
  RefreshCw,
  MinusSquare,
  SignalHigh,
  SignalMedium,
  SignalLow
} from "lucide-react";

function CallModal() {
  const {
    callState,
    callType,
    peer,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    isMinimized,
    isScreenSharing,
    facingMode,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    switchCamera,
    toggleScreenShare,
    isAcquiringMedia,
    isRemoteMuted,
    isRemoteVideoOff,
    isRemoteScreenSharing,
    connectionQuality
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const miniLocalVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Floating Minimized Bubble Position & Drag Logic
  const [miniPosition, setMiniPosition] = useState({ x: 20, y: 80 }); // offsets from bottom-right
  const [isDraggingMini, setIsDraggingMini] = useState(false);
  const miniDragStartRef = useRef({ x: 0, y: 0 });

  const [isMobileLayout, setIsMobileLayout] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Attach local media stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState, isVideoOff, isMinimized, isMobileLayout, isScreenSharing, isRemoteScreenSharing]);

  // Attach local media stream to mini video element when minimized
  useEffect(() => {
    if (miniLocalVideoRef.current && localStream && isMinimized) {
      miniLocalVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isMinimized, isVideoOff]);

  // Attach remote media stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState, isMinimized, isMobileLayout, isScreenSharing, isRemoteScreenSharing]);

  // Attach remote media stream to remote audio element (for voice calls or minimized calls)
  useEffect(() => {
    let cleanupFn = null;
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((error) => {
        console.warn("Autoplay prevented. Hard-forcing audio context activation:", error);

        const forcePlay = () => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.play()
              .then(() => {
                cleanup();
              })
              .catch((e) => console.warn("Failed to force-play on user interaction:", e));
          }
        };

        const cleanup = () => {
          window.removeEventListener("click", forcePlay);
          window.removeEventListener("keydown", forcePlay);
          window.removeEventListener("touchstart", forcePlay);
        };

        window.addEventListener("click", forcePlay);
        window.addEventListener("keydown", forcePlay);
        window.addEventListener("touchstart", forcePlay);

        cleanupFn = cleanup;
      });
    }
    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [remoteStream, callState, isMinimized, callType]);

  // Draggable preview inside active call window
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setDragOffset({
      x: Math.max(10, Math.min(window.innerWidth - 130, newX)),
      y: Math.max(10, Math.min(window.innerHeight - 170, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Drag handlers for the minimized floating bubble
  const handleMiniStart = (clientX, clientY) => {
    setIsDraggingMini(true);
    miniDragStartRef.current = {
      x: clientX + miniPosition.x,
      y: clientY + miniPosition.y
    };
  };

  const handleMiniMove = (clientX, clientY) => {
    if (!isDraggingMini) return;
    const newX = miniDragStartRef.current.x - clientX;
    const newY = miniDragStartRef.current.y - clientY;

    // Viewport boundaries
    const maxX = window.innerWidth - 130;
    const maxY = window.innerHeight - 180;

    setMiniPosition({
      x: Math.max(10, Math.min(maxX, newX)),
      y: Math.max(10, Math.min(maxY, newY))
    });
  };

  const handleMiniEnd = () => {
    setIsDraggingMini(false);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      handleMiniMove(e.clientX, e.clientY);
    };
    const handleWindowTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handleMiniMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleWindowUp = () => {
      handleMiniEnd();
    };

    if (isDraggingMini) {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowUp);
      window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
      window.addEventListener("touchend", handleWindowUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowUp);
    };
  }, [isDraggingMini, miniPosition]);

  if (callState === "idle") return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const hasScreenShareSupport = !!navigator.mediaDevices?.getDisplayMedia;

  // ── RENDER STATE: MINIMIZED FLOATING BUBBLE (Mobile touch-drag friendly) ──
  if (isMinimized) {
    return (
      <>
        {callState === "active" && (
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        )}
        <div
          style={{
            position: "fixed",
            right: `${miniPosition.x}px`,
            bottom: `${miniPosition.y}px`,
            touchAction: "none"
          }}
          className="w-[156px] h-[216px] rounded-[22px] overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.25)] border-indigo-500/20 z-50 bg-zinc-950/80 backdrop-blur-xl flex flex-col justify-between select-none animate-fade-in cursor-grab active:cursor-grabbing transition-shadow duration-300"
          onMouseDown={(e) => handleMiniStart(e.clientX, e.clientY)}
          onTouchStart={(e) => handleMiniStart(e.touches[0].clientX, e.touches[0].clientY)}
        >
          {/* Floating Mini Content */}
          <div className="relative flex-1 bg-black/40">
            {/* Subtle top drag handle bar */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/20 z-20 pointer-events-none" />

            {callType === "video" && localStream && !isVideoOff ? (
              <video
                ref={miniLocalVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover pointer-events-none scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950/20 to-zinc-950/30 relative">
                <div className="relative">
                  <div className="absolute inset-[-6px] rounded-full bg-indigo-500/10 animate-ping duration-[1.5s]" />
                  <img
                    src={peer?.profilePic || "/avatar.png"}
                    alt={peer?.fullName}
                    className="w-16 h-16 rounded-full border border-white/10 object-cover pointer-events-none"
                  />
                </div>
                <span className="text-[11px] font-semibold text-zinc-300 mt-2.5 truncate max-w-[110px] tracking-wide">
                  {peer?.fullName}
                </span>
              </div>
            )}

            {/* Minimized Overlays */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <span className="text-[9px] font-mono font-bold bg-black/60 backdrop-blur-sm border border-white/5 px-2 py-0.5 rounded-full text-white tracking-wider">
                {formatTime(callDuration)}
              </span>
              {isMuted && (
                <div className="p-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/5 text-amber-500">
                  <MicOff size={9} className="stroke-[2.5]" />
                </div>
              )}
            </div>
          </div>

          {/* Minimized Controls bar */}
          <div
            className="p-3 bg-zinc-950/95 border-t border-white/10 flex items-center justify-around gap-1.5 rounded-b-[22px]"
            onMouseDown={(e) => e.stopPropagation()} // Stop dragging when clicking buttons
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border ${isMuted
                ? "bg-amber-500 text-white border-amber-400 shadow-md"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                }`}
              title="Mute"
            >
              {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              onClick={() => endCall(true)}
              className="p-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white border border-rose-400 shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
              title="End"
            >
              <PhoneOff size={15} className="stroke-[2.5]" />
            </button>
            <button
              onClick={toggleMinimize}
              className="p-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-400 shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
              title="Restore"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── RENDER STATE: FULL SCREEN CALLING PANEL ──
  return (
    <div className={`fixed inset-0 z-[999] flex items-center justify-center transition-all duration-300
      ${isMobileLayout ? "bg-black/75 backdrop-blur-md" : ""}
    `}>
      {callState === "active" && callType === "voice" && (
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      )}
      <div
        style={{
          paddingTop: isMobileLayout ? "calc(16px + env(safe-area-inset-top, 0px))" : "32px",
          paddingBottom: isMobileLayout ? "calc(24px + env(safe-area-inset-bottom, 0px))" : "32px"
        }}
        className={`relative flex flex-col justify-between overflow-hidden transition-all duration-500 shadow-2xl
          ${isMobileLayout
            ? "w-full h-full rounded-none bg-black/95"
            : "fixed inset-0 w-screen h-screen bg-zinc-950/90 backdrop-blur-3xl p-8 z-[999] animate-fade-in"
          }
        `}
      >
        {/* Device Permission Prompt Overlay */}
        {isAcquiringMedia && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in md:rounded-[28px]">
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 animate-pulse">
              {callType === "video" ? (
                <Video className="w-10 h-10 text-indigo-400" />
              ) : (
                <Mic className="w-10 h-10 text-indigo-400" />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Allow Device Access</h3>
            <p className="text-sm text-zinc-300 max-w-[280px] leading-relaxed">
              Please click <strong className="text-indigo-400">"Allow"</strong> in your browser prompt to activate your {callType === "video" ? "camera and microphone" : "microphone"} for this call.
            </p>
            <div className="mt-8 flex gap-2 items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" />
            </div>
          </div>
        )}

        {/* Top bar details */}
        <div className="absolute top-[calc(12px+env(safe-area-inset-top,0px))] md:top-4 left-0 right-0 z-20 flex items-center justify-between px-5 py-2">
          {/* Left Slot: Minimize */}
          <div className="flex-1 flex justify-start">
            <button
              onClick={toggleMinimize}
              className="p-2 text-white/70 hover:text-white transition-colors rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-1.5"
              title="Minimize"
            >
              <MinusSquare size={16} />
              <span className="hidden sm:inline text-xs font-semibold">Minimize</span>
            </button>
          </div>

          {/* Center Slot: Dynamic Island (Unified Call Status, Timer & Signal) */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-black/60 border border-white/10 rounded-full backdrop-blur-md text-white/95 text-xs shadow-lg font-medium tracking-wide select-none">
              {/* Status Dot */}
              <span className={`w-2 h-2 rounded-full ${callState === "active" ? "bg-emerald-500 animate-pulse" : "bg-indigo-500 animate-pulse"
                }`} />

              {callState === "active" && (
                <>
                  <span className="font-mono font-bold tracking-wider">{formatTime(callDuration)}</span>
                  <span className="w-[1px] h-3 bg-white/20 mx-1" />
                  {connectionQuality === "good" && (
                    <span className="text-emerald-400 font-semibold text-[10px] uppercase flex items-center gap-1">
                      <SignalHigh size={13} /> Good
                    </span>
                  )}
                  {connectionQuality === "poor" && (
                    <span className="text-amber-400 font-semibold text-[10px] uppercase flex items-center gap-1">
                      <SignalMedium size={13} /> Poor
                    </span>
                  )}
                  {connectionQuality === "bad" && (
                    <span className="text-rose-400 font-semibold text-[10px] uppercase flex items-center gap-1">
                      <SignalLow size={13} /> Bad
                    </span>
                  )}
                </>
              )}
              {callState === "calling" && <span>Calling...</span>}
              {callState === "ringing" && <span>Incoming Call</span>}
            </div>
          </div>

          {/* Right Slot: Fullscreen or Spacer */}
          <div className="flex-1 flex justify-end">
            {callState === "active" && callType === "video" && (
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-2 text-white/70 hover:text-white transition-colors rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* ── SCREEN 1: DIALING OUTBOUND ── */}
        {callState === "calling" && (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-[-15px] rounded-full border border-indigo-500/25 animate-ping duration-1000" />
              <div className="absolute inset-[-30px] rounded-full border border-indigo-400/10 animate-ping duration-1000 delay-200" />

              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-indigo-500 shadow-2xl">
                <img
                  src={peer?.profilePic || "/avatar.png"}
                  alt={peer?.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{peer?.fullName}</h2>
            <p className="text-sm text-indigo-200/60 font-medium animate-pulse mb-1">
              Calling with {callType === "video" ? "Video" : "Voice"}...
            </p>
            <p className="text-[11px] text-zinc-400">Please wait for recipient to connect</p>
          </div>
        )}

        {/* ── SCREEN 2: RINGING INBOUND ── */}
        {callState === "ringing" && (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-[-20px] rounded-full bg-indigo-500/15 animate-ping" />
              <div className="absolute inset-[-40px] rounded-full bg-indigo-400/5 animate-pulse" />

              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-indigo-500 shadow-2xl">
                <img
                  src={peer?.profilePic || "/avatar.png"}
                  alt={peer?.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{peer?.fullName}</h2>
            <p className="text-sm text-indigo-300 font-semibold tracking-wide animate-bounce mb-1">
              Incoming {callType === "video" ? "Video Call" : "Voice Call"}
            </p>
            <p className="text-[11px] text-zinc-400">Decrypted real-time audio/video</p>
          </div>
        )}

        {/* ── SCREEN 3: ACTIVE CONNECTION ── */}
        {callState === "active" && (
          <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden md:rounded-2xl">
            {callType === "video" ? (
              <div className="absolute inset-0 bg-black md:rounded-2xl">
                {/* 1. SCREEN SHARING ACTIVE LAYOUT */}
                {(isScreenSharing || isRemoteScreenSharing) ? (
                  <>
                    {/* Primary Screen Share Feed */}
                    {isScreenSharing ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain md:rounded-2xl"
                      />
                    ) : (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain md:rounded-2xl"
                      />
                    )}

                    {/* Secondary Overlay Webcam Card */}
                    <div
                      onMouseDown={isMobileLayout ? handleMouseDown : undefined}
                      style={isMobileLayout ? {
                        position: "absolute",
                        right: `${dragOffset.x}px`,
                        bottom: `${dragOffset.y}px`,
                        cursor: isDragging ? "grabbing" : "grab"
                      } : undefined}
                      className={`bg-zinc-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-30 transition-all duration-300
                        ${isMobileLayout
                          ? "w-32 aspect-video"
                          : "absolute top-8 right-8 w-64 aspect-video rounded-xl"
                        }
                      `}
                    >
                      {isScreenSharing ? (
                        /* Remote Peer's Webcam Card */
                        isRemoteVideoOff ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 relative">
                            <img
                              src={peer?.profilePic || "/avatar.png"}
                              alt={peer?.fullName}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 object-cover"
                            />
                            <span className="text-[9px] text-zinc-500 mt-1">Camera Off</span>
                            {/* Hidden Video track tag */}
                            <video ref={remoteVideoRef} autoPlay playsInline className="absolute w-0 h-0 invisible" />
                            {isRemoteMuted && (
                              <MicOff className="absolute top-2 left-2 text-rose-500 bg-black/60 p-1 rounded-md z-30" size={16} />
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full relative">
                            <video
                              ref={remoteVideoRef}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            {isRemoteMuted && (
                              <MicOff className="absolute top-2 left-2 text-rose-500 bg-black/60 p-1 rounded-md z-30" size={16} />
                            )}
                          </div>
                        )
                      ) : (
                        /* Local Webcam Card */
                        isVideoOff ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 relative">
                            <img
                              src={userAuthStore.getState().authUser?.profilePic || "/avatar.png"}
                              alt="Local User"
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 object-cover"
                            />
                            <span className="text-[9px] text-zinc-500 mt-1">Camera Off</span>
                            {/* Hidden Video track tag */}
                            <video ref={localVideoRef} autoPlay playsInline muted className="absolute w-0 h-0 invisible" />
                            {isMuted && (
                              <MicOff className="absolute top-2 left-2 text-rose-500 bg-black/60 p-1 rounded-md z-30" size={16} />
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full relative">
                            <video
                              ref={localVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover scale-x-[-1]"
                            />
                            {isMuted && (
                              <MicOff className="absolute top-2 left-2 text-rose-500 bg-black/60 p-1 rounded-md z-30" size={16} />
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  /* 2. NORMAL CALL ACTIVE LAYOUT (No screen sharing) */
                  <>
                    {/* Remote Main Feed */}
                    {isRemoteVideoOff ? (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-950/80 backdrop-blur-md z-10 md:rounded-2xl">
                        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 max-w-sm text-center shadow-2xl animate-fade-in flex flex-col items-center">
                          <div className="relative mb-6">
                            <div className="absolute inset-[-10px] rounded-full border border-indigo-500/30 animate-pulse" />
                            <img
                              src={peer?.profilePic || "/avatar.png"}
                              alt={peer?.fullName}
                              className="w-20 h-20 rounded-full border border-white/10 object-cover shadow-lg"
                            />
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">{peer?.fullName}</h3>
                          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1.5 mt-1">
                            <VideoOff size={14} className="text-indigo-400" />
                            <span>Partner has turned off their camera</span>
                          </p>
                        </div>
                        {/* Keep video element mounted to prevent stream track attachment drops */}
                        <video ref={remoteVideoRef} autoPlay playsInline className="absolute w-0 h-0 invisible" />
                      </div>
                    ) : (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover md:rounded-2xl"
                      />
                    )}

                    {/* Remote Mute Banner Overlay */}
                    {isRemoteMuted && (
                      <div className="absolute bottom-24 left-8 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60 backdrop-blur-md border border-white/10 text-white/80 text-xs shadow-lg animate-fade-in">
                        <MicOff size={12} className="text-rose-500 animate-pulse" />
                        <span>Partner is muted</span>
                      </div>
                    )}

                    {/* Local Video Stream Preview */}
                    <div
                      onMouseDown={isMobileLayout ? handleMouseDown : undefined}
                      style={isMobileLayout ? {
                        position: "absolute",
                        right: `${dragOffset.x}px`,
                        bottom: `${dragOffset.y}px`,
                        cursor: isDragging ? "grabbing" : "grab"
                      } : undefined}
                      className={`bg-zinc-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-30 transition-all duration-300
                        ${isMobileLayout
                          ? "w-28 sm:w-32 aspect-[3/4]"
                          : "absolute top-8 right-8 w-64 aspect-video rounded-xl shadow-2xl border border-white/20"
                        }
                      `}
                    >
                      {isVideoOff ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 relative">
                          <img
                            src={userAuthStore.getState().authUser?.profilePic || "/avatar.png"}
                            alt="Local user"
                            className="w-12 h-12 rounded-full border border-white/10 object-cover"
                          />
                          <span className="text-[10px] text-zinc-500 mt-2">Camera is Off</span>
                          {/* Keep video element mounted */}
                          <video ref={localVideoRef} autoPlay playsInline muted className="absolute w-0 h-0 invisible" />
                          {isMuted && (
                            <MicOff className="absolute top-2 left-2 text-rose-500 bg-black/60 p-1 rounded-md z-30 animate-pulse" size={16} />
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full relative">
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                          {isMuted && (
                            <MicOff className="absolute top-2 left-2 text-rose-500 bg-black/60 p-1 rounded-md z-30 animate-pulse" size={16} />
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Voice avatar display
              <div className="flex flex-col items-center justify-center p-6 text-center z-10 md:scale-105">
                <div className="relative mb-6">
                  <div className="absolute inset-[-10px] rounded-full border border-dashed border-indigo-500/20 animate-spin duration-[10s]" />
                  <div className="absolute inset-[-20px] rounded-full bg-indigo-500/5 animate-pulse" />
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-indigo-500/40 shadow-2xl">
                    <img
                      src={peer?.profilePic || "/avatar.png"}
                      alt={peer?.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-white mb-3">{peer?.fullName}</h2>
                {isRemoteMuted ? (
                  <div className="flex items-center gap-1.5 justify-center py-1.5 px-4 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400">
                    <MicOff size={12} className="stroke-[2.5]" />
                    <span className="text-[11px] font-bold tracking-wide uppercase">
                      Partner Muted
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 justify-center py-1.5 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                    <div className="flex items-center gap-[3px] h-3.5 px-0.5">
                      <span className="w-[3px] bg-emerald-400 rounded-full animate-audio-bar-1" style={{ height: '7px' }}></span>
                      <span className="w-[3px] bg-emerald-400 rounded-full animate-audio-bar-2" style={{ height: '12px' }}></span>
                      <span className="w-[3px] bg-emerald-400 rounded-full animate-audio-bar-3" style={{ height: '5px' }}></span>
                    </div>
                    <span className="text-[11px] font-bold tracking-wide uppercase">
                      Partner Audio Active
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Unified timer is shown in the top dynamic island, avoiding duplication */}
          </div>
        )}

        {/* ── FOOTER CALL CONTROLS ── */}
        <div className={`z-20 flex flex-col items-center flex-shrink-0 transition-all duration-300
          ${isMobileLayout
            ? "p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent w-full"
            : "absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 rounded-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-30"
          }
        `}>

          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
            {/* Outgoing Dial Controls */}
            {callState === "calling" && (
              <button
                onClick={cancelCall}
                className="w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-rose-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10"
                title="Cancel Call"
              >
                <PhoneOff size={22} className="stroke-[2.5]" />
              </button>
            )}

            {/* Incoming Ringing Controls */}
            {callState === "ringing" && (
              <>
                <button
                  onClick={rejectCall}
                  className="w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-rose-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10"
                  title="Decline"
                >
                  <PhoneOff size={22} className="stroke-[2.5]" />
                </button>
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-emerald-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10"
                  title="Accept"
                >
                  <PhoneIcon size={22} className="stroke-[2.5]" />
                </button>
              </>
            )}

            {/* Active Connected Controls */}
            {callState === "active" && (
              <>
                {/* Flip Camera (if video) */}
                {callType === "video" && (
                  <button
                    onClick={switchCamera}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 hover:scale-105"
                    title="Switch Camera (Front/Back)"
                  >
                    <RefreshCw size={18} />
                  </button>
                )}

                {/* Mute Mic */}
                <button
                  onClick={toggleMute}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border border-white/10 hover:scale-105 active:scale-95
                    ${isMuted
                      ? "bg-rose-500/80 text-white shadow-lg border-rose-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                    }
                  `}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* End Call */}
                <button
                  onClick={() => endCall(true)}
                  className="w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-rose-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10"
                  title="End Call"
                >
                  <PhoneOff size={22} className="stroke-[2.5]" />
                </button>

                {/* Video On/Off Toggle */}
                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border border-white/10 hover:scale-105 active:scale-95
                      ${isVideoOff
                        ? "bg-rose-500/80 text-white shadow-lg border-rose-500/30"
                        : "bg-white/10 text-white hover:bg-white/20"
                      }
                    `}
                    title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                  </button>
                )}

                {/* Screen Sharing Toggle (if video and API available) */}
                {callType === "video" && hasScreenShareSupport && (
                  <button
                    onClick={toggleScreenShare}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border border-white/10 hover:scale-105 active:scale-95
                      ${isScreenSharing
                        ? "bg-blue-600/80 hover:bg-blue-700/80 text-white shadow-lg border-blue-500/30 animate-pulse"
                        : "bg-white/10 text-white hover:bg-white/20"
                      }
                    `}
                    title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                  >
                    {isScreenSharing ? <MonitorOff size={18} /> : <MonitorPlay size={18} />}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default CallModal;
