import React, { useEffect, lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { userAuthStore } from "./store/userAuthStore"
import { userChatStore } from "./store/userChatStore"
import PageLoader from './components/PageLoader';
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import DynamicBackground from './components/DynamicBackground';
import PWAInitializer from './components/PWAInitializer';
import KeyRecoveryPrompt from './components/KeyRecoveryPrompt';
import CallModal from './components/CallModal';
import { useCallStore } from './store/useCallStore';
import { Phone, Video, PhoneOff, Maximize2 } from 'lucide-react';
import ForwardModal from './components/ForwardModal';

const ChatPage = lazy(() => import('./pages/ChatPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const App = () => {
  const { checkAuth, isCheckingAuth, authUser, socket } = userAuthStore();
  const { theme } = userChatStore();
  const {
    receiveCall,
    handleAnswer,
    handleIceCandidate,
    endCall,
    setRemoteMuted,
    setRemoteVideoOff,
    setRemoteScreenSharing,
    callState,
    callType,
    peer,
    callDuration,
    isMinimized
  } = useCallStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Keep data-theme in sync when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle tab close or refresh while in an active call
  useEffect(() => {
    const handleBeforeUnload = () => {
      const activeState = useCallStore.getState().callState;
      if (activeState !== "idle") {
        useCallStore.getState().endCall(true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Terminate call locally if user logs out
  useEffect(() => {
    if (!authUser && callState !== "idle") {
      endCall(false);
    }
  }, [authUser, callState, endCall]);

  // Bind WebRTC socket listeners
  useEffect(() => {
    if (!socket) return;

    const onCallUser = ({ from, offer, type, callerDetails }) => {
      receiveCall(callerDetails, type, offer);
    };

    const onAnswerCall = ({ answer }) => {
      handleAnswer(answer);
    };

    const onIceCandidate = ({ candidate }) => {
      handleIceCandidate(candidate);
    };

    const onRejectCall = () => {
      toast.error("Call rejected by recipient.");
      endCall(false);
    };

    const onCancelCall = () => {
      toast.error("Call canceled by caller.");
      endCall(false);
    };

    const onEndCall = () => {
      toast.success("Call ended.");
      endCall(false);
    };

    const onCallBusy = () => {
      toast.error("Recipient is busy in another call.");
      endCall(false);
    };

    const onCallRejected = ({ reason }) => {
      if (reason === "offline") {
        toast.error("Recipient is offline.");
      }
      endCall(false);
    };

    const onCallToggleMute = ({ isMuted }) => {
      setRemoteMuted(isMuted);
    };

    const onCallToggleVideo = ({ isVideoOff }) => {
      setRemoteVideoOff(isVideoOff);
    };

    const onCallToggleScreenShare = ({ isScreenSharing }) => {
      setRemoteScreenSharing(isScreenSharing);
    };

    socket.on("call-user", onCallUser);
    socket.on("answer-call", onAnswerCall);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("reject-call", onRejectCall);
    socket.on("cancel-call", onCancelCall);
    socket.on("end-call", onEndCall);
    socket.on("call-busy", onCallBusy);
    socket.on("call-rejected", onCallRejected);
    socket.on("call-toggle-mute", onCallToggleMute);
    socket.on("call-toggle-video", onCallToggleVideo);
    socket.on("call-toggle-screen-share", onCallToggleScreenShare);

    return () => {
      socket.off("call-user", onCallUser);
      socket.off("answer-call", onAnswerCall);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("reject-call", onRejectCall);
      socket.off("cancel-call", onCancelCall);
      socket.off("end-call", onEndCall);
      socket.off("call-busy", onCallBusy);
      socket.off("call-rejected", onCallRejected);
      socket.off("call-toggle-mute", onCallToggleMute);
      socket.off("call-toggle-video", onCallToggleVideo);
      socket.off("call-toggle-screen-share", onCallToggleScreenShare);
    };
  }, [socket, receiveCall, handleAnswer, handleIceCandidate, endCall, setRemoteMuted, setRemoteVideoOff, setRemoteScreenSharing]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <>
      <DynamicBackground />
      <PWAInitializer />
      <KeyRecoveryPrompt />
      <CallModal />

      {/* Active Call Banner when minimized */}
      {callState !== "idle" && isMinimized && peer && (
        <div
          onClick={() => useCallStore.getState().toggleMinimize()}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 py-2.5 px-5 rounded-full shadow-2xl border cursor-pointer hover:scale-[1.02] active:scale-95 transition-all select-none"
          style={{
            background: 'rgba(15, 15, 35, 0.85)',
            borderColor: 'var(--border-accent, rgba(99, 102, 241, 0.3))',
            boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Pulsing indicator, avatar & call type icon */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            
            {/* Peer Profile Picture */}
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-zinc-800 flex-shrink-0">
              <img 
                src={peer.profilePic || "/avatar.png"} 
                alt={peer.fullName} 
                className="w-full h-full object-cover" 
              />
            </div>

            {callType === "video" ? (
              <Video size={13} className="text-[var(--accent-primary, #6366f1)] flex-shrink-0" />
            ) : (
              <Phone size={13} className="text-[var(--accent-primary, #6366f1)] flex-shrink-0" />
            )}
          </div>

          {/* Call status & details */}
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="truncate max-w-[120px]">{peer.fullName}</span>
            <span className="text-[10px] text-zinc-400 leading-none">•</span>
            {callState === "active" ? (
              <span className="text-zinc-300 font-mono">
                {(() => {
                  const mins = Math.floor(callDuration / 60);
                  const secs = callDuration % 60;
                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                })()}
              </span>
            ) : (
              <span className="text-zinc-400 capitalize animate-pulse">{callState}...</span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => useCallStore.getState().toggleMinimize()}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all text-white"
              title="Expand call screen"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={() => endCall()}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-all text-white shadow-md shadow-red-500/20"
              title="Hang up"
            >
              <PhoneOff size={12} />
            </button>
          </div>
        </div>
      )}
      <Suspense fallback={<PageLoader transparent />}>
        <Routes>
          <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        </Routes>
      </Suspense>

      <ForwardModal />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-glass-panel)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            fontSize: '0.8125rem',
            fontWeight: '600',
            fontFamily: 'var(--font-body)',
            boxShadow: 'var(--shadow-panel)',
            padding: '12px 18px',
          },
          success: {
            icon: null,
            style: {
              borderLeft: '3px solid var(--online-color)',
            }
          },
          error: {
            icon: null,
            style: {
              borderLeft: '3px solid var(--danger-color)',
            }
          },
        }}
      />
    </>
  );
};

export default App;