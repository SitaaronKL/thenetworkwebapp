'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import { ensureFriendPartyAttendance } from '@/lib/friend-party-attendance';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';

/* ─── Colour palette ─── */
const BG_BLACK = '#000000';
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_ORANGE = '#f97316';
const ACCENT_CYAN = '#22d3ee';
const MCMASTER_SCHOOL = 'McMaster University';

/* ─── Floating Particles Background (Reused) ─── */
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

export default function ProfileSetup() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        networks: MCMASTER_SCHOOL,
        birthday: '',
        work: '',
        instagram: ''
    });

    const normalizeNetworksWithMcMaster = (networks: unknown): string[] => {
        const existing = Array.isArray(networks)
            ? networks
                .map((network) => String(network || '').trim())
                .filter((network) => network.length > 0)
            : [];

        const withoutMcMaster = existing.filter(
            (network) => network.toLowerCase() !== MCMASTER_SCHOOL.toLowerCase()
        );
        return [MCMASTER_SCHOOL, ...withoutMcMaster];
    };

    const isFriendPartyProfileComplete = (extras: {
        age?: number | null;
        working_on?: string | null;
    } | null) => {
        const hasValidAge = typeof extras?.age === 'number' && extras.age >= 13 && extras.age <= 120;
        const hasWorkingOn = typeof extras?.working_on === 'string' && extras.working_on.trim().length > 0;
        return hasValidAge && hasWorkingOn;
    };

    const extractInstagramHandle = (value: string | null | undefined) => {
        if (!value) return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        return trimmed
            .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
            .replace(/^@/, '')
            .replace(/\/$/, '');
    };

    useEffect(() => {
        setMounted(true);

        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/friend-party');
                return;
            }

            const { data: extras } = await supabase
                .from('user_profile_extras')
                .select('age, working_on, instagram_url, networks')
                .eq('user_id', user.id)
                .maybeSingle();

            if (isFriendPartyProfileComplete(extras)) {
                router.replace('/friend-party/enrich');
                return;
            }

            const normalizedNetworks = normalizeNetworksWithMcMaster(extras?.networks);
            setFormData({
                networks: normalizedNetworks.join(', '),
                birthday: '',
                work: extras?.working_on || '',
                instagram: extractInstagramHandle(extras?.instagram_url),
            });

            setUserId(user.id);
            setIsCheckingAuth(false);

            await ensureFriendPartyAttendance('link');

            // Keep YouTube sync running in the background.
            YouTubeService.syncYouTubeData(user.id).catch(() => {
                // Non-blocking by design.
            });

            // Re-trigger backend enrichment from setup to ensure it continues
            // even if the callback page was closed quickly.
            fetch('/api/background-profile-enrichment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                keepalive: true,
                body: JSON.stringify({
                    user_id: user.id,
                    trigger_source: 'FRIEND_PARTY_SETUP',
                }),
            }).catch(() => {
                // Non-blocking by design.
            });
        };

        checkAuth();
    }, [router]);

    const calculateAge = (birthday: string) => {
        const dob = new Date(`${birthday}T00:00:00`);
        if (Number.isNaN(dob.getTime())) return null;

        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const monthDiff = now.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
            age -= 1;
        }

        return age;
    };

    const normalizeInstagramUrl = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        const handle = trimmed.replace(/^@/, '');
        return handle ? `https://instagram.com/${handle}` : null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || isSaving) return;

        setIsSaving(true);
        setErrorMessage(null);

        const age = calculateAge(formData.birthday);
        if (age === null || age < 13 || age > 120) {
            setErrorMessage('Please provide a valid birth date.');
            setIsSaving(false);
            return;
        }

        const networks = formData.networks
            .split(',')
            .map((network) => network.trim())
            .filter((network) => network.length > 0);
        const normalizedNetworks = normalizeNetworksWithMcMaster(networks);

        const supabase = createClient();

        const { data: mcmasterSchool } = await supabase
            .from('schools')
            .select('id, name')
            .ilike('name', 'McMaster%')
            .limit(1)
            .maybeSingle();

        const { error: extrasError } = await supabase
            .from('user_profile_extras')
            .upsert({
                user_id: userId,
                age,
                networks: normalizedNetworks,
                college: MCMASTER_SCHOOL,
                working_on: formData.work.trim(),
                instagram_url: normalizeInstagramUrl(formData.instagram),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (extrasError) {
            setErrorMessage('Could not save your profile. Please try again.');
            setIsSaving(false);
            return;
        }

        const profileUpdate: Record<string, unknown> = {
            school: MCMASTER_SCHOOL,
        };
        if (mcmasterSchool?.id) {
            profileUpdate.school_id = mcmasterSchool.id;
        }

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', userId);

        if (profileUpdateError && mcmasterSchool?.id) {
            await supabase
                .from('profiles')
                .update({ school: MCMASTER_SCHOOL })
                .eq('id', userId);
        }

        await ensureFriendPartyAttendance('link');

        router.push('/friend-party/enrich');
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG_BLACK }}>
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white overflow-x-hidden selection:bg-pink-500/30" style={{ backgroundColor: BG_BLACK }}>
            <FloatingParticles />

            {/* Ambient glow */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at 50% 0%, rgba(168, 85, 247, 0.15) 0%, transparent 60%),
                                 radial-gradient(ellipse at 50% 100%, rgba(34, 211, 238, 0.1) 0%, transparent 60%)`,
                }}
            />

            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />

            <main className="relative z-10 flex flex-col items-center px-6 py-6 max-w-md mx-auto min-h-screen">
                {/* Logo */}
                <div className="w-full flex justify-center mb-8" style={{ animation: mounted ? 'db-slide-up 0.5s ease-out 0.05s both' : 'none' }}>
                    <Link href="/friend-party" className="opacity-50 hover:opacity-100 transition-opacity">
                        <img src={THE_NETWORK_SVG} alt="The Network" className="h-6 w-auto object-contain" style={{ filter: 'invert(1) brightness(2)' }} />
                    </Link>
                </div>

                {/* Title */}
                <div className="text-center mb-8" style={{ animation: mounted ? 'db-slide-up 0.5s ease-out 0.1s both' : 'none' }}>
                    <h1 className="text-3xl font-black mb-2 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        <span style={{
                            background: `linear-gradient(135deg, white 0%, ${ACCENT_CYAN} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Profile Setup
                        </span>
                    </h1>
                    <p className="text-white/40 text-xs tracking-wider uppercase font-semibold">
                        Make sure your party identity is up to date
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-5" style={{ animation: mounted ? 'db-slide-up 0.6s ease-out 0.2s both' : 'none' }}>

                    {/* Networks */}
                    <div className="group">
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/40 font-bold mb-2 ml-1">
                            Networks / Affiliations
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="text"
                                placeholder="e.g. McMaster University, Toronto"
                                value={formData.networks}
                                onChange={(e) => setFormData({ ...formData, networks: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            />
                            <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-white/10 transition-colors" />
                        </div>
                    </div>

                    {/* Birthday */}
                    <div className="group">
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/40 font-bold mb-2 ml-1">
                            Date of Birth
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="date"
                                value={formData.birthday}
                                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all [color-scheme:dark]"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            />
                        </div>
                        <p className="text-white/20 text-[9px] mt-1.5 ml-1">Used to infer age range for matching</p>
                    </div>

                    {/* Work */}
                    <div className="group">
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/40 font-bold mb-2 ml-1">
                            Current Obsession
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="text"
                                placeholder="What are you interested in?"
                                value={formData.work}
                                onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            />
                        </div>
                    </div>

                    {/* Instagram */}
                    <div className="group">
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/40 font-bold mb-2 ml-1">
                            Comms Handle <span className="opacity-50 font-normal normal-case tracking-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                            <input
                                type="text"
                                placeholder="instagram_handle"
                                value={formData.instagram}
                                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-all"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                            />
                        </div>
                    </div>

                    {errorMessage && (
                        <p className="text-red-400 text-xs text-center">{errorMessage}</p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full mt-8 py-4 rounded-xl font-bold text-sm uppercase tracking-[0.15em] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden group disabled:opacity-60 disabled:hover:scale-100"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE})`,
                            boxShadow: `0 0 20px -5px ${ACCENT_PINK}40`
                        }}
                    >
                        <span className="relative z-10">{isSaving ? 'Saving...' : 'Initialize Party Pass'}</span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                    </button>

                </form>

                {/* Footer */}
                <div className="mt-auto pt-8 text-center opacity-30 text-[10px]">
                    <p>Secure Transmission • The Network Protocol v2.0</p>
                </div>
            </main>

            <style jsx>{`
                @keyframes db-slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
