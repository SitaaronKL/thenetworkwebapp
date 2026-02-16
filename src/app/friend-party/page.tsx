'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

let QRCode: any = null;
try {
  QRCode = require('react-qr-code').default;
} catch (e) { }

const DISCO_SVG = '/mcmaster/disco.svg';
const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const DJDAVIBABI_IMG = '/mcmaster/DJDAVIBABI.png';

/* ─── Colour palette ─── */
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_ORANGE = '#f97316';
const ACCENT_CYAN = '#22d3ee';

/* ─── Disco Light Canvas Background ─── */
function DiscoLightsCanvas({
  isMajorDrop,
  majorDropStrength,
}: {
  isMajorDrop: boolean;
  majorDropStrength: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const majorDropRef = useRef(false);
  const majorDropStrengthRef = useRef(0);

  // Sync refs for animation loop
  useEffect(() => {
    majorDropRef.current = isMajorDrop;
    majorDropStrengthRef.current = majorDropStrength;
  }, [isMajorDrop, majorDropStrength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let t = 0;

    const COLORS = [
      [255, 45, 117],   // pink
      [168, 85, 247],   // purple
      [249, 115, 22],   // orange
      [34, 211, 238],   // cyan
    ];

    // Disco light beam definition
    interface Beam {
      angle: number;
      speed: number;
      color: number[];
      width: number;
      length: number;
      phase: number;
    }

    // More beams, varying widths for "3D" look
    const beams: Beam[] = Array.from({ length: 12 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / 12,
      speed: (i % 2 === 0 ? 1 : -1) * (0.002 + Math.random() * 0.004), // Alternate directions
      color: COLORS[i % COLORS.length],
      width: 40 + Math.random() * 60,
      length: 0.8 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    // Floating particles
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: number[];
      alpha: number;
      pulse: number;
    }

    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -0.0002 - Math.random() * 0.0003,
      size: 1 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.2 + Math.random() * 0.5,
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

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // 1. Calculate Origin from DOM Element (Scroll Fix)
      // We look for the disco ball element ID
      const ball = document.getElementById('disco-ball-graphic');
      let ox = w / 2;
      let oy = h * 0.2; // default fallback

      if (ball) {
        const rect = ball.getBoundingClientRect();
        ox = rect.left + rect.width / 2;
        oy = rect.top + rect.height / 2;
      }

      // Check if visible (don't draw beams if ball is way off screen)
      const isVisible = oy > -200 && oy < h + 200;

      if (isVisible) {
        // Enable additive blending for "light" effect
        ctx.globalCompositeOperation = 'lighter';

        // Lights stay in a normal spin unless we are in a sustained major drop.
        const majorEnergy = majorDropRef.current ? majorDropStrengthRef.current : 0;
        let shakeX = 0;
        let shakeY = 0;
        const intensityMult = 1 + majorEnergy * 2.3;

        if (majorEnergy > 0) {
          const dropShake = 10 + majorEnergy * 18;
          shakeX = (Math.random() - 0.5) * dropShake;
          shakeY = (Math.random() - 0.5) * dropShake;
        }

        // 2. Draw Glow Behind Ball
        const coreGlow = ctx.createRadialGradient(ox, oy, 10, ox, oy, 150 * intensityMult);
        coreGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 * intensityMult})`);
        coreGlow.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
        coreGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(ox, oy, 150 * intensityMult, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw Beams
        for (const beam of beams) {
          // Default: normal DJ rotation. Major drop: aggressive sweep.
          const speedMult = 1 + majorEnergy * 4.8;

          const a = beam.angle + t * beam.speed * speedMult;

          const lengthMult = 1 + majorEnergy * 0.38;

          const currentLength = beam.length * (0.9 + 0.1 * Math.sin(t * 0.02 + beam.phase)) * lengthMult;

          const endX = ox + shakeX + Math.cos(a) * w * currentLength;
          const endY = oy + shakeY + Math.sin(a) * h * currentLength;
          let [r, g, b] = beam.color;

          if (majorEnergy > 0.12 && Math.random() > 0.82 - majorEnergy * 0.22) {
            [r, g, b] = [255, 255, 255]; // Flash white
          }

          // Perpendicular vectors for width
          const perpX = -Math.sin(a);
          const perpY = Math.cos(a);

          // Draw "Core" (Brighter, narrower)
          const gradCore = ctx.createLinearGradient(ox, oy, endX, endY);
          gradCore.addColorStop(0, `rgba(${r},${g},${b},${0.6 * intensityMult})`);
          gradCore.addColorStop(0.5, `rgba(${r},${g},${b},${0.1 * intensityMult})`);
          gradCore.addColorStop(1, `rgba(${r},${g},${b},0)`);

          ctx.fillStyle = gradCore;
          ctx.beginPath();
          ctx.moveTo(ox + perpX * (beam.width * 0.2), oy + perpY * (beam.width * 0.2));
          ctx.lineTo(endX + perpX * (beam.width * 0.4), endY + perpY * (beam.width * 0.4));
          ctx.lineTo(endX - perpX * (beam.width * 0.4), endY - perpY * (beam.width * 0.4));
          ctx.lineTo(ox - perpX * (beam.width * 0.2), oy - perpY * (beam.width * 0.2));
          ctx.fill();

          // Draw "Haze" (Softer, wider)
          const gradHaze = ctx.createLinearGradient(ox, oy, endX, endY);
          gradHaze.addColorStop(0, `rgba(${r},${g},${b},${0.2 * intensityMult})`);
          gradHaze.addColorStop(0.6, `rgba(${r},${g},${b},${0.05 * intensityMult})`);
          gradHaze.addColorStop(1, `rgba(${r},${g},${b},0)`);

          ctx.fillStyle = gradHaze;
          ctx.beginPath();
          ctx.moveTo(ox + perpX * (beam.width * 0.5), oy + perpY * (beam.width * 0.5));
          ctx.lineTo(endX + perpX * beam.width, endY + perpY * beam.width);
          ctx.lineTo(endX - perpX * beam.width, endY - perpY * beam.width);
          ctx.lineTo(ox - perpX * (beam.width * 0.5), oy - perpY * (beam.width * 0.5));
          ctx.fill();
        }
      }

      // Reset composite for solid particles
      ctx.globalCompositeOperation = 'source-over';

      // 4. Draw floating particles
      for (const p of particles) {
        const majorEnergy = majorDropRef.current ? majorDropStrengthRef.current : 0;

        // Explode outward on MAJOR DROP
        if (majorEnergy > 0) {
          const dropKick = 0.02 + majorEnergy * 0.06;
          p.vx += (Math.random() - 0.5) * dropKick;
          p.vy += (Math.random() - 0.5) * dropKick;
        }

        // Dampening back to normal speed
        p.vx = p.vx * 0.95 + (Math.random() - 0.5) * 0.0003 * 0.05;
        p.vy = p.vy * 0.95 + (-0.0002 - Math.random() * 0.0003) * 0.05;

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        // Wrap around
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        if (p.x < -0.05 || p.x > 1.05) { p.x = Math.random(); p.y = 1; }
        if (p.x > 1.05) p.x = -0.05;

        const px = p.x * w;
        const py = p.y * h;
        const flickerAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        const [r, g, b] = p.color;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${flickerAlpha})`;
        ctx.fill();

        // Glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 5);
        glow.addColorStop(0, `rgba(${r},${g},${b},${flickerAlpha * 0.4})`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(px, py, p.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      t++;
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      aria-hidden
    />
  );
}

/* ─── Main Page ─── */
import { useAudioParty } from '../../hooks/useAudioParty';

export default function FriendPartyPage() {
  const {
    startParty,
    hasStarted,
    dropStrength,
    isMajorDrop,
    majorDropStrength,
    beatStrength,
    dropPulse,
  } = useAudioParty();

  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── BEAT DROP EFFECTS ───
  // When isBeatDrop is true, we pick a random effect
  const [effectVariant, setEffectVariant] = useState(0);

  // Update effect on each accepted drop pulse
  useEffect(() => {
    if (dropPulse > 0) {
      setEffectVariant(Math.floor(Math.random() * 3));
    }
  }, [dropPulse]);

  const getTransform = () => {
    if (isMajorDrop) {
      const scaleBoost = 1.1 + majorDropStrength * 0.18;
      const rotation = 3 + majorDropStrength * 6;
      const implodeScale = 1 - majorDropStrength * 0.1;

      // MAJOR DROP: High energy visuals
      switch (effectVariant) {
        case 0: return `scale(${scaleBoost}) rotate(${rotation}deg)`;   // Big Pulse Right
        case 1: return `scale(${scaleBoost}) rotate(${-rotation}deg)`;  // Big Pulse Left
        case 2: return `scale(${Math.max(0.97, implodeScale)})`;        // Controlled compression
        default: return `scale(${1.05 + majorDropStrength * 0.12})`;
      }
    } else if (dropStrength > 0) {
      // Small/unsustained drops animate the globe only.
      const smallBounce = 1.015 + dropStrength * 0.07;
      const bounceY = -1.5 - dropStrength * 5;
      return `translateY(${bounceY}px) scale(${smallBounce})`;
    } else if (beatStrength > 0) {
      // Regular beat pulse = subtle globe motion only.
      return `translateY(-1px) scale(${1.008 + beatStrength * 0.035})`;
    }
    // Idle state
    return 'scale(1) rotate(0deg)';
  };

  const transformStyle = getTransform();
  const flashOpacity = isMajorDrop ? Math.min(0.55, majorDropStrength * 0.6) : 0;

  return (
    <div className="min-h-screen overflow-x-hidden text-white relative bg-black">
      {/* Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Press+Start+2P&display=swap"
        rel="stylesheet"
      />

      {/* Inline styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fp-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(2deg); }
          66% { transform: translateY(4px) rotate(-1deg); }
        }
        @keyframes fp-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(168,85,247,0.4)) drop-shadow(0 0 60px rgba(255,45,117,0.2)); }
          50% { filter: drop-shadow(0 0 40px rgba(168,85,247,0.7)) drop-shadow(0 0 80px rgba(255,45,117,0.4)) drop-shadow(0 0 120px rgba(34,211,238,0.2)); }
        }
        @keyframes fp-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fp-slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fp-ticket-shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes fp-pulse-btn {
          0% { box-shadow: 0 0 0 0 rgba(255, 45, 117, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(255, 45, 117, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 45, 117, 0); }
        }
        .fp-stagger-1 { animation: fp-slide-up 0.7s ease-out 0.1s both; }
        .fp-stagger-2 { animation: fp-slide-up 0.7s ease-out 0.25s both; }
        .fp-stagger-3 { animation: fp-slide-up 0.7s ease-out 0.4s both; }
        .fp-stagger-4 { animation: fp-slide-up 0.7s ease-out 0.55s both; }
        .fp-stagger-5 { animation: fp-slide-up 0.7s ease-out 0.7s both; }
        .fp-stagger-6 { animation: fp-slide-up 0.7s ease-out 0.85s both; }
      `}} />

      {/* ─── ENTER OVERLAY ─── */}
      {!hasStarted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000"
          onClick={startParty}
        >
          <div className="text-center cursor-pointer group">
            <div
              className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-500"
              style={{ animation: 'fp-pulse-btn 2s infinite' }}
            >
              <svg className="w-8 h-8 md:w-12 md:h-12 text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              Click to Enter
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ fontFamily: "'Outfit', sans-serif" }}>
              THE PARTY
            </h1>
          </div>
        </div>
      )}

      {/* Disco lights background */}
      <div className={`transition-opacity duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0'}`}>
        <DiscoLightsCanvas
          isMajorDrop={isMajorDrop}
          majorDropStrength={majorDropStrength}
        />
      </div>

      {/* Beat Drop Flash Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[20] mix-blend-overlay bg-white transition-opacity duration-75"
        style={{ opacity: flashOpacity }}
      />

      {/* Ambient gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,85,247,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 20% 80%, rgba(255,45,117,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(34,211,238,0.06) 0%, transparent 50%)
          `,
        }}
        aria-hidden
      />

      <main className={`relative z-10 max-w-xl mx-auto px-6 md:px-8 pt-8 md:pt-12 pb-32 flex flex-col items-center transition-all duration-1000 ${hasStarted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

        {/* ─── DISCO BALL ─── */}
        <div
          id="disco-ball-graphic"
          className="fp-stagger-1"
          style={{
            // Use ambient animations on the wrapper (float, glow)
            animation: mounted ? 'fp-float 6s ease-in-out infinite, fp-glow-pulse 4s ease-in-out infinite' : 'none',
          }}
        >
          <div
            className="transition-transform duration-100 ease-out"
            style={{ transform: transformStyle }}
          >
            <img
              src={DISCO_SVG}
              alt="Disco Ball"
              className="w-36 h-36 md:w-48 md:h-48 object-contain mx-auto"
              style={{ filter: 'invert(1) brightness(1.2) drop-shadow(0 0 20px rgba(255,255,255,0.4))' }}
            />
          </div>
        </div>

        {/* ─── HEADLINE ─── */}
        <p
          className="fp-stagger-2 text-center text-[9px] md:text-[10px] tracking-[0.5em] uppercase mt-10 mb-4 font-light text-white/40"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          You&apos;re invited to a
        </p>

        <h1
          className="fp-stagger-2 text-center font-black mb-3 select-none"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(4rem, 15vw, 8rem)',
            lineHeight: 0.9,
            letterSpacing: '-0.04em',
            background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 40%, ${ACCENT_CYAN} 70%, ${ACCENT_ORANGE} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            backgroundSize: '200% auto',
            animation: mounted ? 'fp-shimmer 4s linear infinite' : 'none',
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))'
          }}
        >
          Party
        </h1>

        {/* ─── EVENT DETAILS ─── */}
        <div
          className="fp-stagger-3 flex flex-col items-center gap-2 mt-8 mb-10"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            <p className="text-xs font-semibold tracking-widest uppercase text-white/90">
              19 Kingsmount St S
            </p>
          </div>
          <p className="text-xs font-medium tracking-widest text-white/50 uppercase">
            Feb 28 · 10 PM · Limited Entry
          </p>
        </div>

        {/* ─── DJ SECTION ─── */}
        <div className="fp-stagger-4 flex flex-col items-center gap-4 mb-12 group">
          <span
            className="text-[8px] uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            music by
          </span>
          <a
            href="https://www.instagram.com/djdavibabi/"
            target="_blank"
            rel="noopener noreferrer"
            className="relative"
          >
            <div
              className="absolute -inset-3 rounded-full opacity-40 group-hover:opacity-100 transition-opacity blur-xl duration-500"
              style={{
                background: `conic-gradient(from 0deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN}, ${ACCENT_ORANGE}, ${ACCENT_PINK})`,
                animation: 'spin 4s linear infinite'
              }}
            />
            <div className="relative p-[2px] rounded-full bg-black">
              <img
                src={DJDAVIBABI_IMG}
                alt="DJDAVIBABI"
                className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-full grayscale group-hover:grayscale-0 transition-all duration-500"
              />
            </div>
          </a>
        </div>

        {/* ─── BROUGHT TO YOU BY ─── */}
        <div className="fp-stagger-4 flex flex-col items-center gap-3 mb-12">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">brought to you by</span>
          <Link href="/mcmaster" className="block hover:opacity-100 opacity-60 transition-opacity">
            <img
              src={THE_NETWORK_SVG}
              alt="The Network"
              className="h-8 md:h-10 w-auto object-contain"
              style={{ filter: 'invert(1) brightness(2)' }}
            />
          </Link>
        </div>

        {/* ─── TICKET DISPLAY ─── */}
        {ticketCode && (
          <div id="ticket-display" className="w-full max-w-md mb-12 fp-stagger-1 perspective-1000">
            {/* Holographic border */}
            <div
              className="rounded-2xl p-[2px] relative overflow-hidden transform transition-transform hover:rotate-x-2 hover:scale-[1.02] duration-300"
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

              <div className="rounded-[14px] bg-black p-8 text-center relative h-full flex flex-col items-center gap-6">
                {/* Grain overlay */}
                <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>

                <h2
                  className="text-2xl font-bold uppercase tracking-tighter"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    background: `linear-gradient(90deg, #fff, ${ACCENT_CYAN})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  See You There
                </h2>

                {/* QR Code */}
                <div className="bg-white p-3 rounded-lg shadow-2xl">
                  {QRCode ? (
                    <QRCode value={ticketCode} size={160} />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(ticketCode)}`}
                      alt="Ticket QR Code"
                      className="w-[160px] h-[160px]"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <p
                    className="text-[10px] text-white/70 tracking-widest uppercase"
                    style={{ fontFamily: "'Press Start 2P', monospace" }}
                  >
                    Ticket: {ticketCode}
                  </p>

                </div>

                <div className="w-full h-px bg-white/10 my-2"></div>

                <div
                  className="flex items-center gap-2 opacity-50"
                  style={{ animation: mounted ? 'fp-beat 2s ease-in-out infinite' : 'none' }}
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <p className="text-[9px] uppercase tracking-widest" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                    Come back for your match
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── RSVP FORM ─── */}
        {!ticketCode && (
          <div className="fp-stagger-5 w-full max-w-md relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>

            {/* Glass card */}
            <div className="relative rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-1">
              <div className="rounded-xl bg-white/[0.03] p-6 md:p-8">
                <div className="flex flex-col gap-6 text-center">
                  <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    To join the party, sign in with Google and allow us to access your YouTube data to match you with your music soulmate at Kingsmount.
                  </p>

                  <button
                    onClick={() => window.location.href = '/friend-party/dashboard'}
                    type="button"
                    className="w-full py-4 rounded-lg font-bold text-sm uppercase tracking-[0.2em] transition-all duration-500 hover:tracking-[0.3em] hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 bg-white text-black hover:bg-white/90"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {/* Simple Google G Logo */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <title>Google</title>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── BOTTOM INFO ─── */}
        <div className="fp-stagger-6 mt-16 text-center space-y-4 opacity-50 hover:opacity-100 transition-opacity">
          <p
            className="text-[9px] uppercase tracking-widest"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            BYOB · RSVP by February 25
          </p>
        </div>

        {/* ─── FOOTER ─── */}
        <footer className="mt-20 text-center pb-8 border-t border-white/5 pt-8 w-full max-w-xs">
          <p className="text-white/20 text-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>
            © 2026 The Network.
          </p>
        </footer>
      </main>
    </div>
  );
}
