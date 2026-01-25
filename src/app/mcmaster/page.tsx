'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg'; // -white is empty; use + invert for white on black
const MCMASTER_LOGO_SVG = '/mcmaster/mcmaster-logo.svg';
const APP_ICON_SVG = '/mcmaster/app_icon.svg'; // -white is empty; use + invert for white on black

const GLOW_COLORS = [
  [34, 211, 238],   // cyan
  [59, 130, 246],   // blue
  [168, 85, 247],   // purple
  [236, 72, 153],   // pink
  [249, 115, 22],   // orange
  [234, 179, 8],    // yellow
  [34, 197, 94],    // green
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

      const cols = 16;
      const rows = 14;
      const spacingX = w / (cols + 1);
      const spacingY = (h * 0.7) / (rows + 1);
      const points: { x: number; y: number; c: number[] }[] = [];

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const t = j / rows;
          const c = GLOW_COLORS[(i + j) % GLOW_COLORS.length];
          points.push({
            x: spacingX * (i + 1) + Math.sin((frame + i * 5 + j * 7) * 0.02) * 12,
            y: spacingY * (j + 1) + Math.cos((frame + i * 3 + j * 11) * 0.015) * 8,
            c,
          });
        }
      }

      const maxDist = 140;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[j].x - points[i].x;
          const dy = points[j].y - points[i].y;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            const alpha = (1 - d / maxDist) * 0.14;
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
        ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      aria-hidden
    />
  );
}

export default function McMasterGlowdownPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans">
      <GlowdownBackground />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex justify-end">
        <Link
          href="/"
          className="text-white/90 hover:text-white text-sm font-medium tracking-wide transition-colors"
        >
          The Network
        </Link>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-20">
        {/* Hero: app icon center + Introducing + What's good, Mac! + Fellow Marauder */}
        <header className="text-center mb-16">
          <img
            src={APP_ICON_SVG}
            alt="The Network"
            className="h-20 md:h-24 w-auto object-contain opacity-95 mx-auto mb-6 brightness-0 invert"
          />
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-white/50 mb-4">
            Introducing
          </p>
          <h1 className="font-brand text-3xl md:text-4xl font-bold tracking-tight text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
            What&apos;s good, Mac!
          </h1>
          <p className="text-white/70 text-base md:text-lg font-ui">
            Fellow Marauder here —* hope you&apos;re all doing well.
          </p>
        </header>

        {/* The Network × McMaster — personalized to Mac */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 mb-12">
          <img src={THE_NETWORK_SVG} alt="The Network" className="h-8 md:h-10 w-auto object-contain opacity-95 brightness-0 invert" />
          <span className="text-white/40 text-lg md:text-xl font-light select-none">×</span>
          <img src={MCMASTER_LOGO_SVG} alt="McMaster University" className="h-7 md:h-9 w-auto object-contain opacity-95" />
        </div>

        {/* Intro */}
        <div className="space-y-6 text-white/80 text-base leading-relaxed font-ui max-w-[65ch] mx-auto mb-16">
          <p>
            last year at a conference in new york, i stumbled into a conversation that stuck with me: for over 15 years, social media has been about likes, comments, and followers — a consumption engine built to keep you on your phone. we started asking: <em className="text-white">what if we could challenge that?</em>
          </p>
          <p>
            imagine a platform that understands your real interests from how you actually spend your time online. where your digital presence reflects who you are, not just what you post. where connections are meaningful and your data works for you. that&apos;s what we&apos;re building with The Network.
          </p>
        </div>

        {/* how the internet gets to know you */}
        <section className="mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            how the internet gets to know you
          </h2>
          <p className="text-white/80 text-base leading-relaxed font-ui max-w-[65ch]">
            a few months ago i was introduced to the term &quot;digital DNA.&quot; for those of you who haven&apos;t come across it yet, your digital DNA is like a living web of everything you consume. your tastes, obsessions, and curiosity, all woven together through every click, stream, and scroll across the internet. <strong className="text-white">right now, that identity is scattered across platforms.</strong>
          </p>
        </section>

        {/* our vision */}
        <section className="mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            our vision
          </h2>
          <p className="text-white/80 text-base leading-relaxed font-ui max-w-[65ch]">
            imagine a real-time map of who you are. something built from all the signals you leave behind when watching that random heated rivalry brainrot at 3am (anyone else suddenly super keen to go workout at the pulse?!). <strong className="text-white">we&apos;re not talking about what you say you like, but what your behavior proves you actually love.</strong>
          </p>
        </section>

        {/* why join? */}
        <section className="mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            why join?
          </h2>
          <ul className="list-none p-0 space-y-4 text-white/80 text-base leading-relaxed font-ui max-w-[65ch]">
            <li>think of The Network as an extension of your mind...</li>
            <li>we want to help you understand yourself in a world full of noise.</li>
            <li>we want to connect you with communities that share your niche interests.</li>
            <li>we want to remove all the junk that is keeping the right opportunities out of reach.</li>
            <li><strong className="text-white">... ultimately, we want to connect the dots and light up your network so that you can continue to live your best life, both online and offline.</strong></li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center py-8 mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-8" style={{ letterSpacing: '-0.02em' }}>
            ready to see if this could fkn work?**
          </h2>
          <Link
            href="/invite/4NA8JW"
            className="inline-block px-10 py-5 rounded-full text-lg font-semibold bg-white text-black hover:bg-gray-100 transition-colors duration-200"
          >
            let&apos;s do this
          </Link>
          <img
            src={APP_ICON_SVG}
            alt="The Network"
            className="h-24 md:h-32 w-auto object-contain opacity-95 mx-auto mt-10 brightness-0 invert"
          />
        </section>

        {/* Footer */}
        <footer className="text-center pt-6 border-t border-white/10">
          <p className="text-white/60 text-sm">© 2026 The Network.</p>
          <p className="text-white/40 text-xs mt-3">*any use of Em Dashes are my own and not written by ChatGPT</p>
          <p className="text-white/40 text-xs mt-1">**coded by vibe and the sheer persistence of a life sci student (im just a giiiiirllll)</p>
        </footer>
      </main>
    </div>
  );
}
