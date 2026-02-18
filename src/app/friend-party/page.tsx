'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase';

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

const DISCO_SVG = '/mcmaster/disco.svg';
const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const DJDAVIBABI_IMG = '/mcmaster/DJDAVIBABI.png';

/* ─── Colour palette ─── */
const BG_BLACK = '#000000';     // Pure black base for invite flow
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_ORANGE = '#f97316';
const ACCENT_CYAN = '#22d3ee';
const TAU = Math.PI * 2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const fract = (value: number) => value - Math.floor(value);
type ScenePhase = 'normal' | 'build' | 'drop' | 'afterglow';

/* ─── Disco Light Canvas Background ─── */
function DiscoLightsCanvas({
  isMajorDrop,
  majorDropStrength,
  buildUpStrength,
  scenePhase,
  postDropStrength,
  phaseVariant,
}: {
  isMajorDrop: boolean;
  majorDropStrength: number;
  buildUpStrength: number;
  scenePhase: ScenePhase;
  postDropStrength: number;
  phaseVariant: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const majorDropRef = useRef(false);
  const majorDropStrengthRef = useRef(0);
  const buildUpStrengthRef = useRef(0);
  const scenePhaseRef = useRef<ScenePhase>('normal');
  const postDropStrengthRef = useRef(0);
  const phaseVariantRef = useRef(0);

  // Sync refs for animation loop
  useEffect(() => {
    majorDropRef.current = isMajorDrop;
    majorDropStrengthRef.current = majorDropStrength;
    buildUpStrengthRef.current = buildUpStrength;
    scenePhaseRef.current = scenePhase;
    postDropStrengthRef.current = postDropStrength;
    phaseVariantRef.current = phaseVariant;
  }, [isMajorDrop, majorDropStrength, buildUpStrength, scenePhase, postDropStrength, phaseVariant]);

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
        const buildEnergy = scenePhaseRef.current === 'build' ? buildUpStrengthRef.current : 0;
        const afterglowEnergy = scenePhaseRef.current === 'afterglow' ? postDropStrengthRef.current : 0;
        const variant = phaseVariantRef.current;
        let shakeX = 0;
        let shakeY = 0;
        const intensityMult = 1 + majorEnergy * 2.3 + buildEnergy * 0.38 + afterglowEnergy * 0.42;

        if (majorEnergy > 0) {
          const dropShake = 10 + majorEnergy * 18;
          shakeX = (Math.random() - 0.5) * dropShake;
          shakeY = (Math.random() - 0.5) * dropShake;
        } else if (afterglowEnergy > 0) {
          const sway = 4 + afterglowEnergy * 11;
          shakeX = Math.sin(t * (0.012 + variant * 0.0035)) * sway;
          shakeY = Math.cos(t * (0.01 + variant * 0.0028)) * sway * 0.75;
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
          const speedMult = 1 + majorEnergy * 4.8 + buildEnergy * 1.6 + afterglowEnergy * (1.2 + variant * 0.35);

          const a = beam.angle + t * beam.speed * speedMult;

          const lengthMult = 1 + majorEnergy * 0.38 + buildEnergy * 0.24 + afterglowEnergy * 0.3;

          const currentLength = beam.length * (0.9 + 0.1 * Math.sin(t * 0.02 + beam.phase)) * lengthMult;

          const endX = ox + shakeX + Math.cos(a) * w * currentLength;
          const endY = oy + shakeY + Math.sin(a) * h * currentLength;
          let [r, g, b] = beam.color;

          if (majorEnergy > 0.12 && Math.random() > 0.82 - majorEnergy * 0.22) {
            [r, g, b] = [255, 255, 255]; // Flash white
          } else if (afterglowEnergy > 0.22 && Math.random() > 0.95 - afterglowEnergy * 0.22) {
            const rotated = [
              [255, 145, 214],
              [124, 197, 255],
              [255, 184, 127],
              [190, 151, 255],
            ];
            [r, g, b] = rotated[(variant + Math.floor(t / 40)) % rotated.length];
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
        const buildEnergy = scenePhaseRef.current === 'build' ? buildUpStrengthRef.current : 0;
        const afterglowEnergy = scenePhaseRef.current === 'afterglow' ? postDropStrengthRef.current : 0;
        const variant = phaseVariantRef.current;

        // Explode outward on MAJOR DROP
        if (majorEnergy > 0) {
          const dropKick = 0.02 + majorEnergy * 0.06;
          p.vx += (Math.random() - 0.5) * dropKick;
          p.vy += (Math.random() - 0.5) * dropKick;
        } else if (afterglowEnergy > 0) {
          // Post-drop orbiting drift: calmer than drop, but visibly different from normal.
          const swirl = 0.0008 + afterglowEnergy * 0.003;
          p.vx += Math.sin(p.pulse * (0.7 + variant * 0.14) + variant) * swirl;
          p.vy += Math.cos(p.pulse * (0.9 + variant * 0.11) + variant) * swirl * 0.7;
        } else if (buildEnergy > 0.18) {
          // Build-up tension: subtle upward pull before a drop.
          p.vy -= buildEnergy * 0.0018;
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
  const supabase = createClient();
  const {
    startParty,
    hasStarted,
    dropStrength,
    isMajorDrop,
    majorDropStrength,
    beatStrength,
    buildUpStrength,
    dropPulse,
    scenePhase,
    postDropStrength,
    phaseVariant,
  } = useAudioParty();

  const [ticketCode] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);

  // Deterministic pseudo-random hashes from pulse+energy.
  // This gives richer variation while staying stable per frame.
  const pulseHashA = fract(Math.sin((dropPulse + 1) * 12.9898 + beatStrength * 8.13) * 43758.5453);
  const pulseHashB = fract(Math.sin((dropPulse + 1) * 78.233 + dropStrength * 11.17) * 24634.6345);
  const pulseHashC = fract(Math.sin((dropPulse + 1) * 39.425 + buildUpStrength * 14.2) * 96453.1234);
  const effectVariant = (phaseVariant + Math.floor(pulseHashA * 3)) % 5;
  const rotationGear = scenePhase === 'drop'
    ? 1.8 + majorDropStrength * 1.3
    : scenePhase === 'afterglow'
      ? 0.5 + postDropStrength * (2 + phaseVariant * 0.24)
      : scenePhase === 'build'
        ? 0.6 + buildUpStrength * 1.2
        : 0.8 + beatStrength * 0.7;
  const phaseSlowdown = scenePhase === 'afterglow' ? 0.62 + (1 - postDropStrength) * 0.4 : 1;

  const getTransform = () => {
    const transientEnergy = clamp(
      beatStrength * 0.7 + dropStrength * 0.95 + buildUpStrength * 0.4 + (isMajorDrop ? majorDropStrength * 1.2 : 0),
      0,
      1.8
    );
    const phaseA = dropPulse * (0.28 + rotationGear * 0.42) + pulseHashA * TAU;
    const phaseB = dropPulse * (0.22 + rotationGear * 0.34) + pulseHashB * TAU;
    const lateral = Math.sin(phaseA) * (1 + transientEnergy * 5.5);
    const vertical = Math.cos(phaseB) * (1 + transientEnergy * 4.4);
    const tilt = Math.sin(phaseA * (1.1 + rotationGear * 0.28)) * (1.2 + transientEnergy * 4.2);
    const skew = Math.cos(phaseB * 0.9) * transientEnergy * 1.8;

    if (isMajorDrop) {
      const scaleBoost = 1.1 + majorDropStrength * 0.18 + pulseHashC * 0.03;
      const rotation = 3 + majorDropStrength * 6 + lateral * 0.5;
      const implodeScale = 1 - majorDropStrength * 0.1;

      // MAJOR DROP: High energy visuals
      switch (effectVariant) {
        case 0: return `translateX(${lateral}px) translateY(${-2 - vertical}px) scale(${scaleBoost}) rotate(${rotation}deg) skewX(${skew}deg)`;
        case 1: return `translateX(${-lateral}px) translateY(${vertical * 0.8}px) scale(${scaleBoost}) rotate(${-rotation}deg) skewY(${skew * 0.8}deg)`;
        case 2: return `translateY(${vertical * 0.5}px) scale(${Math.max(0.97, implodeScale)}) rotate(${tilt}deg)`;
        case 3: return `translateX(${lateral * 0.7}px) scale(${1.06 + majorDropStrength * 0.14}) rotate(${tilt * 1.2}deg)`;
        case 4: return `translateY(${-2 + vertical * 0.7}px) scale(${1.08 + majorDropStrength * 0.12}) skewX(${skew * 1.1}deg)`;
        default: return `scale(${1.05 + majorDropStrength * 0.12})`;
      }
    } else if (scenePhase === 'afterglow' && postDropStrength > 0) {
      const afterTurnRate = (0.38 + postDropStrength * (2.2 + phaseVariant * 0.35)) * phaseSlowdown;
      const afterPhase = dropPulse * afterTurnRate + (1 - postDropStrength) * TAU * (1.3 + phaseVariant * 0.2) + pulseHashB * TAU;
      const settle = 1 + postDropStrength * (0.038 + phaseVariant * 0.008);
      const driftX = Math.sin(afterPhase) * (1.2 + postDropStrength * 5.8);
      const driftY = Math.cos(afterPhase * 0.82) * (0.8 + postDropStrength * 4.2);
      const sway = Math.sin(afterPhase * (1 + phaseVariant * 0.06)) * (0.7 + postDropStrength * 3.8);

      switch (phaseVariant % 4) {
        case 0: return `translateX(${driftX}px) translateY(${-1 + driftY}px) scale(${settle}) rotate(${sway}deg)`;
        case 1: return `translateX(${-driftX * 0.85}px) translateY(${driftY * 0.8}px) scale(${settle + 0.005}) skewX(${sway * 0.8}deg)`;
        case 2: return `translateX(${driftX * 0.6}px) translateY(${-2 + driftY * 0.6}px) scale(${settle + 0.008}) rotate(${-sway * 0.7}deg)`;
        default: return `translateX(${driftX * 0.45}px) translateY(${-1 + driftY * 0.9}px) scale(${settle}) skewY(${sway * 0.7}deg)`;
      }
    } else if (scenePhase === 'build') {
      const tension = clamp(buildUpStrength, 0, 1);
      const preDropPhase = dropPulse * 0.58 + pulseHashC * TAU;
      const tighten = 1 - tension * 0.022;
      const pullY = -1 - tension * 5 + Math.sin(preDropPhase) * (0.7 + tension * 1.1);
      const twist = Math.sin(preDropPhase * 1.4) * (0.45 + tension * 1.8);
      return `translateY(${pullY}px) scale(${tighten}) rotate(${twist}deg)`;
    } else if (dropStrength > 0) {
      const smallBounce = 1.015 + dropStrength * 0.07 + pulseHashA * 0.01;
      const bounceY = -1.5 - dropStrength * 5 - Math.abs(vertical) * 0.6;
      return `translateX(${lateral * 0.35}px) translateY(${bounceY}px) scale(${smallBounce}) rotate(${tilt * 0.25}deg)`;
    } else if (beatStrength > 0) {
      return `translateX(${lateral * 0.2}px) translateY(${-1 + vertical * 0.15}px) scale(${1.008 + beatStrength * 0.035}) rotate(${tilt * 0.15}deg)`;
    }
    return `translateX(${Math.sin(phaseA * 0.35) * 0.6}px) translateY(${Math.cos(phaseB * 0.35) * 0.5}px) scale(1) rotate(0deg)`;
  };

  const transformStyle = getTransform();
  const flashOpacity = isMajorDrop ? Math.min(0.55, majorDropStrength * 0.6) : 0;
  const buildBias = scenePhase === 'build' ? buildUpStrength : 0;
  const afterglowBias = scenePhase === 'afterglow' ? postDropStrength : 0;
  const cardEnergyRaw =
    beatStrength * 0.8 +
    dropStrength * 0.9 +
    buildBias * 0.65 +
    afterglowBias * 0.7 +
    (isMajorDrop ? majorDropStrength * 1.5 : 0);
  const cardEnergy = clamp(cardEnergyRaw, 0, 1.8);
  const cardPhaseA = dropPulse * (0.38 + rotationGear * 0.46) + pulseHashB * TAU;
  const cardPhaseB = dropPulse * (0.24 + rotationGear * 0.34) + pulseHashC * TAU;
  const cardScale = 1 + cardEnergy * 0.055 + (isMajorDrop ? 0.028 : 0);
  const cardLift = -1 - cardEnergy * 7 + Math.sin(cardPhaseB) * cardEnergy * 1.8;
  const cardTiltX = Math.sin(cardPhaseA + effectVariant * 0.8) * (1.1 + cardEnergy * 5.4);
  const cardTiltY = Math.cos(cardPhaseB + effectVariant * 0.45) * (0.9 + cardEnergy * 4.9);
  const cardShear = Math.sin(cardPhaseA * 0.5 + cardPhaseB * 0.7) * cardEnergy * 2.4;
  const cardFloatX = Math.cos(cardPhaseB * 1.2 + effectVariant) * cardEnergy * 3;
  const cardGlowOpacity = clamp(0.2 + cardEnergy * 0.52 + (isMajorDrop ? 0.14 : 0), 0.2, 0.94);
  const cardHaloScale = 1 + cardEnergy * 0.11 + pulseHashA * 0.04;
  const cardHaloSpinDuration = scenePhase === 'drop'
    ? Math.max(1.9, 3.1 - majorDropStrength * 1.4)
    : scenePhase === 'afterglow'
      ? 3.4 + (1 - postDropStrength) * 5.8 + phaseVariant * 0.35
      : Math.max(5.8, 12.5 - cardEnergy * 5.2);
  const cardHaloPulseDuration = scenePhase === 'build'
    ? Math.max(1.5, 2.8 - cardEnergy * 0.8)
    : scenePhase === 'drop'
      ? Math.max(1.1, 2.1 - majorDropStrength * 0.5)
      : Math.max(2.1, 4.4 - cardEnergy * 1.5);
  const cardPrismDuration = scenePhase === 'drop'
    ? Math.max(2.2, 4.2 - majorDropStrength * 1.3)
    : scenePhase === 'afterglow'
      ? 2.8 + (1 - postDropStrength) * 6.6 + phaseVariant * 0.4
      : Math.max(3.6, 9 - cardEnergy * 3.6);
  const cardTransformMs = scenePhase === 'drop'
    ? 92
    : scenePhase === 'afterglow'
      ? Math.round(150 + (1 - postDropStrength) * 240)
      : scenePhase === 'build'
        ? 125
        : 145;
  const ticketTransformMs = Math.max(90, Math.round(cardTransformMs * 0.82));
  const cardPrismShiftX = Math.sin(cardPhaseA * 0.9 + pulseHashA * TAU) * (4 + cardEnergy * 9);
  const cardPrismShiftY = Math.cos(cardPhaseB * 1.1 + pulseHashB * TAU) * (3 + cardEnergy * 8);
  const cardPrismAngle = (dropPulse * 37 + pulseHashC * 360) % 360;
  const cardPrismOpacity = clamp(
    0.14 + cardEnergy * 0.33 + (isMajorDrop ? 0.09 : 0) + afterglowBias * 0.08,
    0.14,
    0.7
  );
  const cardPrismCenterX = clamp(50 + cardFloatX * 2.5, 20, 80);
  const cardPrismCenterY = clamp(45 + cardTiltX * 2.2, 20, 80);
  const cardOuterStyle = {
    transform: `perspective(1300px) translate3d(${cardFloatX}px, ${cardLift}px, 0) rotateX(${cardTiltX}deg) rotateY(${cardTiltY}deg) skewX(${cardShear}deg) scale(${cardScale})`,
    transition: `transform ${cardTransformMs}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms ease, border-color 160ms ease`,
    boxShadow: `0 22px ${50 + cardEnergy * 40}px -20px rgba(168,85,247,${0.25 + cardEnergy * 0.33}), 0 0 ${20 + cardEnergy * 46}px rgba(34,211,238,${0.12 + cardEnergy * 0.3})`,
    borderColor: `rgba(255,255,255,${0.1 + cardEnergy * 0.16})`,
    backgroundColor: `rgba(0, 0, 0, ${0.9 - Math.min(0.08, cardEnergy * 0.06)})`,
    filter: `saturate(${1 + cardEnergy * 0.36}) contrast(${1 + cardEnergy * 0.22})`,
    transformOrigin: '50% 42%',
    willChange: 'transform, box-shadow, filter',
  };
  const cardInnerStyle = {
    background: `
      linear-gradient(160deg, rgba(255,45,117,${0.03 + cardEnergy * 0.16}) 0%, rgba(168,85,247,${0.04 + cardEnergy * 0.14}) 48%, rgba(34,211,238,${0.02 + cardEnergy * 0.16}) 100%),
      radial-gradient(circle at ${cardPrismCenterX}% ${cardPrismCenterY}%, rgba(255,255,255,${0.04 + cardEnergy * 0.08}) 0%, rgba(255,255,255,0) 45%)
    `,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,${0.08 + cardEnergy * 0.2}), inset 0 -26px 70px rgba(0,0,0,${0.16 + cardEnergy * 0.22})`,
    transition: 'background 160ms ease, box-shadow 160ms ease',
    willChange: 'background, box-shadow',
  };

  const handleGoogleSignIn = async () => {
    if (signInLoading) return;
    setSignInLoading(true);

    const returnUrl = '/friend-party/setup';

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(returnUrl)}`,
          scopes: 'email profile https://www.googleapis.com/auth/youtube.readonly',
        },
      });
      if (error) {
        setSignInLoading(false);
      }
    } catch {
      setSignInLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden text-white relative" style={{ backgroundColor: BG_BLACK }}>
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
        @keyframes fp-card-prism {
          0% { background-position: 0% 50%; filter: hue-rotate(0deg); }
          50% { background-position: 100% 50%; filter: hue-rotate(24deg); }
          100% { background-position: 200% 50%; filter: hue-rotate(0deg); }
        }
        @keyframes fp-card-halo-wave {
          0%, 100% { filter: blur(14px); opacity: 0.82; }
          50% { filter: blur(22px); opacity: 1; }
        }
        @keyframes fp-card-halo-spin {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes fp-beat {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.04); opacity: 0.9; }
        }
        .fp-card-prism {
          animation: fp-card-prism 8s linear infinite;
          background-size: 240% 240%;
          will-change: transform, opacity, filter;
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
          className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-1000"
          style={{ backgroundColor: BG_BLACK }}
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
              YOUR INVITE
            </h1>
          </div>
        </div>
      )}

      {/* Disco lights background */}
      <div className={`transition-opacity duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0'}`}>
        <DiscoLightsCanvas
          isMajorDrop={isMajorDrop}
          majorDropStrength={majorDropStrength}
          buildUpStrength={buildUpStrength}
          scenePhase={scenePhase}
          postDropStrength={postDropStrength}
          phaseVariant={phaseVariant}
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
            animation: 'fp-float 6s ease-in-out infinite, fp-glow-pulse 4s ease-in-out infinite',
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
            animation: 'fp-shimmer 4s linear infinite',
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
            <div className="relative p-[2px] rounded-full" style={{ backgroundColor: BG_BLACK }}>
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
              className="rounded-2xl p-[2px] relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE}, ${ACCENT_CYAN})`,
                boxShadow: `0 20px 50px -10px ${ACCENT_PURPLE}40`,
                transform: `perspective(1200px) translateY(${cardLift * 0.45}px) rotateX(${cardTiltX * 0.55}deg) rotateY(${cardTiltY * 0.45}deg) scale(${1 + cardEnergy * 0.025})`,
                transition: `transform ${ticketTransformMs}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms ease`,
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

              <div className="rounded-[14px] p-8 text-center relative h-full flex flex-col items-center gap-6" style={{ backgroundColor: '#0d0d0d' }}>
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
                  <QRCode value={ticketCode} size={160} />
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
                  style={{ animation: 'fp-beat 2s ease-in-out infinite' }}
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
          <>
            <div className="fp-stagger-5 w-full max-w-md mx-auto mb-6 text-center">
              <p className="text-xs font-medium tracking-widest text-white/50 uppercase" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                Wazzup party people!!!!
              </p>
              <p className="text-sm font-medium text-white/80 leading-relaxed mt-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Have you ever talked to someone you’ve known for a long time only to realize you’re more similar than you thought? It’s way too common to pass by people you probably should’ve already met. Tonight we’re running a little experiment.
              </p>
            </div>
            <div className="fp-stagger-5 w-full max-w-md relative group">
              <div
                className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 rounded-2xl blur transition duration-300"
                style={{
                  opacity: cardGlowOpacity,
                  transform: `scale(${cardHaloScale}) rotate(${cardPrismAngle * 0.15}deg)`,
                  backgroundSize: '220% 220%',
                  animation: `fp-card-halo-wave ${cardHaloPulseDuration}s ease-in-out infinite, fp-card-halo-spin ${cardHaloSpinDuration}s linear infinite`,
                }}
              ></div>


              {/* Glass card */}
              <div className="relative rounded-2xl backdrop-blur-xl border p-1" style={cardOuterStyle}>
                <div className="rounded-xl p-6 md:p-8 relative overflow-hidden" style={cardInnerStyle}>
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-screen fp-card-prism"
                    style={{
                      opacity: cardPrismOpacity,
                      transform: `translate3d(${cardPrismShiftX}px, ${cardPrismShiftY}px, 0) scale(${1.04 + cardEnergy * 0.08})`,
                      animationDuration: `${cardPrismDuration}s`,
                      background: `conic-gradient(from ${cardPrismAngle}deg at ${cardPrismCenterX}% ${cardPrismCenterY}%, rgba(255,45,117,0.24), rgba(168,85,247,0.12), rgba(34,211,238,0.22), rgba(249,115,22,0.12), rgba(255,45,117,0.24))`,
                    }}
                  ></div>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at ${100 - cardPrismCenterX}% ${100 - cardPrismCenterY}%, rgba(255,255,255,${0.05 + cardEnergy * 0.11}) 0%, rgba(255,255,255,0) 55%)`,
                    }}
                  ></div>
                  <div className="relative z-[1] flex flex-col gap-6 text-center">
                    <p className="text-white/60 text-sm leading-relaxed" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      Sign in with Google and see who you get matched with.
                    </p>

                    <button
                      onClick={handleGoogleSignIn}
                      type="button"
                      disabled={signInLoading}
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
                      {signInLoading ? 'Redirecting...' : 'Sign in with Google'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
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
