"use client";

import React, { useEffect, useRef } from "react";

type Particle = {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    alpha: number;
    alphaV: number;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export default function GlowdownBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
        x: 0,
        y: 0,
        active: false,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const resize = () => {
            const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            const { innerWidth: w, innerHeight: h } = window;

            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Re seed particles on resize for consistent density
            const density = prefersReducedMotion ? 0.00003 : 0.00006;
            const count = Math.floor(w * h * density);
            particlesRef.current = new Array(count).fill(null).map(() => {
                const r = 1 + Math.random() * 3.5;
                return {
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r,
                    vx: (-0.15 + Math.random() * 0.3) * (prefersReducedMotion ? 0.4 : 1),
                    vy: (-0.08 + Math.random() * 0.16) * (prefersReducedMotion ? 0.4 : 1),
                    alpha: 0.15 + Math.random() * 0.35,
                    alphaV: (-0.003 + Math.random() * 0.006) * (prefersReducedMotion ? 0.5 : 1),
                };
            });
        };

        const drawBackground = (w: number, h: number) => {
            // Base: deep black with subtle purple tint
            const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, Math.max(w, h));
            g.addColorStop(0, "rgba(15, 12, 25, 1)");
            g.addColorStop(0.55, "rgba(6, 6, 12, 1)");
            g.addColorStop(1, "rgba(0, 0, 0, 1)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

            // Soft vignette
            const v = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
            v.addColorStop(0, "rgba(0, 0, 0, 0)");
            v.addColorStop(1, "rgba(0, 0, 0, 0.55)");
            ctx.fillStyle = v;
            ctx.fillRect(0, 0, w, h);
        };

        const step = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;

            drawBackground(w, h);

            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            // Mouse glow hotspot
            if (mouse.active) {
                const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
                mg.addColorStop(0, "rgba(255, 255, 255, 0.10)");
                mg.addColorStop(0.35, "rgba(255, 255, 255, 0.06)");
                mg.addColorStop(1, "rgba(255, 255, 255, 0)");
                ctx.fillStyle = mg;
                ctx.fillRect(0, 0, w, h);
            }

            // Particles
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;

                // Wrap
                if (p.x < -20) p.x = w + 20;
                if (p.x > w + 20) p.x = -20;
                if (p.y < -20) p.y = h + 20;
                if (p.y > h + 20) p.y = -20;

                p.alpha += p.alphaV;
                if (p.alpha < 0.12 || p.alpha > 0.55) p.alphaV *= -1;
                p.alpha = clamp(p.alpha, 0.12, 0.55);

                // Slight attraction to mouse
                if (mouse.active && !prefersReducedMotion) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 220) {
                        const pull = (1 - dist / 220) * 0.015;
                        p.vx += (dx / (dist + 0.001)) * pull;
                        p.vy += (dy / (dist + 0.001)) * pull;
                        p.vx = clamp(p.vx, -0.35, 0.35);
                        p.vy = clamp(p.vy, -0.25, 0.25);
                    }
                }

                // Glow dot
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 9);
                grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
                grad.addColorStop(0.45, `rgba(255, 255, 255, ${p.alpha * 0.35})`);
                grad.addColorStop(1, "rgba(255, 255, 255, 0)");

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 9, 0, Math.PI * 2);
                ctx.fill();
            }

            rafRef.current = requestAnimationFrame(step);
        };

        const onMouseMove = (e: MouseEvent) => {
            mouseRef.current.active = true;
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        const onMouseLeave = () => {
            mouseRef.current.active = false;
        };

        resize();
        rafRef.current = requestAnimationFrame(step);

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseleave", onMouseLeave);

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseleave", onMouseLeave);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <div
            aria-hidden="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: -1,
                pointerEvents: "none",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
            {/* Optional soft film grain overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.08,
                    mixBlendMode: "overlay",
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
                }}
            />
        </div>
    );
}
