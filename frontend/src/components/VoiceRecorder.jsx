import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, StopCircleIcon, XIcon, PlayIcon, PauseIcon, SendIcon } from 'lucide-react';
import toast from 'react-hot-toast';

function VoiceRecorder({ onSendAudio }) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
    const [audioBase64, setAudioBase64] = useState(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const durationRef = useRef(0);
    const previewAudioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        };
    }, [audioPreviewUrl]);

    const startRecording = async () => {
        try {
            // Reset any existing preview
            if (audioPreviewUrl) {
                URL.revokeObjectURL(audioPreviewUrl);
                setAudioPreviewUrl(null);
                setAudioBase64(null);
            }

            console.log("Requesting microphone access...");
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                });
                console.log("Microphone access granted with audio processing disabled.");
            } catch (err) {
                console.warn("Could not get user media with disabled processing, falling back to default audio: true", err);
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            
            // Validate and log tracks
            const tracks = stream.getAudioTracks();
            console.log(`Audio tracks found: ${tracks.length}`);
            tracks.forEach((t, i) => {
                console.log(`Track ${i}: label="${t.label}", enabled=${t.enabled}, readyState="${t.readyState}"`);
            });

            let options = {};
            if (typeof MediaRecorder !== 'undefined') {
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    options = { mimeType: 'audio/webm;codecs=opus' };
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    options = { mimeType: 'audio/webm' };
                } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                    options = { mimeType: 'audio/ogg;codecs=opus' };
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options = { mimeType: 'audio/mp4' };
                }
            }
            console.log("Configuring MediaRecorder with options:", options);

            mediaRecorderRef.current = new MediaRecorder(stream, options);
            audioChunksRef.current = [];

            mediaRecorderRef.current.onerror = (event) => {
                console.error("MediaRecorder error:", event.error);
                toast.error(`Recording error: ${event.error?.name || 'Unknown'}`);
            };

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log(`Audio chunk received: ${event.data.size} bytes. Total chunks: ${audioChunksRef.current.length}`);
                } else {
                    console.warn("Received empty audio chunk.");
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const recordedType = mediaRecorderRef.current.mimeType || 'audio/webm';
                const cleanType = recordedType.split(';')[0];
                const blob = new Blob(audioChunksRef.current, { type: cleanType });
                console.log(`Recording stopped. Total chunks: ${audioChunksRef.current.length}, Blob size: ${blob.size} bytes, type: "${cleanType}"`);
                
                if (blob.size === 0) {
                    console.error("Recorded blob is empty (0 bytes)!");
                    toast.error("Recording failed: empty audio file generated.");
                    return;
                }

                const objectUrl = URL.createObjectURL(blob);
                setAudioPreviewUrl(objectUrl);

                // Convert to base64 for sending
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAudioBase64(reader.result);
                    console.log("Successfully converted audio to base64 string.");
                };
                reader.readAsDataURL(blob);

                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log(`Stopped track: ${track.label}`);
                });
            };

            // Start with a 250ms timeslice to ensure continuous chunk deliveries
            mediaRecorderRef.current.start(250);
            console.log("MediaRecorder started with 250ms timeslice. state:", mediaRecorderRef.current.state);
            setIsRecording(true);
            setDuration(0);
            durationRef.current = 0;

            // Start timer
            timerRef.current = setInterval(() => {
                durationRef.current += 1;
                setDuration(durationRef.current);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            // Stop without saving
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.onstop = () => {
                const stream = mediaRecorderRef.current.stream;
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setDuration(0);
            durationRef.current = 0;
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const handleSend = () => {
        if (audioBase64) {
            onSendAudio(audioBase64, duration);
            handleDiscard();
        }
    };

    const handleDiscard = () => {
        if (isPlayingPreview && previewAudioRef.current) {
            previewAudioRef.current.pause();
        }
        if (audioPreviewUrl) {
            URL.revokeObjectURL(audioPreviewUrl);
        }
        setAudioPreviewUrl(null);
        setAudioBase64(null);
        setDuration(0);
        durationRef.current = 0;
        setIsPlayingPreview(false);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 1. Preview State Overlay (Futuristic Glassmorphic Complete Overlay)
    if (audioPreviewUrl) {
        return (
            <div 
                className="absolute inset-0 z-20 flex items-center justify-between gap-3 px-4 shadow-2xl animate-fade-in"
                style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-accent)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '1rem',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)'
                }}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={() => {
                            if (isPlayingPreview) {
                                if (previewAudioRef.current) {
                                    previewAudioRef.current.pause();
                                }
                                setIsPlayingPreview(false);
                            } else {
                                if (previewAudioRef.current) {
                                    previewAudioRef.current.muted = false;
                                    previewAudioRef.current.volume = 1.0;
                                    previewAudioRef.current.play()
                                        .then(() => {
                                            setIsPlayingPreview(true);
                                        })
                                        .catch(err => {
                                            console.error("Preview playback failed:", err);
                                            toast.error("Failed to play preview");
                                            setIsPlayingPreview(false);
                                        });
                                }
                            }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-white active:scale-90 flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                            boxShadow: '0 2px 10px var(--accent-glow)'
                        }}
                        title={isPlayingPreview ? "Pause replay" : "Replay voice note"}
                    >
                        {isPlayingPreview ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                    </button>
                    <audio
                        ref={previewAudioRef}
                        src={audioPreviewUrl}
                        preload="auto"
                        controls={false}
                        onEnded={() => setIsPlayingPreview(false)}
                        className="sr-only"
                    />
                    
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: 'var(--text-muted)' }}>Voice Message Preview</span>
                        <span className="text-sm font-semibold block font-mono" style={{ color: 'var(--text-primary)' }}>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleSend}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-white shadow-lg active:scale-90"
                        style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)'
                        }}
                        title="Send audio message"
                    >
                        <SendIcon size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={handleDiscard}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border"
                        style={{
                            background: 'var(--bg-glass-hover)',
                            borderColor: 'var(--danger-color)',
                            color: 'var(--danger-color)'
                        }}
                        title="Discard recording"
                    >
                        <XIcon size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // 2. Active Recording Overlay (Futuristic Pulsing Waves Complete Overlay)
    if (isRecording) {
        return (
            <div 
                className="absolute inset-0 z-20 flex items-center justify-between gap-3 px-4 shadow-2xl animate-fade-in"
                style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--danger-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '1rem',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)'
                }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Futuristic pulsing indicator */}
                    <div className="relative flex items-center justify-center flex-shrink-0">
                        <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping absolute opacity-75" />
                        <div className="w-3.5 h-3.5 bg-red-500 rounded-full relative border border-red-400 shadow-md" />
                    </div>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>Recording Voice...</span>
                </div>

                {/* Animated Waveform Bars */}
                <div className="hidden min-[380px]:flex items-center gap-[2.5px] h-5 px-2 flex-1 justify-center max-w-[80px] sm:max-w-[120px] md:max-w-[200px] overflow-hidden">
                    {[3, 6, 4, 8, 5, 9, 6, 4, 7, 5, 8, 3].map((h, i) => (
                        <div
                            key={i}
                            className="w-[2.5px] rounded-full transition-all duration-75"
                            style={{
                                height: `${h * 2}px`,
                                background: 'linear-gradient(to top, var(--danger-color), #f43f5e)',
                                animation: `waveBounce ${0.5 + i * 0.08}s ease-in-out infinite alternate`
                            }}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-secondary)' }}>{formatTime(duration)}</span>
                    
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-white shadow-lg active:scale-90"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                                boxShadow: '0 2px 10px var(--accent-glow)'
                            }}
                            title="Stop and preview"
                        >
                            <StopCircleIcon size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={cancelRecording}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border"
                            style={{
                                background: 'var(--bg-glass-hover)',
                                borderColor: 'var(--danger-color)',
                                color: 'var(--danger-color)'
                            }}
                            title="Cancel recording"
                        >
                            <XIcon size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Inactive State (Default Mic Trigger)
    return (
        <button
            type="button"
            onClick={startRecording}
            className="p-1.5 sm:p-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
            style={{
                color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-hover)';
                e.currentTarget.style.background = 'var(--bg-glass-hover)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
            }}
            title="Record voice message"
        >
            <MicIcon size={18} className="sm:w-5 sm:h-5" />
        </button>
    );
}

export default VoiceRecorder;
