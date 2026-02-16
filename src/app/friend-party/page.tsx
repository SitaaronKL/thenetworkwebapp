'use client';

import { useState } from 'react';
import Link from 'next/link';

let QRCode: any = null;

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const SPARKLY_BALL = '/mcmaster/sparkly-ball.jpeg';
try {
  QRCode = require('react-qr-code').default;
} catch (e) {}

const RED = '#E52E2A';
const GRAY_PAPER = '#e8e6e3';

export default function FriendPartyPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [interestedInBeta, setInterestedInBeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);

  const isFormValid = name.trim() !== '' && email.trim() !== '' && interestedInBeta === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/glowdown-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          interestedInBeta,
          obsession: '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to RSVP');
      }

      setTicketCode(data.ticketCode);
      setTimeout(() => {
        document.getElementById('ticket-display')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden text-white relative z-10"
      style={{ backgroundColor: RED }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Dancing+Script:wght@700&display=swap"
        rel="stylesheet"
      />

      {/* Decorative collage elements - grayscale halftone style */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        {/* Hand with drink top-right */}
        <span
          className="absolute text-4xl md:text-5xl opacity-30 top-20 right-4 md:right-8"
          style={{ filter: 'grayscale(1)' }}
        >
          🥂
        </span>
        {/* Lips */}
        <span
          className="absolute text-4xl opacity-25 left-8 top-1/3"
          style={{ filter: 'grayscale(1)' }}
        >
          💋
        </span>
        {/* Rock on hand */}
        <span
          className="absolute text-3xl opacity-30 right-16 top-1/2"
          style={{ filter: 'grayscale(1)' }}
        >
          🤘
        </span>
        {/* Asterisks / stars */}
        <span className="absolute text-white/50 text-lg top-24 left-1/4">✦</span>
        <span className="absolute text-white/40 text-sm top-32 right-1/3">✦</span>
        <span className="absolute text-white/35 text-base bottom-1/3 left-1/5">✦</span>
        <span className="absolute text-white/45 text-sm top-2/3 right-1/4">✦</span>
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 md:px-10 pt-4 md:pt-6 pb-48">
        {/* Sparkly ball - at very top of page */}
        <div
          className="flex justify-center mb-6 w-48 h-48 md:w-64 md:h-64 flex-shrink-0 bg-no-repeat bg-center [background-size:contain] mx-auto"
          style={{
            backgroundImage: `url(${SPARKLY_BALL})`,
            maskImage: `url(${SPARKLY_BALL})`,
            maskMode: 'luminance',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: `url(${SPARKLY_BALL})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
          }}
          aria-hidden
        />

        {/* YOU'RE INVITED TO A */}
        <p
          className="text-center text-[10px] md:text-xs font-normal tracking-widest uppercase mb-4"
          style={{ fontFamily: "'Press Start 2P', cursive" }}
        >
          You&apos;re invited to a
        </p>

        {/* Main title: Party (script font) */}
        <h1
          className="text-center text-6xl md:text-8xl lg:text-9xl font-bold mb-8 md:mb-12"
          style={{
            fontFamily: "'Dancing Script', cursive",
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          Party
        </h1>

        {/* Event details - right aligned */}
        <div className="flex justify-end mb-8 md:mb-12">
          <div
            className="text-right text-sm md:text-base uppercase tracking-wider space-y-1"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            <p>19 KINGSMOUNT ST S</p>
            <p>28 FEBRUARY</p>
            <p>10 PM</p>
          </div>
        </div>

        {/* Music by - DJDAVIBABI logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <span
            className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-white/70"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            music by
          </span>
          <a
            href="https://www.instagram.com/djdavibabi/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="DJDAVIBABI Instagram"
          >
            <img
              src="/mcmaster/DJDAVIBABI.png"
              alt="DJDAVIBABI"
              className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-full border-4 border-white shadow-lg hover:opacity-80 transition-opacity"
              style={{ background: '#fff' }}
            />
          </a>
        </div>

        {/* Brought to you by The Network */}
        <div className="flex flex-col items-center gap-2 mb-10">
          <span className="text-white/90 text-sm">brought to you by</span>
          <Link href="/mcmaster" className="block">
            <img
              src={THE_NETWORK_SVG}
              alt="The Network"
              className="h-12 md:h-16 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
              style={{ filter: 'invert(1) brightness(1)' }}
            />
          </Link>
        </div>

        {/* Ticket display (after RSVP) */}
        {ticketCode && (
          <div id="ticket-display" className="w-full max-w-md mx-auto mb-12">
            <div
              className="rounded-lg p-6 border-2 border-white/30"
              style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
              <h2
                className="text-center text-xs md:text-sm font-bold mb-6 uppercase"
                style={{ fontFamily: "'Press Start 2P', cursive" }}
              >
                We can&apos;t wait to see you.
              </h2>
              <div className="bg-white p-4 rounded-lg mb-4 flex justify-center">
                {QRCode ? (
                  <QRCode value={ticketCode} size={180} />
                ) : (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticketCode)}`}
                    alt="Ticket QR Code"
                    className="w-[180px] h-[180px]"
                  />
                )}
              </div>
              <p
                className="text-center text-xs mb-2"
                style={{ fontFamily: "'Press Start 2P', cursive" }}
              >
                Code: {ticketCode}
              </p>
              <p className="text-center text-white/80 text-sm">19 KINGSMOUNT ST S · 28 FEB · 10 PM</p>
              <p className="text-center text-white/60 text-xs mt-2">Your confirmation was sent to {email}</p>
            </div>
          </div>
        )}

        {/* RSVP Form */}
        {!ticketCode && (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/10 border-2 border-white/30 rounded py-3 px-4 text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border-2 border-white/30 rounded py-3 px-4 text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
                style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
              />

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={interestedInBeta}
                  onChange={(e) => setInterestedInBeta(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-2 border-white/40 bg-white/10 text-white focus:ring-white/50 focus:ring-2 cursor-pointer"
                />
                <span className="text-[10px] md:text-[11px] text-white/90 leading-tight group-hover:text-white transition-colors">
                  I want to try The Network and be matched with someone at Kingsmount who shares my interests.
                </span>
              </label>

              {error && (
                <div className="bg-black/20 border border-white/50 rounded py-3 px-4 text-white text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="w-full py-4 rounded font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:brightness-110"
                style={{
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: '10px',
                  backgroundColor: isFormValid && !isSubmitting ? 'white' : 'rgba(255,255,255,0.5)',
                  color: isFormValid && !isSubmitting ? RED : 'rgba(255,255,255,0.8)',
                }}
              >
                {isSubmitting ? '...' : "I'm In"}
              </button>
            </form>
          </div>
        )}

        {/* Bottom: Ripped paper effect with BYOB, RSVP info */}
        <div
          className="absolute bottom-0 left-0 right-0 py-10 px-6 md:px-10 -mb-px"
          style={{
            backgroundColor: GRAY_PAPER,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            clipPath: 'polygon(0 12%, 4% 0, 8% 8%, 12% 0, 16% 10%, 20% 0, 24% 6%, 28% 0, 32% 10%, 36% 0, 40% 8%, 44% 0, 48% 12%, 52% 0, 56% 8%, 60% 0, 64% 10%, 68% 0, 72% 6%, 76% 0, 80% 10%, 84% 0, 88% 8%, 92% 0, 96% 6%, 100% 12%, 100% 100%, 0 100%)',
          }}
        >
          <div className="max-w-2xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p
              className="text-[10px] font-bold uppercase"
              style={{ fontFamily: "'Press Start 2P', cursive", color: '#333' }}
            >
              BYOB
            </p>
            <div className="text-center space-y-1">
              <p
                className="text-[8px] md:text-[9px] uppercase leading-relaxed"
                style={{ fontFamily: "'Press Start 2P', cursive", color: '#333' }}
              >
                RSVP using the link by February 25
              </p>
              <p
                className="text-[8px] md:text-[9px] uppercase leading-relaxed"
                style={{ fontFamily: "'Press Start 2P', cursive", color: '#555' }}
              >
                Please confirm if bringing extra guests
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
