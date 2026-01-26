'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const GLOW_COLORS = [
    [34, 211, 238], [59, 130, 246], [168, 85, 247], [236, 72, 153],
    [249, 115, 22], [234, 179, 8], [34, 197, 94],
];

function GlowdownBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas?.getContext('2d')) return;
        const ctx = canvas.getContext('2d')!;
        let frame = 0;
        let raf: number;
        const resize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };
        const draw = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);

            // Sparse, organic grid for elegant depth
            const cols = 12, rows = 10;
            const spacingX = w / (cols + 1);
            const spacingY = h / (rows + 1);
            const points: { x: number; y: number; c: number[]; s: number }[] = [];

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const c = GLOW_COLORS[(i + j) % GLOW_COLORS.length];
                    const speed = 0.005 + (i % 3) * 0.002;
                    points.push({
                        // Organic, slow-sweeping movement
                        x: spacingX * (i + 1) + Math.sin(frame * speed + i) * 60,
                        y: spacingY * (j + 1) + Math.cos(frame * (speed * 0.8) + j) * 40,
                        c,
                        s: speed
                    });
                }
            }

            // Draw "Nebula" connections (soft, broad strokes)
            const maxDist = 300;
            ctx.lineCap = 'round';
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    const dx = points[j].x - points[i].x, dy = points[j].y - points[i].y;
                    const d = Math.hypot(dx, dy);
                    if (d < maxDist) {
                        const alpha = Math.pow(1 - d / maxDist, 2) * 0.15;
                        const [r, g, b] = points[i].c;
                        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(points[i].x, points[i].y);
                        ctx.lineTo(points[j].x, points[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw "Soft Bloom" Particles
            for (const p of points) {
                const [r, g, b] = p.c;
                const glowSize = 40 + Math.sin(frame * 0.02 + p.x) * 20;

                // Outer ethereal glow
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
                grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
                grad.addColorStop(0.5, `rgba(${r},${g},${b},0.05)`);
                grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
                ctx.fill();

                // Bright core
                ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }
            frame++;
            raf = requestAnimationFrame(draw);
        };
        resize();
        window.addEventListener('resize', resize);
        draw();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(raf);
        };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none" aria-hidden />;
}

export default function TicketPage() {
    return (
        <div className="min-h-screen bg-black text-white overflow-hidden font-sans relative flex items-center justify-center p-6">
            <GlowdownBackground />

            {/* Top-level Navigation */}
            <Link
                href="/glowdown-invitation"
                className="absolute top-8 left-8 z-30 text-white/50 hover:text-white transition-colors p-2 flex items-center gap-2"
            >
                <span className="text-xs font-medium tracking-widest uppercase">← back</span>
            </Link>

            <div className="w-full max-w-sm relative z-10">
                <div className="relative">
                    {/* Decorative Glow */}
                    <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />

                    <div
                        className="relative rounded-3xl p-[2px]"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
                        }}
                    >
                        <div className="rounded-[22px] bg-black p-8 text-center">
                            <div className="mb-8">
                                <p className="text-amber-500 text-[11px] font-bold tracking-[0.3em] uppercase mb-2">YOU'RE ALL SET!</p>
                                <h3
                                    className="font-brand text-3xl font-bold text-white"
                                    style={{
                                        letterSpacing: '-0.03em',
                                        color: '#fff',
                                        textShadow: '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(236,72,153,0.6), 0 0 60px rgba(168,85,247,0.5), 0 0 80px rgba(249,115,22,0.3)',
                                    }}
                                >
                                    GlowDown Ticket
                                </h3>
                            </div>

                            <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-6 mb-8 bg-white/5">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-white/30 text-[10px] font-semibold tracking-widest uppercase">Admin Admit One</span>
                                    <div className="w-48 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                </div>

                                {/* Placeholder for QR/Barcode style */}
                                <div className="w-32 h-32 bg-white p-2 rounded-lg">
                                    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
                                        <div className="grid grid-cols-4 gap-1 opacity-20">
                                            {Array.from({ length: 16 }).map((_, i) => (
                                                <div key={i} className="w-4 h-4 bg-white" />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <p className="text-white/60 text-sm font-medium">122 Whitney Avenue</p>
                                    <p className="text-white/40 text-[11px]">January 2026 • 10:00PM</p>
                                </div>
                            </div>

                            <p className="text-white/30 text-[10px] leading-relaxed italic mb-6">
                                This ticket will be sent to your gmail. See you at the Glowdown.
                            </p>

                            <div className="mt-8 pt-8 border-t border-white/5 text-left">
                                <h4 className="text-white/80 text-xs font-bold tracking-widest uppercase mb-4">
                                    Why haven&apos;t I heard of The Network?
                                </h4>
                                <div className="space-y-4 text-[11px] leading-relaxed text-white/40 font-medium">
                                    <p>
                                        we&apos;ve been building in the dark (no pun intended). designing a social layer for real life isn&apos;t something you do in public until it&apos;s ready to work. like really work.
                                    </p>
                                    <p>
                                        no metrics. no engagement hacks. just a tool to help you find the people you actually want to meet, starting with events like the Glowdown.
                                    </p>
                                    <p>
                                        consider this your early access. keep the signal clean.
                                    </p>
                                </div>
                                <Link
                                    href="/mcmaster"
                                    className="inline-block mt-6 text-[10px] font-bold text-amber-500/100 hover:text-amber-500 transition-colors uppercase tracking-widest"
                                >
                                    Learn more about our vision →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
