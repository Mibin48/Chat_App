import React, { useEffect } from 'react';
import { XIcon, SendIcon, CakeIcon, HeartIcon, SparklesIcon, GiftIcon } from 'lucide-react';

function BirthdayPage({ user, onClose, onSendWish }) {
    useEffect(() => {
        // Play a soft celebratory chime when opening the celebration page
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const now = ctx.currentTime;
                const playNote = (pitch, time, duration = 0.4) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(pitch, time);
                    gain.gain.setValueAtTime(0.06, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
                    osc.start(time);
                    osc.stop(time + duration);
                };
                playNote(523.25, now); // C5
                playNote(659.25, now + 0.15); // E5
                playNote(783.99, now + 0.3); // G5
                playNote(1046.50, now + 0.45, 0.6); // C6
            }
        } catch (e) {
            console.log("Audio celebration failed:", e);
        }
    }, []);

    const wishes = [
        `Happy Birthday, ${user.fullName}! 🎂 Hope you have an amazing day filled with love and laughter! 🎉`,
        `Wishing you a very Happy Birthday! May this year bring you endless happiness, success, and good health! 🎈✨`,
        `Happy Birthday! 🎁 Thank you for being such a wonderful person. Have a blast today! 🥳💖`,
        `Sending you warmest wishes on your birthday! 🍰 Hope all your dreams and wishes come true! 🌟`
    ];

    // Generate floating balloons and falling confetti data
    const balloons = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 90}%`,
        delay: `${Math.random() * 8}s`,
        color: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 6],
        duration: `${8 + Math.random() * 6}s`
    }));

    const confetti = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        color: ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#eab308', '#ec4899'][i % 6],
        size: `${6 + Math.random() * 8}px`,
        duration: `${4 + Math.random() * 4}s`
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-hidden font-sans select-none">
            {/* Custom keyframes injected locally */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes floatBalloon {
                    0% { transform: translateY(110vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.85; }
                    90% { opacity: 0.85; }
                    100% { transform: translateY(-20vh) rotate(${Math.random() > 0.5 ? 15 : -15}deg); opacity: 0; }
                }
                @keyframes fallConfetti {
                    0% { transform: translateY(-10vh) rotate(0deg) translateX(0); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg) translateX(${Math.random() > 0.5 ? '20px' : '-20px'}); opacity: 0; }
                }
                @keyframes cardEntrance {
                    0% { transform: scale(0.85); opacity: 0; filter: blur(5px); }
                    100% { transform: scale(1); opacity: 1; filter: blur(0); }
                }
            `}} />

            {/* Falling Confetti */}
            {confetti.map(c => (
                <div
                    key={`c-${c.id}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: c.left,
                        top: '-10px',
                        width: c.size,
                        height: c.size,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        backgroundColor: c.color,
                        animation: `fallConfetti ${c.duration} linear infinite`,
                        animationDelay: c.delay
                    }}
                />
            ))}

            {/* Floating Balloons */}
            {balloons.map(b => (
                <div
                    key={`b-${b.id}`}
                    className="absolute pointer-events-none flex flex-col items-center"
                    style={{
                        left: b.left,
                        bottom: '-100px',
                        animation: `floatBalloon ${b.duration} ease-in-out infinite`,
                        animationDelay: b.delay
                    }}
                >
                    {/* Balloon Body */}
                    <div 
                        className="w-10 h-12 rounded-t-full rounded-b-[45%] relative"
                        style={{ 
                            backgroundColor: b.color,
                            boxShadow: `inset -3px -3px 8px rgba(0,0,0,0.3), 0 4px 12px ${b.color}40`
                        }}
                    >
                        {/* Balloon Highlight */}
                        <div className="absolute top-1.5 left-2 w-2.5 h-4 bg-white/30 rounded-full rotate-[15deg]" />
                    </div>
                    {/* Balloon Knot */}
                    <div className="w-2 h-1.5 -mt-0.5 border-t-2" style={{ borderTopColor: b.color, backgroundColor: b.color }} />
                    {/* Balloon String */}
                    <div className="w-0.5 h-10 bg-white/20" />
                </div>
            ))}

            {/* Backdrop click handler */}
            <div className="absolute inset-0 z-0 cursor-default" onClick={onClose} />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-all active:scale-90 z-10"
            >
                <XIcon size={20} />
            </button>

            {/* Centered Celebration Card */}
            <div 
                className="w-full max-w-lg p-6 sm:p-8 rounded-3xl border text-center relative z-10 flex flex-col items-center gap-5"
                style={{ 
                    borderColor: 'rgba(236,72,153,0.3)', 
                    background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(10,10,20,0.95) 100%)',
                    backdropFilter: 'blur(25px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(236,72,153,0.25)',
                    animation: 'cardEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                }}
            >
                {/* Cake Icon wrapper */}
                <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-pink-500 to-purple-600 shadow-lg relative animate-bounce"
                    style={{ boxShadow: '0 0 20px rgba(236,72,153,0.5)' }}
                >
                    <CakeIcon size={32} className="text-white" />
                </div>

                <div className="space-y-1.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                        Happy Birthday! <span className="text-pink-400">🎉</span>
                    </h1>
                    <p className="text-sm text-zinc-300">
                        Celebrate <span className="text-pink-400 font-bold">{user.fullName}</span>'s special day
                    </p>
                </div>

                {/* Profile Avatar wrapped in a birthday frame */}
                <div className="relative my-2">
                    <div 
                        className="w-24 h-24 rounded-full overflow-hidden border-4 p-1 bg-zinc-950 flex items-center justify-center"
                        style={{ borderColor: 'rgba(236,72,153,0.8)' }}
                    >
                        <img 
                            src={user.profilePic || "/avatar.png"} 
                            alt={user.fullName} 
                            className="w-full h-full object-cover rounded-full"
                        />
                    </div>
                    {/* Crown / Sparkle floating effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-zinc-950 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md rotate-[-5deg] flex items-center gap-0.5">
                        <SparklesIcon size={9} fill="currentColor" /> Birthday Crown
                    </div>
                </div>

                {/* Quick send wish templates */}
                <div className="w-full space-y-3.5 mt-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-pink-400 flex items-center justify-center gap-1.5">
                        <GiftIcon size={12} /> Send a special birthday wish
                    </h4>
                    
                    <div className="flex flex-col gap-2">
                        {wishes.map((wish, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSendWish(wish)}
                                className="w-full p-3 text-left text-xs text-zinc-300 rounded-xl bg-white/5 hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 transition-all active:scale-[0.98] duration-150 flex items-center justify-between gap-3 group"
                            >
                                <span className="line-clamp-2 leading-relaxed">{wish}</span>
                                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/5 group-hover:bg-pink-600 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all">
                                    <SendIcon size={11} />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BirthdayPage;
