'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const PIKE_SVG = '/mcmaster/pike.svg';
const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
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
      const cols = 16, rows = 14;
      const spacingX = w / (cols + 1);
      const spacingY = (h * 0.7) / (rows + 1);
      const points: { x: number; y: number; c: number[] }[] = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const c = GLOW_COLORS[(i + j) % GLOW_COLORS.length];
          points.push({
            x: spacingX * (i + 1) + Math.sin((frame + i * 5 + j * 7) * 0.02) * 12,
            y: spacingY * (j + 1) + Math.cos((frame + i * 3 + j * 11) * 0.015) * 8,
            c,
          });
        }
      }
      const maxDist = 160;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[j].x - points[i].x, dy = points[j].y - points[i].y;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            const alpha = (1 - d / maxDist) * 0.2;
            const [r, g, b] = points[i].c;
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }
      for (const p of points) {
        const [r, g, b] = p.c;
        ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
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

export default function GlowdownInvitationPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans">
      <GlowdownBackground />

      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex justify-end">
        <Link href="/" className="text-white/90 hover:text-white text-sm font-medium tracking-wide transition-colors">
          The Network
        </Link>
      </nav>

      <main className="relative z-10 max-w-xl mx-auto px-6 md:px-8 pt-20 pb-28 flex flex-col items-center">
        {/* You're invited — party opener */}
        <p
          className="text-xs md:text-sm font-medium tracking-[0.35em] uppercase text-amber-300/90 mb-7"
          style={{ letterSpacing: '0.35em' }}
        >
          You&apos;re invited
        </p>

        {/* Pike presents Glowdown brought to you by The Network */}
        <header className="text-center mb-10">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 mb-4">
            <img src={PIKE_SVG} alt="Pike" className="h-8 md:h-9 w-auto object-contain opacity-95" />
            <span className="text-white/50 text-sm md:text-base">presents</span>
          </div>

          {/* GlowDown — big, glowing, party title */}
          <h1
            className="font-brand text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-5"
            style={{
              letterSpacing: '-0.03em',
              color: '#fff',
              textShadow:
                '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(236,72,153,0.6), 0 0 60px rgba(168,85,247,0.5), 0 0 80px rgba(249,115,22,0.3)',
            }}
          >
            GlowDown
          </h1>

          <div className="flex flex-col items-center gap-2">
            <span className="text-white/55 text-sm">brought to you by</span>
            <img src={THE_NETWORK_SVG} alt="The Network" className="h-14 md:h-20 w-auto object-contain opacity-95 brightness-0 invert" />
          </div>
        </header>

        {/* Ticket / barcode — ticket-stub style */}
        <div className="w-full max-w-[260px] mb-10">
          <div className="rounded-xl border-2 border-dashed border-amber-400/40 bg-amber-950/20 py-6 flex flex-col items-center justify-center gap-2">
            <span className="text-amber-400/70 text-[11px] font-semibold tracking-[0.2em] uppercase">Your ticket</span>
            <div className="w-36 h-12 rounded border border-amber-400/25 flex items-center justify-center">
              <span className="text-amber-500/40 text-xs">Barcode</span>
            </div>
          </div>
        </div>

        {/* Invitation card — ornate, party-invite feel */}
        <article className="w-full max-w-lg relative">
          {/* Gradient border via wrapper */}
          <div
            className="rounded-[20px] p-[2px]"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.5) 0%, rgba(168,85,247,0.5) 35%, rgba(249,179,70,0.5) 70%, rgba(236,72,153,0.4) 100%)',
              boxShadow: '0 0 30px rgba(236,72,153,0.2), 0 0 60px rgba(168,85,247,0.15)',
            }}
          >
            <div className="rounded-[18px] bg-black/90 backdrop-blur-md p-7 md:p-10 text-center relative overflow-hidden">
              {/* Corner flourishes */}
              <span className="absolute top-4 left-4 text-amber-400/50 text-lg" aria-hidden>✦</span>
              <span className="absolute top-4 right-4 text-amber-400/50 text-lg" aria-hidden>✦</span>
              <span className="absolute bottom-4 left-4 text-amber-400/50 text-lg" aria-hidden>✦</span>
              <span className="absolute bottom-4 right-4 text-amber-400/50 text-lg" aria-hidden>✦</span>

              <h2 className="font-brand text-xl md:text-2xl font-bold text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
                Accept the invite
              </h2>
              <p className="text-white/80 text-base md:text-lg font-ui mb-2">
                and bring a friend
              </p>
              <p className="text-white/50 text-sm mb-6">— we can&apos;t wait to see you —</p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/mcmaster"
                  className="inline-block w-full py-4 rounded-full text-base font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg text-center"
                  style={{
                    background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #ec4899 100%)',
                    color: '#000',
                    boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                  }}
                >
                  I&apos;m in — let&apos;s go
                </Link>
                <Link
                  href="/mcmaster"
                  className="inline-block w-full py-3 rounded-full text-sm font-semibold text-white/90 border border-white/30 hover:border-white/50 hover:bg-white/5 transition-all duration-300 text-center"
                >
                  Learn more about the network
                </Link>
              </div>
            </div>
          </div>
        </article>

        <footer className="mt-16 text-center">
          <p className="text-white/40 text-sm">© 2026 The Network.</p>
        </footer>
      </main>
    </div>
  );
}
