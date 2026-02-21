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

            const density = prefersReducedMotion ? 0.00002 : 0.00004;
            const count = Math.floor(w * h * density);
            particlesRef.current = new Array(count).fill(null).map(() => {
                const r = 0.5 + Math.random() * 2;
                return {
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r,
                    vx: (-0.1 + Math.random() * 0.2) * (prefersReducedMotion ? 0.3 : 1),
                    vy: (-0.05 + Math.random() * 0.1) * (prefersReducedMotion ? 0.3 : 1),
                    alpha: 0.08 + Math.random() * 0.2,
                    alphaV: (-0.002 + Math.random() * 0.004) * (prefersReducedMotion ? 0.4 : 1),
                };
            });
        };

        const step = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;

            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, w, h);

            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            if (mouse.active) {
                const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
                mg.addColorStop(0, "rgba(255, 255, 255, 0.06)");
                mg.addColorStop(0.4, "rgba(255, 255, 255, 0.03)");
                mg.addColorStop(1, "rgba(255, 255, 255, 0)");
                ctx.fillStyle = mg;
                ctx.fillRect(0, 0, w, h);
            }

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -20) p.x = w + 20;
                if (p.x > w + 20) p.x = -20;
                if (p.y < -20) p.y = h + 20;
                if (p.y > h + 20) p.y = -20;

                p.alpha += p.alphaV;
                if (p.alpha < 0.06 || p.alpha > 0.3) p.alphaV *= -1;
                p.alpha = clamp(p.alpha, 0.06, 0.3);

                if (mouse.active && !prefersReducedMotion) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180) {
                        const pull = (1 - dist / 180) * 0.01;
                        p.vx += (dx / (dist + 0.001)) * pull;
                        p.vy += (dy / (dist + 0.001)) * pull;
                        p.vx = clamp(p.vx, -0.25, 0.25);
                        p.vy = clamp(p.vy, -0.15, 0.15);
                    }
                }

                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
                grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
                grad.addColorStop(0.5, `rgba(255, 255, 255, ${p.alpha * 0.25})`);
                grad.addColorStop(1, "rgba(255, 255, 255, 0)");

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
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
        </div>
    );
}
