// Aether Chat sound synthesizer utility using Web Audio API

const playTone = (freqs, duration, type = 'sine', bypassSettings = false) => {
    // Check if sound effects are enabled in user settings
    if (!bypassSettings && localStorage.getItem('aether-chat-sfx-enabled') === 'false') return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
        const ctx = new AudioContext();
        
        // Handle browser autoplay policy suspensions
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        // Sequence of frequencies
        let time = now;
        freqs.forEach(([freq, dur]) => {
            osc.frequency.setValueAtTime(freq, time);
            time += dur;
        });

        // Volume Envelope
        gain.gain.setValueAtTime(0.06, now); // soft volume
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        // Fallback silently for any audio context errors
        console.warn("Web Audio synthesis error:", e);
    }
};

export const playSentSound = () => {
    // Quick, futuristic rising chirp
    playTone([
        [523.25, 0.04], // C5
        [659.25, 0.04], // E5
        [880.00, 0.06]  // A5
    ], 0.14, 'triangle');
};

export const playReceivedSound = (bypassSettings = false) => {
    // Elegant, soft double beep (high-low)
    playTone([
        [783.99, 0.05], // G5
        [0, 0.02],       // Silence gap
        [698.46, 0.07]  // F5
    ], 0.14, 'sine', bypassSettings);
};

export const playOnlineSound = () => {
    // Ascending scale chime (online status check)
    playTone([
        [392.00, 0.04], // G4
        [523.25, 0.04], // C5
        [659.25, 0.04], // E5
        [783.99, 0.06]  // G5
    ], 0.18, 'sine');
};

export const playOfflineSound = () => {
    // Descending scale chime (offline status check)
    playTone([
        [783.99, 0.04], // G5
        [659.25, 0.04], // E5
        [523.25, 0.04], // C5
        [392.00, 0.06]  // G4
    ], 0.18, 'sine');
};

export const playRingingSound = () => {
    // Repeating soft call ringing chime
    playTone([
        [440.00, 0.1], 
        [554.37, 0.1], 
        [659.25, 0.15]
    ], 0.35, 'triangle');
};
