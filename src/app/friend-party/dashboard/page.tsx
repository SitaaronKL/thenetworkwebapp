'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const DISCO_SVG = '/mcmaster/disco.svg';

/* ─── Colour palette ─── */
const BG_BLACK = '#000000';
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_ORANGE = '#f97316';
const ACCENT_CYAN = '#22d3ee';

/* ─── Target Date ─── */
const MATCH_REVEAL_DATE = new Date('2026-02-27T12:00:00-05:00');

/* ─── Mock Match Data ─── */
const MOCK_MATCH = {
    name: 'Jordan Rivera',
    age: 21,
    school: 'McMaster University',
    bio: 'Music nerd. House, techno, and everything in between. Let\'s vibe 🎧',
    sharedInterests: ['House Music', 'Chris Lake', 'Late Night Drives', 'Coffee'],
    matchScore: 87,
};

/* ─── Countdown Logic ─── */
function useCountdown(target: Date) {
    const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));
    useEffect(() => {
        const interval = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
        return () => clearInterval(interval);
    }, [target]);
    return timeLeft;
}

function getTimeLeft(target: Date) {
    const now = new Date().getTime();
    const diff = Math.max(0, target.getTime() - now);
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        total: diff,
    };
}

/* ─── QR Code ─── */
let QRCodeComponent: any = null;
try { QRCodeComponent = require('react-qr-code').default; } catch (e) { }

/* ─── Floating Particles Background ─── */
function FloatingParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf: number;
        const COLORS = [
            [255, 45, 117],
            [168, 85, 247],
            [249, 115, 22],
            [34, 211, 238],
        ];

        const particles = Array.from({ length: 40 }, () => ({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.0004,
            vy: -0.0001 - Math.random() * 0.0003,
            size: 1 + Math.random() * 2.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            alpha: 0.15 + Math.random() * 0.35,
            pulse: Math.random() * Math.PI * 2,
        }));

        const resize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        let t = 0;
        const draw = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);
            t += 0.01;

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
                if (p.x < -0.05 || p.x > 1.05) p.vx *= -1;

                const flicker = 0.6 + 0.4 * Math.sin(t * 2 + p.pulse);
                const a = p.alpha * flicker;
                const [r, g, b] = p.color;
                const px = p.x * w;
                const py = p.y * h;
                const s = p.size * (0.8 + 0.2 * Math.sin(t + p.pulse));

                ctx.beginPath();
                ctx.arc(px, py, s + 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.3})`;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(px, py, s, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
                ctx.fill();
            }
            raf = requestAnimationFrame(draw);
        };

        resize();
        window.addEventListener('resize', resize);
        draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function PartyDashboard() {
    const countdown = useCountdown(MATCH_REVEAL_DATE);
    const [mounted, setMounted] = useState(false);
    const [isTestMode, setIsTestMode] = useState(false);
    const [scoreAnimated, setScoreAnimated] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const entranceCode = 'PARTY-KM-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    /* ─────────────────────────────────────────────
       MATCHED STATE (Test Mode)
       ───────────────────────────────────────────── */
    if (isTestMode) {
        // Trigger score animation after mount
        if (!scoreAnimated) setTimeout(() => setScoreAnimated(true), 300);

        return (
            <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: BG_BLACK }}>
                <FloatingParticles />
                {/* Ambient glow */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse at 50% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 70%),
              radial-gradient(ellipse at 20% 80%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)`,
                    }}
                />

                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Press+Start+2P&display=swap" rel="stylesheet" />

                <main className="relative z-10 flex flex-col items-center px-6 py-8 max-w-md mx-auto min-h-screen">
                    {/* Back */}
                    <button
                        onClick={() => { setIsTestMode(false); setScoreAnimated(false); }}
                        className="self-start mb-6 text-white/30 hover:text-white/70 transition-all text-xs flex items-center gap-2 group"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>

                    {/* Disco ball mini */}
                    <div className="relative mb-2">
                        <div
                            className="absolute -inset-4 rounded-full opacity-40 blur-2xl"
                            style={{ background: `conic-gradient(from 0deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN}, ${ACCENT_ORANGE}, ${ACCENT_PINK})`, animation: 'db-spin 6s linear infinite' }}
                        />
                        <img src={DISCO_SVG} alt="" className="w-14 h-14 relative" style={{ filter: 'invert(1) brightness(2)', animation: 'db-float 3s ease-in-out infinite' }} />
                    </div>

                    {/* Title */}
                    <h1 className="gradient-title text-center font-black mb-1 select-none"
                        style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(2.2rem, 10vw, 3.2rem)', lineHeight: 1 }}
                    >
                        It&apos;s a Match!
                    </h1>
                    <p className="text-white/40 text-xs mb-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        You and {MOCK_MATCH.name} share {MOCK_MATCH.matchScore}% music compatibility
                    </p>

                    {/* ─── Profile Card ─── */}
                    <div className="w-full relative group mb-6" style={{ animation: mounted ? 'db-slide-up 0.6s ease-out 0.1s both' : 'none' }}>
                        {/* Animated gradient border glow */}
                        <div
                            className="absolute -inset-[1px] rounded-2xl opacity-60 blur-sm transition-opacity duration-500 group-hover:opacity-90"
                            style={{
                                background: `conic-gradient(from var(--angle, 0deg), ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN}, ${ACCENT_ORANGE}, ${ACCENT_PINK})`,
                                animation: 'db-rotate-border 4s linear infinite',
                            }}
                        />

                        <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: '#0d0d0d' }}>
                            {/* Inner sheen */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />

                            <div className="p-6 relative z-10">
                                {/* Avatar + Info Row */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="relative shrink-0">
                                        <div
                                            className="absolute -inset-1 rounded-full opacity-70 blur-md"
                                            style={{
                                                background: `conic-gradient(from 0deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN}, ${ACCENT_ORANGE}, ${ACCENT_PINK})`,
                                                animation: 'db-spin 3s linear infinite',
                                            }}
                                        />
                                        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-600 via-purple-600 to-cyan-500 flex items-center justify-center text-2xl font-bold shadow-lg" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {MOCK_MATCH.name.charAt(0)}
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {MOCK_MATCH.name}
                                        </h2>
                                        <p className="text-white/35 text-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {MOCK_MATCH.age} · {MOCK_MATCH.school}
                                        </p>
                                    </div>
                                </div>

                                {/* Bio */}
                                <p className="text-white/50 text-sm mb-5 leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {MOCK_MATCH.bio}
                                </p>

                                {/* ─── Compatibility Ring ─── */}
                                <div className="flex items-center gap-5 mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="relative w-16 h-16 shrink-0">
                                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                                            <circle
                                                cx="32" cy="32" r="28" fill="none"
                                                stroke={`url(#scoreGrad)`}
                                                strokeWidth="4" strokeLinecap="round"
                                                strokeDasharray={`${scoreAnimated ? MOCK_MATCH.matchScore * 1.759 : 0} 999`}
                                                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                                            />
                                            <defs>
                                                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor={ACCENT_PINK} />
                                                    <stop offset="50%" stopColor={ACCENT_PURPLE} />
                                                    <stop offset="100%" stopColor={ACCENT_CYAN} />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <span
                                            className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums"
                                            style={{ fontFamily: "'Outfit', sans-serif" }}
                                        >
                                            {MOCK_MATCH.matchScore}%
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-xs font-semibold mb-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>Music Compatibility</p>
                                        <p className="text-white/30 text-[10px]" style={{ fontFamily: "'Outfit', sans-serif" }}>Based on listening habits & shared artists</p>
                                    </div>
                                </div>

                                {/* Shared Interests */}
                                <div>
                                    <p className="text-[9px] text-white/25 mb-2.5 uppercase tracking-[0.2em] font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        IN COMMON
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {MOCK_MATCH.sharedInterests.map((interest, i) => (
                                            <span
                                                key={interest}
                                                className="px-3 py-1.5 rounded-full text-[11px] font-medium border text-white/60 transition-all duration-300 hover:text-white/90 hover:border-white/30"
                                                style={{
                                                    fontFamily: "'Outfit', sans-serif",
                                                    borderColor: 'rgba(255,255,255,0.08)',
                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                    animation: mounted ? `db-slide-up 0.4s ease-out ${0.4 + i * 0.08}s both` : 'none',
                                                }}
                                            >
                                                {interest}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        className="w-full max-w-xs py-3.5 rounded-xl font-bold text-sm uppercase tracking-[0.15em] transition-all duration-500 hover:tracking-[0.25em] hover:shadow-lg relative overflow-hidden group"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE})`,
                            animation: mounted ? 'db-slide-up 0.5s ease-out 0.5s both' : 'none',
                        }}
                    >
                        <span className="relative z-10">Say Hi 👋</span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                    </button>

                    {/* Test mode indicator */}
                    <div className="mt-6 flex items-center gap-2 text-white/15 text-[10px]" style={{ animation: mounted ? 'db-slide-up 0.4s ease-out 0.6s both' : 'none' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse" />
                        <span style={{ fontFamily: "'Outfit', sans-serif" }}>Test Mode · Preview only</span>
                    </div>
                </main>

                <style jsx>{`
          .gradient-title {
            background: linear-gradient(135deg, #ff2d75, #a855f7, #22d3ee);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          @keyframes db-shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
          @keyframes db-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes db-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes db-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes db-rotate-border {
            from { --angle: 0deg; }
            to { --angle: 360deg; }
          }
          @property --angle {
            syntax: '<angle>';
            initial-value: 0deg;
            inherits: false;
          }
        `}</style>
            </div>
        );
    }

    /* ─────────────────────────────────────────────
       WAITING STATE (Party Pass)
       ───────────────────────────────────────────── */
    return (
        <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: BG_BLACK }}>
            <FloatingParticles />
            {/* Ambient glow */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at 50% 20%, rgba(168, 85, 247, 0.14) 0%, transparent 65%),
            radial-gradient(ellipse at 80% 100%, rgba(34, 211, 238, 0.09) 0%, transparent 50%)`,
                }}
            />

            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Press+Start+2P&display=swap" rel="stylesheet" />

            <main className="relative z-10 flex flex-col items-center px-6 py-8 max-w-md mx-auto min-h-screen">
                {/* Top bar */}
                <div className="w-full flex items-center justify-between mb-10" style={{ animation: mounted ? 'db-slide-up 0.5s ease-out 0.05s both' : 'none' }}>
                    <Link href="/friend-party" className="opacity-50 hover:opacity-100 transition-opacity">
                        <img src={THE_NETWORK_SVG} alt="The Network" className="h-5 w-auto object-contain" style={{ filter: 'invert(1) brightness(2)' }} />
                    </Link>
                    <button
                        onClick={() => setIsTestMode(true)}
                        className="px-3 py-1 rounded-full text-[9px] uppercase tracking-[0.15em] font-bold border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 transition-all backdrop-blur-sm"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        🧪 Test Match
                    </button>
                </div>

                {/* Mini disco */}
                <div className="relative mb-3" style={{ animation: mounted ? 'db-slide-up 0.5s ease-out 0.1s both' : 'none' }}>
                    <div
                        className="absolute -inset-3 rounded-full opacity-30 blur-xl"
                        style={{ background: `conic-gradient(from 0deg, ${ACCENT_PINK}80, ${ACCENT_PURPLE}80, ${ACCENT_CYAN}80, ${ACCENT_ORANGE}80, ${ACCENT_PINK}80)`, animation: 'db-spin 8s linear infinite' }}
                    />
                    <img src={DISCO_SVG} alt="" className="w-10 h-10 relative" style={{ filter: 'invert(1) brightness(2)', animation: 'db-float 3s ease-in-out infinite' }} />
                </div>

                {/* Title */}
                <h1
                    className="text-center font-black mb-1 select-none"
                    style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 'clamp(1.8rem, 8vw, 2.8rem)',
                        lineHeight: 1.1,
                        display: 'inline-block',
                        background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 40%, ${ACCENT_CYAN} 70%, ${ACCENT_ORANGE} 100%)`,
                        WebkitBackgroundClip: 'text', color: 'transparent',
                        backgroundClip: 'text', backgroundSize: '200% auto',
                        animation: mounted ? 'db-shimmer 4s linear infinite, db-slide-up 0.5s ease-out 0.15s both' : 'none',
                    }}
                >
                    Your Party Pass
                </h1>
                <p className="text-white/35 text-xs text-center mb-10" style={{ fontFamily: "'Outfit', sans-serif", animation: mounted ? 'db-slide-up 0.5s ease-out 0.2s both' : 'none' }}>
                    You&apos;re in! Entrance pass & match countdown below&nbsp;✨
                </p>

                {/* ═══ COUNTDOWN ═══ */}
                <div className="w-full mb-10" style={{ animation: mounted ? 'db-slide-up 0.6s ease-out 0.25s both' : 'none' }}>
                    <p className="text-center text-[8px] uppercase tracking-[0.35em] text-white/25 mb-4 font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Match reveal in
                    </p>

                    <div className="flex justify-center gap-2.5">
                        {[
                            { value: countdown.days, label: 'Days' },
                            { value: countdown.hours, label: 'Hrs' },
                            { value: countdown.minutes, label: 'Min' },
                            { value: countdown.seconds, label: 'Sec' },
                        ].map((unit, i) => (
                            <div key={unit.label} className="flex flex-col items-center gap-1.5">
                                <div className="relative group">
                                    {/* Glow ring */}
                                    <div className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 blur-sm"
                                        style={{ background: `linear-gradient(135deg, ${ACCENT_PINK}60, ${ACCENT_PURPLE}60)` }}
                                    />
                                    {/* Pill */}
                                    <div
                                        className="relative w-[4.2rem] h-[5.2rem] rounded-xl flex items-center justify-center border border-white/[0.06] overflow-hidden"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                                    >
                                        {/* Subtle inner highlight */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                                        <span
                                            className="text-[1.7rem] font-black tabular-nums relative z-10"
                                            style={{
                                                fontFamily: "'Outfit', sans-serif",
                                                background: `linear-gradient(180deg, #fff 20%, ${ACCENT_PURPLE}90 100%)`,
                                                WebkitBackgroundClip: 'text', color: 'transparent',
                                                backgroundClip: 'text',
                                            }}
                                        >
                                            {String(unit.value).padStart(2, '0')}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[8px] uppercase tracking-[0.12em] text-white/25 font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {unit.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══ QR ENTRANCE PASS ═══ */}
                <div className="w-full max-w-xs mb-10" style={{ animation: mounted ? 'db-slide-up 0.6s ease-out 0.35s both' : 'none' }}>
                    <div className="relative group">
                        {/* Animated holographic border */}
                        <div
                            className="absolute -inset-[1px] rounded-2xl overflow-hidden"
                            style={{
                                background: `conic-gradient(from var(--angle, 0deg), ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN}, ${ACCENT_ORANGE}, ${ACCENT_PINK})`,
                                animation: 'db-rotate-border 4s linear infinite',
                            }}
                        >
                            {/* Shine sweep */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
                                    animation: 'db-ticket-shine 4s ease-in-out infinite',
                                }}
                            />
                        </div>

                        <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: '#0d0d0d' }}>
                            {/* Top inner sheen */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

                            <div className="p-6 relative z-10 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <h2
                                        className="text-[11px] font-bold uppercase tracking-[0.2em]"
                                        style={{
                                            fontFamily: "'Outfit', sans-serif",
                                            background: `linear-gradient(90deg, #fff, ${ACCENT_CYAN})`,
                                            WebkitBackgroundClip: 'text', color: 'transparent',
                                        }}
                                    >
                                        Entrance Pass
                                    </h2>
                                </div>

                                {/* QR */}
                                <div className="bg-white p-3 rounded-xl shadow-2xl shadow-purple-900/30">
                                    {QRCodeComponent ? (
                                        <QRCodeComponent value={entranceCode} size={130} />
                                    ) : (
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(entranceCode)}`}
                                            alt="Entrance QR Code"
                                            className="w-[130px] h-[130px]"
                                        />
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="w-full flex items-center gap-3">
                                    <div className="flex-1 border-t border-dashed border-white/10" />
                                    <span className="text-white/20 text-[9px]">✂</span>
                                    <div className="flex-1 border-t border-dashed border-white/10" />
                                </div>

                                <div className="text-center space-y-0.5">
                                    <p className="text-[9px] text-white/40 tracking-[0.15em] uppercase font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        19 Kingsmount St S
                                    </p>
                                    <p className="text-white/25 text-[10px]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        Feb 28 · 10 PM · Show this at the door
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ MATCHING STATUS ═══ */}
                <div className="w-full max-w-xs" style={{ animation: mounted ? 'db-slide-up 0.6s ease-out 0.45s both' : 'none' }}>
                    <div className="rounded-xl p-5 border border-white/[0.05] relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        {/* Sheen */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

                        <div className="relative z-10 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2.5">
                                <div className="flex gap-0.5">
                                    <div className="w-1 h-1 rounded-full bg-pink-500 animate-pulse" />
                                    <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                                    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
                                </div>
                                <p className="text-[9px] uppercase tracking-[0.15em] text-white/35 font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    Matching in progress
                                </p>
                            </div>
                            <p className="text-white/45 text-xs leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                Your music soulmate will be revealed when the timer hits zero. Come back on <strong className="text-white/80">Feb 27 at noon</strong> ✨
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-auto pt-14 pb-6 text-center">
                    <p className="text-white/15 text-[10px]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        © 2026 The Network
                    </p>
                </footer>
            </main>

            <style jsx>{`
        @keyframes db-shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        @keyframes db-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes db-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes db-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes db-ticket-shine {
          0%, 100% { transform: translateX(-100%) rotate(15deg); }
          50% { transform: translateX(100%) rotate(15deg); }
        }
        @keyframes db-rotate-border {
          from { --angle: 0deg; }
          to { --angle: 360deg; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>
        </div>
    );
}
