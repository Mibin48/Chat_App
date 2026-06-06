import React, { useEffect, useRef } from 'react';
import { userChatStore } from '../store/userChatStore';

const DynamicBackground = () => {
    const { theme } = userChatStore();
    const containerRef = useRef(null);

    useEffect(() => {
        let rafId;
        let latestX = 0;
        let latestY = 0;
        let needsUpdate = false;

        const updatePosition = () => {
            if (needsUpdate && containerRef.current) {
                containerRef.current.style.setProperty('--mx', latestX.toFixed(3));
                containerRef.current.style.setProperty('--my', latestY.toFixed(3));
                needsUpdate = false;
            }
            rafId = requestAnimationFrame(updatePosition);
        };

        const handleMouseMove = (e) => {
            latestX = (e.clientX / window.innerWidth) - 0.5;
            latestY = (e.clientY / window.innerHeight) - 0.5;
            needsUpdate = true;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        rafId = requestAnimationFrame(updatePosition);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(rafId);
        };
    }, []);

    // Set theme-specific blob colors
    let blob1Color = 'rgba(99, 102, 241, 0.22)';  // Indigo
    let blob2Color = 'rgba(124, 58, 237, 0.22)';  // Violet
    let blob3Color = 'rgba(236, 72, 153, 0.16)';  // Pink

    if (theme === 'midnight') {
        blob1Color = 'rgba(139, 92, 246, 0.25)';   // Bright Purple
        blob2Color = 'rgba(76, 29, 149, 0.3)';     // Deep Violet
        blob3Color = 'rgba(168, 85, 247, 0.2)';    // Magenta/Purple
    } else if (theme === 'amethyst') {
        blob1Color = 'rgba(99, 102, 241, 0.1)';   // Soft Lavender
        blob2Color = 'rgba(167, 139, 250, 0.12)';  // Light Purple
        blob3Color = 'rgba(244, 114, 182, 0.08)';  // Soft Pink
    }

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 -z-50 overflow-hidden pointer-events-none w-full h-full transition-all duration-700"
            style={{ 
                background: 'var(--bg-base)',
                '--mx': '0',
                '--my': '0'
            }}
        >
            {/* Ambient Base Light */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/[0.01]" />

            {/* Floating Orb 1 */}
            <div 
                className="absolute w-[45vw] h-[45vw] rounded-full blur-[100px] transition-transform duration-300 ease-out"
                style={{
                    background: blob1Color,
                    top: '-10%',
                    left: '10%',
                    transform: 'translate(calc(var(--mx) * -35px), calc(var(--my) * -35px))',
                    animation: 'floatOrb1 25s ease-in-out infinite alternate'
                }}
            />

            {/* Floating Orb 2 */}
            <div 
                className="absolute w-[50vw] h-[50vw] rounded-full blur-[110px] transition-transform duration-300 ease-out"
                style={{
                    background: blob2Color,
                    bottom: '-15%',
                    right: '10%',
                    transform: 'translate(calc(var(--mx) * 45px), calc(var(--my) * 45px))',
                    animation: 'floatOrb2 30s ease-in-out infinite alternate'
                }}
            />

            {/* Floating Orb 3 */}
            <div 
                className="absolute w-[35vw] h-[35vw] rounded-full blur-[90px] transition-transform duration-300 ease-out"
                style={{
                    background: blob3Color,
                    top: '35%',
                    left: '50%',
                    transform: 'translate(calc(var(--mx) * 25px), calc(var(--my) * -25px))',
                    animation: 'floatOrb3 20s ease-in-out infinite alternate'
                }}
            />

            <style>{`
                @keyframes floatOrb1 {
                    0% { transform: translate(calc(var(--mx) * -35px), calc(var(--my) * -35px)) translate(0px, 0px) scale(1); }
                    50% { transform: translate(calc(var(--mx) * -35px), calc(var(--my) * -35px)) translate(30px, -40px) scale(1.1); }
                    100% { transform: translate(calc(var(--mx) * -35px), calc(var(--my) * -35px)) translate(-20px, 20px) scale(0.95); }
                }
                @keyframes floatOrb2 {
                    0% { transform: translate(calc(var(--mx) * 45px), calc(var(--my) * 45px)) translate(0px, 0px) scale(1); }
                    50% { transform: translate(calc(var(--mx) * 45px), calc(var(--my) * 45px)) translate(-40px, 30px) scale(0.9); }
                    100% { transform: translate(calc(var(--mx) * 45px), calc(var(--my) * 45px)) translate(20px, -20px) scale(1.05); }
                }
                @keyframes floatOrb3 {
                    0% { transform: translate(calc(var(--mx) * 25px), calc(var(--my) * -25px)) translate(0px, 0px); }
                    50% { transform: translate(calc(var(--mx) * 25px), calc(var(--my) * -25px)) translate(50px, 50px); }
                    100% { transform: translate(calc(var(--mx) * 25px), calc(var(--my) * -25px)) translate(-30px, -30px); }
                }
            `}</style>
        </div>
    );
};

export default DynamicBackground;
