'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';

/* ─── Colour palette (matching party page) ─── */
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_ORANGE = '#f97316';
const ACCENT_CYAN = '#22d3ee';

/* ─── Target Date ─── */
const MATCH_REVEAL_DATE = new Date('2026-02-27T12:00:00-05:00'); // Feb 27, 2026 12:00 PM EST

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
        const interval = setInterval(() => {
            setTimeLeft(getTimeLeft(target));
        }, 1000);
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

/* ─── QR Code (fallback to API) ─── */
let QRCodeComponent: any = null;
try {
    QRCodeComponent = require('react-qr-code').default;
} catch (e) { }

/* ─── Main Dashboard ─── */
export default function PartyDashboard() {
    const countdown = useCountdown(MATCH_REVEAL_DATE);
    const [mounted, setMounted] = useState(false);
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const entranceCode = 'PARTY-KM-2026-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // ─── MATCHED STATE (Test Mode) ───
    if (isTestMode) {
        return (
            <div className="min-h-screen bg-black text-white overflow-x-hidden">
                {/* Gradient bg */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse at 50% 0%, ${ACCENT_PURPLE}15 0%, transparent 60%),
                          radial-gradient(ellipse at 80% 100%, ${ACCENT_PINK}10 0%, transparent 50%)`,
                    }}
                />

                <main className="relative z-10 flex flex-col items-center px-6 py-12 max-w-lg mx-auto min-h-screen">
                    {/* Back button */}
                    <button
                        onClick={() => setIsTestMode(false)}
                        className="self-start mb-8 text-white/40 hover:text-white/80 transition-colors text-sm flex items-center gap-2"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>

                    {/* Match headline */}
                    <div className="text-center mb-10">
                        <p className="text-6xl mb-4">🎉</p>
                        <h1
                            className="text-4xl md:text-5xl font-black tracking-tight mb-3"
                            style={{
                                fontFamily: "'Outfit', sans-serif",
                                background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                backgroundSize: '200% auto',
                                animation: mounted ? 'fp-shimmer 4s linear infinite' : 'none',
                            }}
                        >
                            It&apos;s a Match!
                        </h1>
                        <p className="text-white/50 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            You and {MOCK_MATCH.name} share {MOCK_MATCH.matchScore}% music compatibility
                        </p>
                    </div>

                    {/* Match Card */}
                    <div className="w-full relative group mb-8">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-1000" />

                        <div className="relative rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 p-1">
                            <div className="rounded-xl bg-white/[0.03] p-6 md:p-8">
                                {/* Profile Header */}
                                <div className="flex items-center gap-5 mb-6">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div
                                            className="absolute -inset-1 rounded-full opacity-60 blur-md"
                                            style={{
                                                background: `conic-gradient(from 0deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN}, ${ACCENT_ORANGE}, ${ACCENT_PINK})`,
                                                animation: 'spin 4s linear infinite',
                                            }}
                                        />
                                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {MOCK_MATCH.name.charAt(0)}
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {MOCK_MATCH.name}
                                        </h2>
                                        <p className="text-white/40 text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {MOCK_MATCH.age} · {MOCK_MATCH.school}
                                        </p>
                                    </div>
                                </div>

                                {/* Bio */}
                                <p className="text-white/60 text-sm mb-6 leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {MOCK_MATCH.bio}
                                </p>

                                {/* Match Score Bar */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs text-white/40 mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        <span>Music Compatibility</span>
                                        <span className="text-white font-bold">{MOCK_MATCH.matchScore}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: mounted ? `${MOCK_MATCH.matchScore}%` : '0%',
                                                background: `linear-gradient(to right, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN})`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Shared Interests */}
                                <div>
                                    <p className="text-xs text-white/40 mb-3 uppercase tracking-widest" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        Shared Interests
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {MOCK_MATCH.sharedInterests.map((interest) => (
                                            <span
                                                key={interest}
                                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-white/70"
                                                style={{ fontFamily: "'Outfit', sans-serif" }}
                                            >
                                                {interest}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        className="w-full max-w-xs py-4 rounded-lg font-bold text-sm uppercase tracking-[0.2em] transition-all duration-500 hover:tracking-[0.3em]"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: `linear-gradient(to right, ${ACCENT_PINK}, ${ACCENT_PURPLE})`,
                        }}
                    >
                        Say Hi 👋
                    </button>

                    {/* Test mode label */}
                    <div className="mt-8 flex items-center gap-2 text-white/20 text-xs">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span style={{ fontFamily: "'Outfit', sans-serif" }}>Test Mode — This is a preview of the match reveal</span>
                    </div>
                </main>

                {/* Keyframes (shared with party page) */}
                <style jsx>{`
          @keyframes fp-shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    // ─── WAITING STATE (Default) ───
    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Gradient bg */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${ACCENT_PURPLE}15 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 100%, ${ACCENT_PINK}10 0%, transparent 50%)`,
                }}
            />

            <main className="relative z-10 flex flex-col items-center px-6 py-12 max-w-lg mx-auto min-h-screen">
                {/* Top bar */}
                <div className="w-full flex items-center justify-between mb-12">
                    <Link href="/friend-party" className="opacity-60 hover:opacity-100 transition-opacity">
                        <img
                            src={THE_NETWORK_SVG}
                            alt="The Network"
                            className="h-6 w-auto object-contain"
                            style={{ filter: 'invert(1) brightness(2)' }}
                        />
                    </Link>

                    {/* Test Button */}
                    <button
                        onClick={() => setIsTestMode(true)}
                        className="px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        🧪 Test Match
                    </button>
                </div>

                {/* Title */}
                <h1
                    className="text-center font-black mb-2 select-none"
                    style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 'clamp(1.8rem, 8vw, 3rem)',
                        lineHeight: 1.1,
                        background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 40%, ${ACCENT_CYAN} 70%, ${ACCENT_ORANGE} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        backgroundSize: '200% auto',
                        animation: mounted ? 'fp-shimmer 4s linear infinite' : 'none',
                    }}
                >
                    Your Party Pass
                </h1>
                <p
                    className="text-white/40 text-sm text-center mb-12"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                    You&apos;re in! Here&apos;s your entrance pass and match countdown.
                </p>

                {/* ─── COUNTDOWN TIMER ─── */}
                <div className="w-full mb-12">
                    <p
                        className="text-center text-[9px] uppercase tracking-[0.4em] text-white/30 mb-6"
                        style={{ fontFamily: "'Press Start 2P', monospace" }}
                    >
                        Match reveal in
                    </p>

                    <div className="flex justify-center gap-3 md:gap-4">
                        {[
                            { value: countdown.days, label: 'Days' },
                            { value: countdown.hours, label: 'Hrs' },
                            { value: countdown.minutes, label: 'Min' },
                            { value: countdown.seconds, label: 'Sec' },
                        ].map((unit) => (
                            <div key={unit.label} className="flex flex-col items-center">
                                <div
                                    className="relative group"
                                    style={{ perspective: '400px' }}
                                >
                                    {/* Glow */}
                                    <div
                                        className="absolute -inset-1 rounded-xl opacity-20 group-hover:opacity-40 transition-opacity blur-md"
                                        style={{
                                            background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE})`,
                                        }}
                                    />
                                    {/* Pill */}
                                    <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center justify-center">
                                        <span
                                            className="text-2xl md:text-3xl font-black tabular-nums"
                                            style={{
                                                fontFamily: "'Outfit', sans-serif",
                                                background: `linear-gradient(180deg, #fff 30%, ${ACCENT_PURPLE}90 100%)`,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            }}
                                        >
                                            {String(unit.value).padStart(2, '0')}
                                        </span>
                                    </div>
                                </div>
                                <span
                                    className="text-[9px] uppercase tracking-widest text-white/30 mt-2"
                                    style={{ fontFamily: "'Outfit', sans-serif" }}
                                >
                                    {unit.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── QR CODE ENTRANCE PASS ─── */}
                <div className="w-full max-w-sm mb-12">
                    <div className="relative group">
                        {/* Holographic border */}
                        <div
                            className="rounded-2xl p-[2px] relative overflow-hidden"
                            style={{
                                background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN})`,
                                boxShadow: `0 20px 50px -10px ${ACCENT_PURPLE}40`,
                            }}
                        >
                            {/* Shine sweep */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.1) 50%, transparent 55%)',
                                    animation: 'fp-ticket-shine 4s ease-in-out infinite',
                                }}
                            />

                            <div className="rounded-[14px] bg-black p-8 text-center relative flex flex-col items-center gap-5">
                                {/* Grain */}
                                <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none mix-blend-overlay" />

                                <h2
                                    className="text-lg font-bold uppercase tracking-tight"
                                    style={{
                                        fontFamily: "'Outfit', sans-serif",
                                        background: `linear-gradient(90deg, #fff, ${ACCENT_CYAN})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    Entrance Pass
                                </h2>

                                {/* QR */}
                                <div className="bg-white p-3 rounded-lg shadow-2xl">
                                    {QRCodeComponent ? (
                                        <QRCodeComponent value={entranceCode} size={140} />
                                    ) : (
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(entranceCode)}`}
                                            alt="Entrance QR Code"
                                            className="w-[140px] h-[140px]"
                                        />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <p
                                        className="text-[9px] text-white/50 tracking-widest uppercase"
                                        style={{ fontFamily: "'Press Start 2P', monospace" }}
                                    >
                                        19 Kingsmount St S
                                    </p>
                                    <p className="text-white/30 text-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                        Feb 28 · 10 PM · Show this QR at the door
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── MATCH CTA ─── */}
                <div className="w-full max-w-sm text-center">
                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <p
                                className="text-[9px] uppercase tracking-widest text-white/50"
                                style={{ fontFamily: "'Press Start 2P', monospace" }}
                            >
                                Matching in progress
                            </p>
                        </div>
                        <p
                            className="text-white/60 text-sm leading-relaxed"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                            Your music soulmate will be revealed when the timer hits zero. Come back on <strong className="text-white/90">Feb 27 at noon</strong> to see who you&apos;re matched with!
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-auto pt-16 pb-8 text-center">
                    <p className="text-white/20 text-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        © 2026 The Network.
                    </p>
                </footer>
            </main>

            {/* Keyframes */}
            <style jsx>{`
        @keyframes fp-shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes fp-ticket-shine {
          0%, 100% { transform: translateX(-100%) rotate(15deg); }
          50% { transform: translateX(100%) rotate(15deg); }
        }
      `}</style>
        </div>
    );
}
