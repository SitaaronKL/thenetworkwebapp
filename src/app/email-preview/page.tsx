'use client';

import { useState, useEffect, useRef } from 'react';

import { renderHtmlBody } from '../../../../supabase/functions/send-ticket-email/template';

export default function EmailPreviewPage() {
  const [name, setName] = useState('Alex');
  const [ticketCode, setTicketCode] = useState('GLOW-1234-XYZ');
  const [partyTitle, setPartyTitle] = useState('GlowDown');
  const [venueAddress, setVenueAddress] = useState('122 Whitney Avenue');
  const [eventTime, setEventTime] = useState('10:00PM');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const nodes: any[] = [];
    const nodeCount = 80;
    const connectionDistance = 150;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        hue: Math.random() * 360
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        node.hue += 0.5;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 5);
        gradient.addColorStop(0, `hsla(${node.hue}, 100%, 60%, 0.8)`);
        gradient.addColorStop(1, `hsla(${node.hue}, 100%, 60%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
        ctx.fill();

        nodes.forEach((otherNode, j) => {
          if (i < j) {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectionDistance) {
              const opacity = (1 - distance / connectionDistance) * 0.3;
              const avgHue = (node.hue + otherNode.hue) / 2;

              ctx.strokeStyle = `hsla(${avgHue}, 100%, 60%, ${opacity})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.stroke();
            }
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const emailData = { name, ticketCode, partyTitle, venueAddress, eventTime };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Neural Network Background (Canvas) */}
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full -z-10 pointer-events-none opacity-40 bg-black"
        />

        {/* Controls */}
        <div className="lg:col-span-1 bg-zinc-800/80 backdrop-blur-xl p-6 rounded-2xl border border-zinc-700 h-fit space-y-4 relative z-10 shadow-2xl">
          <h2 className="text-xl font-bold mb-4">Preview Controls</h2>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Recipient Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Ticket Code</label>
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Party Title</label>
            <input
              type="text"
              value={partyTitle}
              onChange={(e) => setPartyTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Venue Address</label>
            <input
              type="text"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Event Time</label>
            <input
              type="text"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="pt-4 border-t border-zinc-700 mt-6">
            <p className="text-xs text-zinc-500 italic">
              This preview uses the same HTML structure as the backend email service.
            </p>
          </div>
        </div>

        {/* Email Content */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-zinc-700">
          <div className="bg-zinc-100/10 backdrop-blur-md px-4 py-2 border-b border-white/10 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/50" />
              <div className="w-3 h-3 rounded-full bg-amber-400/50" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/50" />
            </div>
            <div className="bg-black/20 border border-white/10 rounded px-2 py-0.5 text-[10px] text-zinc-400 flex-1 text-center font-mono">
              Subject: Your GlowDown Ticket - {ticketCode}
            </div>
          </div>
          <div className="overflow-auto h-[800px] bg-transparent">
            <div
              dangerouslySetInnerHTML={{
                __html: renderHtmlBody(emailData)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
