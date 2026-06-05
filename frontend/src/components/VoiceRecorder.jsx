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

    // 1. Preview State Overlay
    if (audioPreviewUrl) {
        return (
            <div className="absolute inset-x-4 inset-y-4 bg-slate-900 z-20 flex items-center gap-3 px-4 rounded-lg border border-slate-700 shadow-xl animate-fade-in">
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
                    className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-full transition-colors text-white"
                    title={isPlayingPreview ? "Pause replay" : "Replay voice note"}
                >
                    {isPlayingPreview ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
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
                    <span className="text-xs text-slate-400 block">Voice Message Preview</span>
                    <span className="text-sm font-medium text-slate-200 block font-mono">{formatTime(duration)}</span>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleSend}
                        className="p-2.5 bg-green-600 hover:bg-green-500 rounded-full transition-colors text-white shadow-lg shadow-green-900/20"
                        title="Send audio message"
                    >
                        <SendIcon size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={handleDiscard}
                        className="p-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-full transition-colors"
                        title="Discard recording"
                    >
                        <XIcon size={16} />
                    </button>
                </div>
            </div>
        );
    }

    // 2. Active Recording Overlay
    if (isRecording) {
        return (
            <div className="absolute inset-x-4 inset-y-4 bg-slate-900 z-20 flex items-center gap-3 px-4 rounded-lg border border-red-500/20 shadow-xl">
                <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-pulse border border-red-400" />
                    <span className="text-sm font-medium text-slate-200">Recording Audio...</span>
                </div>
                <span className="text-sm text-slate-400 font-mono font-medium ml-2">{formatTime(duration)}</span>
                
                <div className="flex gap-2 ml-auto">
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="p-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-full transition-colors text-white shadow-lg shadow-cyan-900/20"
                        title="Stop and preview"
                    >
                        <StopCircleIcon size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={cancelRecording}
                        className="p-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 rounded-full transition-colors"
                        title="Cancel recording"
                    >
                        <XIcon size={16} />
                    </button>
                </div>
            </div>
        );
    }

    // 3. Inactive State (Default Mic Trigger)
    return (
        <button
            type="button"
            onClick={startRecording}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Record voice message"
        >
            <MicIcon size={20} />
        </button>
    );
}

export default VoiceRecorder;
