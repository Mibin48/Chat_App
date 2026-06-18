import { create } from "zustand";
import { userAuthStore } from "./userAuthStore";
import toast from "react-hot-toast";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(import.meta.env.VITE_COTURN_URL ? [{
      urls: import.meta.env.VITE_COTURN_URL.includes(",")
        ? import.meta.env.VITE_COTURN_URL.split(",").map(u => u.trim())
        : import.meta.env.VITE_COTURN_URL.trim(),
      username: import.meta.env.VITE_COTURN_USERNAME,
      credential: import.meta.env.VITE_COTURN_CREDENTIAL
    }] : [])
  ]
};

// Simple tone synthesiser to avoid file dependencies and cross-origin sound errors
let audioCtx = null;
let masterGain = null;
let soundInterval = null;
let isRingtoneActive = false;

const startRingtone = (type) => {
  stopRingtone();
  isRingtoneActive = true;
  
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  
  try {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    
    // Set initial volume
    masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
    
    const playPulse = () => {
      if (!isRingtoneActive) return;
      if (!audioCtx || audioCtx.state === 'closed') return;
      
      // Auto-resume if suspended (e.g. if page interaction just happened)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      
      try {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const pulseGain = audioCtx.createGain();
        
        osc1.connect(pulseGain);
        osc2.connect(pulseGain);
        pulseGain.connect(masterGain);
        
        const now = audioCtx.currentTime;
        if (type === 'dialing') {
          // Outgoing: US dial ringtone (440Hz + 480Hz), 1.5s on, 3s off
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);
          pulseGain.gain.setValueAtTime(0.02, now);
          pulseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.5);
          osc2.stop(now + 1.5);
        } else {
          // Incoming: standard telephone ringtone (400Hz + 450Hz), 0.4s on, 0.2s off, 0.4s on, 2s off
          osc1.frequency.setValueAtTime(400, now);
          osc2.frequency.setValueAtTime(450, now);
          pulseGain.gain.setValueAtTime(0.03, now);
          pulseGain.gain.setValueAtTime(0.03, now + 0.4);
          pulseGain.gain.setValueAtTime(0.0001, now + 0.42);
          pulseGain.gain.setValueAtTime(0.03, now + 0.62);
          pulseGain.gain.setValueAtTime(0.0001, now + 1.02);
          
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.1);
          osc2.stop(now + 1.1);
        }
      } catch (e) {
        console.warn("Ringtone error:", e);
      }
    };
    
    // Register interaction listeners to resume audio context if suspended
    const interactionEvents = ["click", "keydown", "touchstart", "mousedown"];
    const resumeOnInteraction = () => {
      if (isRingtoneActive && audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
      if (!isRingtoneActive || !audioCtx || audioCtx.state !== "suspended") {
        interactionEvents.forEach(evt => window.removeEventListener(evt, resumeOnInteraction));
      }
    };
    
    interactionEvents.forEach(evt => window.addEventListener(evt, resumeOnInteraction));
    
    playPulse();
    soundInterval = setInterval(playPulse, type === 'dialing' ? 4500 : 3000);
  } catch (e) {
    console.warn("Failed to start sound context:", e);
  }
};

const stopRingtone = () => {
  isRingtoneActive = false;
  if (soundInterval) {
    clearInterval(soundInterval);
    soundInterval = null;
  }
  
  if (masterGain) {
    try {
      masterGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
      masterGain.disconnect();
    } catch (e) {}
    masterGain = null;
  }
  
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
};

export const useCallStore = create((set, get) => {
  let timerInterval = null;

  return {
    callState: "idle", // 'idle' | 'calling' | 'ringing' | 'active'
    callType: "voice", // 'voice' | 'video'
    peer: null, // Remote user object
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    callDuration: 0,
    isInitiating: false,
    pendingIceCandidates: [],
    peerConnection: null,
    incomingOffer: null,
    isMinimized: false,
    isScreenSharing: false,
    facingMode: "user",
    screenStream: null,
    isAcquiringMedia: false,
    isRemoteMuted: false,
    isRemoteVideoOff: false,
    isRemoteScreenSharing: false,
    connectionQuality: "good",
    prevPacketsLost: 0,
    prevPacketsReceived: 0,
    consecutiveBadChecks: 0,

    setRemoteMuted: (isMuted) => set({ isRemoteMuted: isMuted }),
    setRemoteVideoOff: (isVideoOff) => set({ isRemoteVideoOff: isVideoOff }),
    setRemoteScreenSharing: (isScreenSharing) => set({ isRemoteScreenSharing: isScreenSharing }),

    // Initiate an outgoing call
    initiateCall: async (targetUser, type) => {
      if (get().isInitiating || get().callState !== "idle") return;
      
      set({ isInitiating: true, callState: "calling", callType: type, peer: targetUser, pendingIceCandidates: [] });
      startRingtone("dialing");

      const socket = userAuthStore.getState().socket;
      if (!socket) {
        toast.error("Socket connection offline. Unable to place call.");
        get().endCall(false);
        return;
      }

      try {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: type === "video"
        };
        set({ isAcquiringMedia: true });
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        set({ isAcquiringMedia: false, localStream: stream });

        // Bind onended to local tracks
        stream.getTracks().forEach(track => {
          track.onended = () => {
            toast.error(`Local ${track.kind} track was disconnected.`);
            get().endCall();
          };
        });

        // Initialize Peer Connection
        const pc = new RTCPeerConnection(rtcConfig);
        set({ peerConnection: pc });

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            console.warn(`WebRTC connection state changed to ${pc.connectionState}. Ending call.`);
            toast.error("Call connection lost.");
            get().endCall();
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            console.warn(`WebRTC ICE connection state changed to ${pc.iceConnectionState}. Ending call.`);
            toast.error("Call connection lost.");
            get().endCall();
          }
        };

        // Add local tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle remote stream tracks
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            const rStream = event.streams[0];
            set({ remoteStream: rStream });
            rStream.getTracks().forEach((track) => {
              track.onended = () => {
                console.warn(`Remote track ${track.kind} ended. Ending call.`);
                toast.error("Remote call track ended.");
                get().endCall();
              };
            });
          }
        };

        // Handle local ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              to: targetUser._id,
              candidate: event.candidate
            });
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call-user", {
          to: targetUser._id,
          offer,
          type
        });

      } catch (err) {
        set({ isAcquiringMedia: false });
        console.error("getUserMedia or WebRTC offer error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          toast.error("Camera or microphone permission was denied.");
        } else {
          toast.error("Could not access camera/microphone.");
        }
        get().endCall();
      } finally {
        set({ isInitiating: false });
      }
    },

    // Receive incoming call offer
    receiveCall: (caller, type, offer) => {
      const socket = userAuthStore.getState().socket;
      if (get().callState !== "idle") {
        // Automatically reply busy if already in another call
        if (socket) {
          socket.emit("call-busy", { to: caller._id });
        }
        return;
      }

      set({
        callState: "ringing",
        callType: type,
        peer: caller,
        incomingOffer: offer,
        pendingIceCandidates: []
      });
      startRingtone("ringing");
    },

    // Accept the incoming call
    acceptCall: async () => {
      stopRingtone();
      const { peer, callType, incomingOffer } = get();
      if (!peer || !incomingOffer) return;

      const socket = userAuthStore.getState().socket;
      if (!socket) {
        toast.error("Offline. Unable to answer call.");
        get().endCall(false);
        return;
      }

      try {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: callType === "video"
        };
        set({ isAcquiringMedia: true });
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        set({ isAcquiringMedia: false, localStream: stream, callState: "active" });

        stream.getTracks().forEach(track => {
          track.onended = () => {
            toast.error(`Local ${track.kind} track was disconnected.`);
            get().endCall();
          };
        });

        const pc = new RTCPeerConnection(rtcConfig);
        set({ peerConnection: pc });

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            console.warn(`WebRTC connection state changed to ${pc.connectionState}. Ending call.`);
            toast.error("Call connection lost.");
            get().endCall();
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
            console.warn(`WebRTC ICE connection state changed to ${pc.iceConnectionState}. Ending call.`);
            toast.error("Call connection lost.");
            get().endCall();
          }
        };

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            const rStream = event.streams[0];
            set({ remoteStream: rStream });
            rStream.getTracks().forEach((track) => {
              track.onended = () => {
                console.warn(`Remote track ${track.kind} ended. Ending call.`);
                toast.error("Remote call track ended.");
                get().endCall();
              };
            });
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", {
              to: peer._id,
              candidate: event.candidate
            });
          }
        };

        // Set remote description from caller's offer
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer-call", {
          to: peer._id,
          answer
        });

        // Process queued ice candidates that came in before setRemoteDescription resolved
        const { pendingIceCandidates } = get();
        for (const candidate of pendingIceCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Error adding queued ice candidate:", e);
          }
        }
        set({ pendingIceCandidates: [] });

        // Start duration timer
        set({ callDuration: 0 });
        timerInterval = setInterval(() => {
          set((state) => ({ callDuration: state.callDuration + 1 }));
          if (get().callDuration % 2 === 0) {
            get().updateConnectionQuality();
          }
        }, 1000);

      } catch (err) {
        set({ isAcquiringMedia: false });
        console.error("acceptCall error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          toast.error("Camera or microphone permission was denied.");
        } else {
          toast.error("Could not access camera/microphone.");
        }
        // Notify peer we rejected due to failure
        socket.emit("reject-call", { to: peer._id });
        get().endCall(false);
      }
    },

    // Reject incoming call
    rejectCall: () => {
      stopRingtone();
      const { peer } = get();
      const socket = userAuthStore.getState().socket;
      if (peer && socket) {
        socket.emit("reject-call", { to: peer._id });
      }
      get().resetStoreState();
    },

    // Cancel outbound call before answer
    cancelCall: () => {
      stopRingtone();
      const { peer } = get();
      const socket = userAuthStore.getState().socket;
      if (peer && socket) {
        socket.emit("cancel-call", { to: peer._id });
      }
      get().endCall(false);
    },

    // Handle SDP answer received from callee
    handleAnswer: async (answer) => {
      stopRingtone();
      const { peerConnection } = get();
      if (!peerConnection) return;
      if (peerConnection.signalingState === "stable") {
        console.log("Connection already stable. Ignoring duplicate SDP answer.");
        return;
      }
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        set({ callState: "active" });

        // Process queued ice candidates
        const { pendingIceCandidates } = get();
        for (const candidate of pendingIceCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Error adding queued ice candidate:", e);
          }
        }
        set({ pendingIceCandidates: [] });

        // Start duration timer
        set({ callDuration: 0 });
        timerInterval = setInterval(() => {
          set((state) => ({ callDuration: state.callDuration + 1 }));
          if (get().callDuration % 2 === 0) {
            get().updateConnectionQuality();
          }
        }, 1000);
      } catch (err) {
        console.error("Failed to handle answer:", err);
        get().endCall();
      }
    },

    // Handle incoming ICE candidate
    handleIceCandidate: async (candidate) => {
      const { peerConnection } = get();
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding ICE candidate:", e);
        }
      } else {
        // Queue candidates until remote description is set
        set((state) => ({
          pendingIceCandidates: [...state.pendingIceCandidates, candidate]
        }));
      }
    },

    // Toggle mute
    toggleMute: () => {
      const { localStream, isMuted, peer } = get();
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = isMuted;
        });
        const nextMuted = !isMuted;
        set({ isMuted: nextMuted });
        const socket = userAuthStore.getState().socket;
        if (socket && peer) {
          socket.emit("call-toggle-mute", { to: peer._id, isMuted: nextMuted });
        }
      }
    },

    // Toggle video camera
    toggleVideo: () => {
      const { localStream, isVideoOff, peer } = get();
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = isVideoOff;
        });
        const nextVideoOff = !isVideoOff;
        set({ isVideoOff: nextVideoOff });
        const socket = userAuthStore.getState().socket;
        if (socket && peer) {
          socket.emit("call-toggle-video", { to: peer._id, isVideoOff: nextVideoOff });
        }
      }
    },

    // Terminate Call
    endCall: (notifyRemote = true) => {
      stopRingtone();
      const { peer, peerConnection, localStream, screenStream } = get();
      const socket = userAuthStore.getState().socket;

      if (notifyRemote && peer && socket) {
        socket.emit("end-call", { to: peer._id });
      }

      // Stop all screen share tracks if active
      if (screenStream) {
        screenStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Stop all local media tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Close WebRTC peer connection
      if (peerConnection) {
        peerConnection.close();
      }

      get().resetStoreState();
    },

    updateConnectionQuality: async () => {
      const { peerConnection } = get();
      if (!peerConnection || peerConnection.connectionState === "closed") return;
      try {
        const stats = await peerConnection.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          // Check for RTT on succeeded/nominated candidate pairs
          if (report.type === "candidate-pair" && report.state === "succeeded" && report.currentRoundTripTime !== undefined) {
            rtt = report.currentRoundTripTime;
          }
          // Check for packet loss on inbound RTP streams
          if (report.type === "inbound-rtp" && (report.kind === "audio" || report.kind === "video")) {
            if (report.packetsLost !== undefined) packetsLost += report.packetsLost;
            if (report.packetsReceived !== undefined) packetsReceived += report.packetsReceived;
          }
        });

        const prevLost = get().prevPacketsLost;
        const prevReceived = get().prevPacketsReceived;

        const deltaLost = packetsLost - prevLost;
        const deltaReceived = packetsReceived - prevReceived;
        const totalPackets = deltaLost + deltaReceived;

        let lossRate = 0;
        if (totalPackets > 0 && deltaLost >= 0) {
          lossRate = (deltaLost / totalPackets) * 100; // In percentage
        }

        set({ prevPacketsLost: packetsLost, prevPacketsReceived: packetsReceived });

        let evaluatedQuality = "good";
        // Thresholds:
        // Poor if RTT > 200ms (0.2s) or lossRate > 2%
        // Bad if RTT > 400ms (0.4s) or lossRate > 10%
        if (rtt > 0.4 || lossRate > 10) {
          evaluatedQuality = "bad";
        } else if (rtt > 0.2 || lossRate > 2) {
          evaluatedQuality = "poor";
        }

        if (evaluatedQuality !== "good") {
          const nextCount = get().consecutiveBadChecks + 1;
          set({ consecutiveBadChecks: nextCount });
          if (nextCount >= 2) {
            set({ connectionQuality: evaluatedQuality });
          }
        } else {
          set({ consecutiveBadChecks: 0, connectionQuality: "good" });
        }
      } catch (err) {
        console.warn("Error updating connection quality:", err);
      }
    },

    // Clean up local store states
    resetStoreState: () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      set({
        callState: "idle",
        peer: null,
        localStream: null,
        remoteStream: null,
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
        pendingIceCandidates: [],
        peerConnection: null,
        incomingOffer: null,
        isMinimized: false,
        isScreenSharing: false,
        facingMode: "user",
        screenStream: null,
        isAcquiringMedia: false,
        isRemoteMuted: false,
        isRemoteVideoOff: false,
        isRemoteScreenSharing: false,
        connectionQuality: "good",
        prevPacketsLost: 0,
        prevPacketsReceived: 0,
        consecutiveBadChecks: 0
      });
    },

    // Toggle minimization
    toggleMinimize: () => {
      set({ isMinimized: !get().isMinimized });
    },

    // Switch camera sequentially (user <-> environment facing mode)
    switchCamera: async () => {
      const { localStream, peerConnection, callType } = get();
      if (!localStream || callType !== "video") return;

      // 1. Stop old video tracks to release camera hardware
      localStream.getVideoTracks().forEach(track => track.stop());

      const nextMode = get().facingMode === "user" ? "environment" : "user";
      set({ facingMode: nextMode });

      try {
        // 2. Request new video stream with next facing mode
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode }
        });
        const newVideoTrack = stream.getVideoTracks()[0];

        newVideoTrack.onended = () => {
          toast.error("Local video track was disconnected.");
          get().endCall();
        };

        // 3. Update local stream state
        const updatedStream = new MediaStream([
          ...localStream.getAudioTracks(),
          newVideoTrack
        ]);
        set({ localStream: updatedStream });

        // 4. replaceTrack on peer connection sender
        if (peerConnection) {
          const videoSender = peerConnection.getSenders().find(s => s.track?.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }
      } catch (err) {
        console.error("switchCamera error:", err);
        toast.error("Failed to switch camera device.");
        get().endCall();
      }
    },

    // Toggle Screen Share with mobile availability checks and replacement fallback
    toggleScreenShare: async () => {
      const { isScreenSharing, localStream, screenStream, peerConnection } = get();

      if (isScreenSharing) {
        // STOP screen sharing, revert to camera
        if (screenStream) {
          screenStream.getTracks().forEach(t => t.stop());
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: get().facingMode }
          });
          const cameraTrack = stream.getVideoTracks()[0];

          cameraTrack.onended = () => {
            toast.error("Local video track was disconnected.");
            get().endCall();
          };

          const updatedStream = new MediaStream([
            ...localStream.getAudioTracks(),
            cameraTrack
          ]);
          set({ localStream: updatedStream, isScreenSharing: false, screenStream: null });
          const socket = userAuthStore.getState().socket;
          const { peer } = get();
          if (socket && peer) {
            socket.emit("call-toggle-screen-share", { to: peer._id, isScreenSharing: false });
          }

          if (peerConnection) {
            const videoSender = peerConnection.getSenders().find(s => s.track?.kind === "video");
            if (videoSender) {
              await videoSender.replaceTrack(cameraTrack);
            }
          }
        } catch (err) {
          console.error("Failed to restore camera feed:", err);
          toast.error("Failed to restore camera.");
          get().endCall();
        }
      } else {
        // START screen sharing
        if (!navigator.mediaDevices?.getDisplayMedia) {
          toast.error("Screen sharing is not supported on this browser or device.");
          return;
        }

        try {
          const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = sStream.getVideoTracks()[0];

          // Revert automatically if sharing is stopped via browser control bar
          screenTrack.onended = () => {
            // Check if we are still active before attempting revert
            if (get().callState === "active" && get().isScreenSharing) {
              get().toggleScreenShare();
            }
          };

          // Stop existing camera video tracks
          localStream.getVideoTracks().forEach(t => t.stop());

          const updatedStream = new MediaStream([
            ...localStream.getAudioTracks(),
            screenTrack
          ]);
          set({ localStream: updatedStream, isScreenSharing: true, screenStream: sStream });
          const socket = userAuthStore.getState().socket;
          const { peer } = get();
          if (socket && peer) {
            socket.emit("call-toggle-screen-share", { to: peer._id, isScreenSharing: true });
          }

          if (peerConnection) {
            const videoSender = peerConnection.getSenders().find(s => s.track?.kind === "video");
            if (videoSender) {
              await videoSender.replaceTrack(screenTrack);
            }
          }
        } catch (err) {
          console.error("Screen share error:", err);
          if (err.name !== "NotAllowedError" && err.name !== "PermissionDeniedError") {
            toast.error("Failed to start screen share.");
          }
        }
      }
    }
  };
});
