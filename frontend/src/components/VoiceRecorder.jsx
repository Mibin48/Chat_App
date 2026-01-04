import React, { useState, useRef, useEffect } from 'react';
import { MicIcon, StopCircleIcon, XIcon } from 'lucide-react';
import toast from 'react-hot-toast';

function VoiceRecorder({ onSendAudio }) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                // Convert to base64 and send immediately
                const reader = new FileReader();
                reader.onloadend = () => {
                    onSendAudio(reader.result, duration);
                    setDuration(0);
                };
                reader.readAsDataURL(blob);

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
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
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isRecording) {
        return (
            <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-200">Recording...</span>
                </div>
                <span className="text-sm text-slate-300 font-mono">{formatTime(duration)}</span>
                <div className="flex gap-1 ml-auto">
                    <button
                        onClick={stopRecording}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                        title="Send voice message"
                    >
                        <StopCircleIcon size={16} />
                    </button>
                    <button
                        onClick={cancelRecording}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                        title="Cancel"
                    >
                        <XIcon size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={startRecording}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Record voice message"
        >
            <MicIcon size={20} />
        </button>
    );
}

export default VoiceRecorder;
