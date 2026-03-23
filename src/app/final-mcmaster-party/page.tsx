'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createClient } from '@/lib/supabase';
import { useAudioParty } from '../../hooks/useAudioParty';
import { ensureFinalMcmasterPartyAttendance } from '@/lib/final-mcmaster-party-attendance';

/* Sunset / ember — warm red-orange, not purple-brown */
const BG_PAGE_GRADIENT =
  'linear-gradient(168deg, #120403 0%, #2a0a05 20%, #4a1408 45%, #7a200c 72%, #4a1408 100%)';

const FONT_DISPLAY = "'Bebas Neue', sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const POST_AUTH_REDIRECT_KEY = 'tn_post_auth_redirect';
const MATCH_REVEAL_DATE = new Date('2026-03-28T00:00:00-04:00');

type RsvpAttendee = {
  id: string;
  name: string;
  avatar_url: string | null;
  source: 'network' | 'waitlist';
  rsvped_at: string | null;
};

type MatchCard = {
  matchId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  currentObsession: string | null;
  compatibilityDescription: string;
};

type MatchResponse = {
  status?: 'pending' | 'ready' | 'unavailable';
  revealAt?: string;
  match?: MatchCard;
  error?: string;
};

type AuthState = 'loading' | 'signed-out' | 'signed-in';

/* ─── Countdown ─── */
function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));
  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);
  return timeLeft;
}

/* ─── Tasteful ambient confetti (always on, low contrast) ─── */
function BackgroundConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => {
        const a = (i * 2654435761) >>> 0;
        return {
          id: i,
          left: `${(a % 1000) / 10}%`,
          delay: `${(a % 140) / 10}s`,
          duration: `${11 + (a % 90) / 10}s`,
          w: 2 + (a % 4),
          h: 4 + (a % 6),
          drift: `${-30 + (a % 60)}px`,
          rot0: (a % 360) - 180,
          color: [
            'rgba(255, 186, 140, 0.42)',
            'rgba(255, 112, 72, 0.32)',
            'rgba(255, 228, 196, 0.38)',
            'rgba(255, 90, 52, 0.28)',
            'rgba(255, 200, 160, 0.34)',
          ][i % 5],
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-[1px] fp-confetti-drift"
          style={
            {
              left: p.left,
              top: '-8%',
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: p.color,
              boxShadow: '0 0 12px rgba(255, 180, 120, 0.15)',
              ['--fp-drift' as string]: p.drift,
              ['--fp-rot0' as string]: `${p.rot0}deg`,
              animationDuration: p.duration,
              animationDelay: p.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function FinalMcmasterPartyPage() {
  const supabase = createClient();
  const {
    startParty,
    hasStarted,
    isMajorDrop,
    majorDropStrength,
  } = useAudioParty({
    src: '/mcmaster/Daft Punk - One More Time (Official Audio) (1).mp3',
    startOffsetSeconds: 20,
    bpm: 123,
    volume: 0.85,
  });

  const [signInLoading, setSignInLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userName, setUserName] = useState<string | null>(null);
  const [hasYouTube, setHasYouTube] = useState<boolean | null>(null);

  // RSVP state
  const [attendees, setAttendees] = useState<RsvpAttendee[]>([]);
  const [isRsvpLoading, setIsRsvpLoading] = useState(true);

  // Match state
  const [matchCard, setMatchCard] = useState<MatchCard | null>(null);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'loading' | 'pending' | 'ready' | 'unavailable' | 'error'>('idle');

  const countdown = useCountdown(MATCH_REVEAL_DATE);
  const isRevealLive = countdown.total <= 0;
  const flashOpacity = isMajorDrop ? Math.min(0.55, majorDropStrength * 0.6) : 0;

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthState('signed-in');
        setUserName(session.user.user_metadata?.name || session.user.email?.split('@')[0] || null);

        // Skip the CD splash — go straight to invitation
        startParty();

        // Auto-RSVP
        ensureFinalMcmasterPartyAttendance('link').catch(() => {});

        // Check YouTube status
        const { count } = await supabase
          .from('youtube_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);

        setHasYouTube((count ?? 0) > 0);
      } else {
        setAuthState('signed-out');
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load RSVPs (only when signed in)
  const loadAttendees = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRsvpLoading(true);
    try {
      const res = await fetch('/api/final-mcmaster-party/rsvps');
      const data = await res.json();
      if (res.ok) setAttendees(data.attendees || []);
    } catch {}
    if (showLoading) setIsRsvpLoading(false);
  }, []);

  // Load match
  const loadMatch = useCallback(async () => {
    setMatchStatus('loading');
    try {
      const res = await fetch('/api/final-mcmaster-party/match');
      const data = (await res.json()) as MatchResponse;
      if (data.status === 'ready' && data.match) {
        setMatchCard(data.match);
        setMatchStatus('ready');
      } else if (data.status === 'pending') {
        setMatchStatus('pending');
      } else {
        setMatchStatus('unavailable');
      }
    } catch {
      setMatchStatus('error');
    }
  }, []);

  useEffect(() => {
    if (authState !== 'signed-in') return;
    const kickoff = window.setTimeout(() => { void loadAttendees(true); }, 0);
    const interval = window.setInterval(() => { void loadAttendees(false); }, 30_000);
    return () => { window.clearTimeout(kickoff); window.clearInterval(interval); };
  }, [authState, loadAttendees]);

  useEffect(() => {
    if (authState !== 'signed-in') return;
    const kickoff = window.setTimeout(() => { void loadMatch(); }, 0);
    const interval = window.setInterval(() => { void loadMatch(); }, 20_000);
    return () => { window.clearTimeout(kickoff); window.clearInterval(interval); };
  }, [authState, loadMatch]);

  const handleGoogleSignIn = async () => {
    if (signInLoading) return;
    setSignInLoading(true);

    try {
      window.localStorage.setItem(POST_AUTH_REDIRECT_KEY, '/final-mcmaster-party');
    } catch {}

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile https://www.googleapis.com/auth/youtube.readonly',
        },
      });
      if (error) setSignInLoading(false);
    } catch {
      setSignInLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative min-h-[100dvh]" style={{ background: BG_PAGE_GRADIENT }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800;900&display=swap"
        rel="stylesheet"
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fp-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(2deg); }
          66% { transform: translateY(4px) rotate(-1deg); }
        }
        @keyframes fp-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(255,255,255,0.18)) drop-shadow(0 0 50px rgba(249,115,22,0.18)); }
          50% { filter: drop-shadow(0 0 34px rgba(255,255,255,0.24)) drop-shadow(0 0 90px rgba(239,68,68,0.25)) drop-shadow(0 0 130px rgba(251,191,36,0.18)); }
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
          0% { box-shadow: 0 0 0 0 rgba(255, 92, 51, 0.55); }
          70% { box-shadow: 0 0 0 16px rgba(255, 140, 66, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 92, 51, 0); }
        }
        @keyframes fp-confetti-gold {
          0% {
            transform: translate(-50%, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx, 0px)), var(--ty, -220px)) rotate(var(--rot, 540deg)) scale(0.45);
            opacity: 0;
          }
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
        @keyframes fp-cd-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fp-cd-spin {
          animation: fp-cd-spin 8s linear infinite;
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
        @keyframes fp-confetti-drift {
          0% { transform: translate3d(0, -12vh, 0) rotate(var(--fp-rot0, 0deg)); opacity: 0; }
          7% { opacity: 0.5; }
          93% { opacity: 0.38; }
          100% { transform: translate3d(var(--fp-drift, 0px), 108vh, 0) rotate(calc(var(--fp-rot0, 0deg) + 260deg)); opacity: 0; }
        }
        .fp-confetti-drift {
          animation-name: fp-confetti-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fp-sleeve-glow {
          0%, 100% {
            box-shadow:
              0 4px 48px rgba(0,0,0,0.45),
              0 0 0 1px rgba(255,150,100,0.12),
              0 0 72px rgba(255,80,40,0.1);
          }
          50% {
            box-shadow:
              0 10px 72px rgba(0,0,0,0.52),
              0 0 0 1px rgba(255,190,140,0.2),
              0 0 96px rgba(255,120,60,0.18);
          }
        }
        .fp-sleeve-insert {
          animation: fp-sleeve-glow 1.95s ease-in-out infinite;
        }
        @keyframes fp-groove-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .fp-groove-spin {
          animation: fp-groove-spin 56s linear infinite;
        }
        @keyframes fp-gold-shimmer {
          0%   { background-position: 150% 50%; }
          100% { background-position: -50% 50%; }
        }
        @keyframes fp-sparkle-float {
          0%   { transform: translate(var(--sx, 0px), var(--sy, 0px)) scale(0); opacity: 0; }
          20%  { opacity: 1; transform: translate(var(--sx, 0px), var(--sy, 0px)) scale(1.1); }
          80%  { opacity: 0.7; }
          100% { transform: translate(calc(var(--sx, 0px) + var(--sdx, 6px)), calc(var(--sy, 0px) + var(--sdy, -14px))) scale(0); opacity: 0; }
        }
        @keyframes fp-halo-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.58; transform: scale(1.08); }
        }
        .fp-mini-vinyl-spin {
          animation: fp-cd-spin 12s linear infinite;
        }
        @keyframes fp-eve-drift {
          0%   { transform: translateY(0px) rotate(0deg); }
          25%  { transform: translateY(-6px) rotate(0.5deg); }
          50%  { transform: translateY(2px) rotate(-0.3deg); }
          75%  { transform: translateY(-4px) rotate(0.2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .fp-eve-drift {
          animation: fp-eve-drift 5.8s ease-in-out infinite;
        }
        @keyframes fp-vinyl-sheen {
          0%, 100% { opacity: 0.035; transform: rotate(0deg); }
          50%      { opacity: 0.065; transform: rotate(180deg); }
        }
        .fp-vinyl-sheen {
          animation: fp-vinyl-sheen 14s linear infinite;
        }
        @keyframes fp-pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}} />

      <BackgroundConfetti />

      {/* ─── SPINNING CD SPLASH — PRESS PLAY ─── */}
      {!hasStarted && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-1000 px-6"
          style={{
            background: 'linear-gradient(180deg, #080402 0%, #120805 42%, #060302 100%)',
          }}
          onClick={startParty}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startParty();
            }
          }}
          aria-label="Press play to enter"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 72% 58% at 50% 38%, rgba(255, 90, 40, 0.12) 0%, transparent 55%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.65) 100%)',
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,340px)] h-[min(92vw,340px)] rounded-full blur-[52px] opacity-95"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(255, 120, 70, 0.22) 0%, rgba(255, 60, 30, 0.08) 42%, transparent 70%)',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vw,300px)] h-[min(78vw,300px)] rounded-full border border-orange-300/20 opacity-90"
              style={{ boxShadow: '0 0 72px rgba(255, 120, 60, 0.18), inset 0 0 48px rgba(255, 80, 40, 0.06)' }}
              aria-hidden
            />

            <div
              className="fp-cd-spin relative w-[min(72vw,280px)] h-[min(72vw,280px)] rounded-full shrink-0"
              style={{
                background: `
                  radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.06) 22%, transparent 45%),
                  conic-gradient(from 200deg, #1c1410 0%, #3a2a22 11%, #9a8a82 24%, #d8d0cc 34%, #7a6e68 46%, #2a201c 58%, #4a3c36 70%, #1a1210 100%)
                `,
                boxShadow:
                  '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,200,160,0.14), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="absolute inset-[10%] rounded-full pointer-events-none"
                style={{
                  background:
                    'repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 2px, rgba(255,255,255,0.035) 2px, rgba(255,255,255,0.035) 3px)',
                  opacity: 0.4,
                }}
              />
              <div
                className="absolute inset-[18%] rounded-full flex flex-col items-center justify-center text-center px-3 border border-white/12"
                style={{
                  background:
                    'radial-gradient(circle at 50% 38%, rgba(22,12,8,0.98) 0%, rgba(8,4,3,0.99) 72%)',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
                }}
              >
                <svg className="absolute inset-x-3 top-[14%] h-[22%] w-[86%] overflow-visible" viewBox="0 0 200 40" aria-hidden>
                  <defs>
                    <path id="fp-splash-arc" d="M 12 38 Q 100 -2 188 38" fill="none" />
                  </defs>
                  <text
                    fill="rgba(255,220,200,0.75)"
                    style={{ fontFamily: FONT_BODY, fontSize: '11px', fontWeight: 600, letterSpacing: '0.32em' }}
                  >
                    <textPath href="#fp-splash-arc" startOffset="50%" textAnchor="middle">
                      THE NETWORK
                    </textPath>
                  </text>
                </svg>
                <p
                  className="text-[1.75rem] md:text-[2.1rem] tracking-tight text-white mt-1"
                  style={{ fontFamily: FONT_DISPLAY, textShadow: '0 2px 28px rgba(0,0,0,0.85)' }}
                >
                  VOL. 03
                </p>
                <p
                  className="mt-2 text-[0.68rem] md:text-xs tracking-[0.28em] uppercase text-orange-100/90"
                  style={{ fontFamily: FONT_BODY, fontWeight: 600 }}
                >
                  ONE MORE TIME
                </p>
              </div>
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-white/22"
                style={{ background: 'radial-gradient(circle at 30% 30%, #3a2820, #0c0806)' }}
                aria-hidden
              />
            </div>

            <p
              className="mt-10 md:mt-12 text-[1.35rem] md:text-[1.85rem] tracking-[0.42em] text-white/95 uppercase"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              PRESS PLAY <span className="inline-block ml-1 align-middle text-2xl md:text-3xl" aria-hidden>&#9654;</span>
            </p>
          </div>
        </div>
      )}

      {/* Beat Drop Flash Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[20] mix-blend-overlay bg-white transition-opacity duration-75"
        style={{ opacity: flashOpacity }}
      />

      {/* Warm sunset wash */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: `
            radial-gradient(ellipse 140% 88% at 50% -10%, rgba(255, 160, 96, 0.14) 0%, transparent 52%),
            radial-gradient(ellipse 100% 70% at 12% 40%, rgba(255, 72, 40, 0.22) 0%, transparent 58%),
            radial-gradient(ellipse 110% 75% at 88% 35%, rgba(255, 130, 60, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse 90% 55% at 40% 92%, rgba(255, 100, 48, 0.16) 0%, transparent 60%)
          `,
        }}
        aria-hidden
      />


      {/* ─── Main content ─── */}
      <main className={`relative z-10 min-h-[100svh] w-screen transition-all duration-1000 ${hasStarted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute left-0 right-0 top-5 md:top-7 z-[5] text-center pointer-events-none">
          <p className="text-[11px] md:text-xs tracking-[0.18em] uppercase text-orange-100/55" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
            The Network &middot; Vol. 03
          </p>
        </div>

        <div className="relative min-h-[100svh] pb-32 overflow-y-auto overflow-x-hidden px-8 sm:px-12 md:px-8">
          <div
            className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[min(130vw,640px)] h-[min(130vw,640px)] fp-groove-spin opacity-[0.06] rounded-full"
            style={{
              background:
                'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 4px, rgba(255,200,160,0.9) 4px, rgba(255,200,160,0.9) 5px)',
            }}
            aria-hidden
          />

          <section className="relative z-[1] min-h-[100svh] flex items-center justify-center py-14 md:py-20">
            <div className="fp-sleeve-insert relative w-full max-w-[380px] sm:max-w-[420px] md:max-w-lg overflow-hidden rounded-[3px] border border-orange-200/15 bg-black/40 backdrop-blur-md">
              {/* Scan-line paper texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.45) 1px, rgba(255,255,255,0.45) 2px)',
                }}
                aria-hidden
              />
              {/* Vinyl sheen */}
              <div
                className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] md:w-[420px] md:h-[420px] rounded-full fp-vinyl-sheen"
                style={{
                  background:
                    'conic-gradient(from 45deg, transparent 0%, rgba(255,220,180,0.5) 8%, transparent 16%, transparent 46%, rgba(255,200,160,0.4) 54%, transparent 62%)',
                }}
                aria-hidden
              />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-300/50 to-transparent" aria-hidden />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-300/25 to-transparent" aria-hidden />

              <div className="relative p-6 sm:p-8 md:p-11">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
                  <div className="text-right">
                    <p className="text-[10px] tracking-[0.25em] uppercase text-orange-200/75" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                      TNW-2026
                    </p>
                  </div>
                </div>

                <p className="mt-10 text-center text-[11px] tracking-[0.4em] uppercase text-white/50" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
                  End of year
                </p>

                {/* ─── Gold glamorous EVE centerpiece ─── */}
                <div className="relative mt-4 flex flex-col items-center fp-eve-drift">
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] w-[min(88vw,420px)] h-[120px] md:h-[160px] rounded-full"
                    style={{
                      background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(255, 195, 100, 0.28) 0%, rgba(255, 160, 60, 0.08) 50%, transparent 75%)',
                      filter: 'blur(22px)',
                      animation: 'fp-halo-breathe 3.2s ease-in-out infinite',
                    }}
                    aria-hidden
                  />

                  <h1
                    className="relative text-center select-none"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontWeight: 900,
                      fontSize: 'clamp(5.5rem, 22vw, 10.5rem)',
                      lineHeight: 0.85,
                      letterSpacing: '-0.02em',
                      background: 'linear-gradient(105deg, #b8860b 0%, #daa520 18%, #ffd700 32%, #fff8dc 46%, #ffd700 56%, #daa520 70%, #b8860b 85%, #ffd700 100%)',
                      backgroundSize: '250% 100%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animation: 'fp-gold-shimmer 4.5s ease-in-out infinite',
                      filter: 'drop-shadow(0 4px 28px rgba(255, 200, 80, 0.35)) drop-shadow(0 1px 0 rgba(180, 130, 30, 0.6))',
                    }}
                  >
                    EVE
                  </h1>

                  {/* Sparkle particles */}
                  {[
                    { sx: '-70px', sy: '-20px', sdx: '12px', sdy: '-18px', d: '2.8s', dl: '0s', sz: 3 },
                    { sx: '65px', sy: '-30px', sdx: '-8px', sdy: '-12px', d: '3.3s', dl: '0.6s', sz: 2.5 },
                    { sx: '-48px', sy: '10px', sdx: '10px', sdy: '14px', d: '3.1s', dl: '1.2s', sz: 2 },
                    { sx: '80px', sy: '5px', sdx: '-6px', sdy: '16px', d: '2.6s', dl: '0.3s', sz: 3.5 },
                    { sx: '-22px', sy: '-38px', sdx: '4px', sdy: '-20px', d: '3.5s', dl: '1.8s', sz: 2 },
                    { sx: '38px', sy: '22px', sdx: '-14px', sdy: '8px', d: '2.9s', dl: '0.9s', sz: 2.5 },
                    { sx: '0px', sy: '-44px', sdx: '2px', sdy: '-16px', d: '3.6s', dl: '1.5s', sz: 1.8 },
                    { sx: '-90px', sy: '0px', sdx: '8px', sdy: '-10px', d: '3.0s', dl: '2.1s', sz: 2.2 },
                  ].map((s, i) => (
                    <span
                      key={i}
                      className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                      style={{
                        width: `${s.sz}px`,
                        height: `${s.sz}px`,
                        background: 'radial-gradient(circle, #fff8dc 0%, #ffd700 55%, transparent 100%)',
                        boxShadow: '0 0 6px 2px rgba(255, 215, 0, 0.5)',
                        ['--sx' as string]: s.sx,
                        ['--sy' as string]: s.sy,
                        ['--sdx' as string]: s.sdx,
                        ['--sdy' as string]: s.sdy,
                        animation: `fp-sparkle-float ${s.d} ease-in-out ${s.dl} infinite`,
                      } as CSSProperties}
                      aria-hidden
                    />
                  ))}
                </div>

                <div className="mt-8 space-y-1.5 text-center">
                  <p className="text-sm md:text-[15px] text-white/78 tracking-wide" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
                    Saturday, March 28 &middot; 10 PM
                  </p>
                  <p className="text-xs md:text-sm text-white/45" style={{ fontFamily: FONT_BODY }}>
                    {authState === 'signed-in' ? '19 Kingsmount Street South' : 'location released upon RSVP'}
                  </p>
                  <p className="text-[11px] text-orange-200/65 tracking-wide" style={{ fontFamily: FONT_BODY }}>
                    BYOB
                  </p>
                </div>

                {/* ─── SIGNED OUT: Landing content ─── */}
                {(authState === 'loading' || authState === 'signed-out') && (
                  <>
                    <div className="relative mt-10">
                      <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] md:w-[280px] md:h-[280px] rounded-full opacity-[0.025]"
                        style={{ border: '1.5px solid rgba(255,200,160,0.9)' }}
                        aria-hidden
                      />
                      <p className="relative text-center text-base md:text-lg leading-relaxed text-white/88" style={{ fontFamily: FONT_BODY, fontWeight: 400 }}>
                        Last time was nuts, so we had to do it again.
                      </p>
                      <p className="relative mt-5 text-center text-sm md:text-base leading-relaxed text-white/72" style={{ fontFamily: FONT_BODY, fontWeight: 400 }}>
                        Before everyone goes their own way, we are ending the year together one last night, one more time!!!!
                      </p>
                    </div>

                    {/* Mini vinyl — DJ */}
                    <div className="mt-12 flex justify-center">
                      <div className="relative">
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-32 md:h-32 rounded-full blur-[20px]"
                          style={{ background: 'radial-gradient(circle, rgba(255, 160, 80, 0.15), transparent 70%)' }}
                          aria-hidden
                        />
                        <div
                          className="fp-mini-vinyl-spin relative w-20 h-20 md:w-24 md:h-24 rounded-full"
                          style={{
                            background: `
                              radial-gradient(circle at 36% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.04) 20%, transparent 42%),
                              conic-gradient(from 180deg, #1c1410 0%, #3a2a22 12%, #8a7a72 25%, #c8c0bb 35%, #6a5e58 48%, #2a201c 60%, #4a3c36 74%, #1a1210 100%)
                            `,
                            boxShadow: '0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,200,160,0.1), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -4px 12px rgba(0,0,0,0.35)',
                          }}
                        >
                          <div
                            className="absolute inset-[12%] rounded-full pointer-events-none"
                            style={{
                              background: 'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 1.5px, rgba(255,255,255,0.03) 1.5px, rgba(255,255,255,0.03) 2.5px)',
                              opacity: 0.5,
                            }}
                          />
                          <div
                            className="absolute inset-[22%] rounded-full flex flex-col items-center justify-center text-center border border-white/10"
                            style={{
                              background: 'radial-gradient(circle at 50% 40%, rgba(22,12,8,0.97) 0%, rgba(8,4,3,0.99) 70%)',
                              boxShadow: 'inset 0 0 16px rgba(0,0,0,0.4)',
                            }}
                          >
                            <p className="text-[5px] md:text-[6px] tracking-[0.2em] uppercase text-orange-200/70 leading-tight" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                              Now spinning
                            </p>
                            <p className="mt-0.5 text-[6px] md:text-[7px] tracking-[0.08em] uppercase text-white/85 font-bold leading-tight" style={{ fontFamily: FONT_DISPLAY }}>
                              DJDAVIBABI
                            </p>
                          </div>
                          <div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/18"
                            style={{ background: 'radial-gradient(circle at 30% 30%, #3a2820, #0c0806)' }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 w-full max-w-md mx-auto">
                      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200/90" style={{ fontFamily: FONT_BODY }}>
                        RSVP TO GET THE ADDRESS
                      </p>
                      <p className="mt-2 text-center text-xs text-white/40" style={{ fontFamily: FONT_BODY }}>
                        Curated Matches Included
                      </p>

                      <button
                        onClick={handleGoogleSignIn}
                        type="button"
                        disabled={signInLoading || authState === 'loading'}
                        className="mt-7 w-full py-4 rounded-[2px] text-sm font-semibold uppercase tracking-[0.18em] transition-all duration-300 flex items-center justify-center gap-3 bg-white text-zinc-900 hover:bg-orange-50 hover:shadow-[0_0_48px_-8px_rgba(255,140,80,0.55)] disabled:opacity-60"
                        style={{ fontFamily: FONT_BODY }}
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {signInLoading ? 'Redirecting\u2026' : 'Sign in to RSVP'}
                      </button>
                    </div>

                    {/* Scattered polaroid memories */}
                    <div className="relative mt-16 mx-auto" style={{ height: '420px', maxWidth: '380px' }}>
                      <p className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-[0.35em] uppercase text-white/35" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
                        We can&apos;t wait to see you :D
                      </p>
                      {[
                        { src: '/mcmaster/img-9.jpeg', x: '2%',  y: '4%',   rot: -7,  z: 9 },
                        { src: '/mcmaster/img-2.jpeg', x: '28%', y: '0%',   rot: 4,   z: 8 },
                        { src: '/mcmaster/img-3.jpeg', x: '54%', y: '3%',   rot: -3,  z: 7 },
                        { src: '/mcmaster/img-6.jpeg', x: '12%', y: '24%',  rot: -4,  z: 4 },
                        { src: '/mcmaster/img-7.jpeg', x: '44%', y: '21%',  rot: 6,   z: 3 },
                        { src: '/mcmaster/img-5.jpeg', x: '6%',  y: '48%',  rot: 5,   z: 6 },
                        { src: '/mcmaster/img-4.jpeg', x: '36%', y: '44%',  rot: -6,  z: 10 },
                        { src: '/mcmaster/img-1.jpeg', x: '58%', y: '50%',  rot: 3,   z: 5 },
                        { src: '/mcmaster/img-8.jpeg', x: '20%', y: '68%',  rot: -2,  z: 2 },
                      ].map((photo, i) => (
                        <div
                          key={i}
                          className="absolute transition-transform duration-300 hover:scale-110 hover:z-20"
                          style={{
                            left: photo.x,
                            top: photo.y,
                            zIndex: photo.z,
                            transform: `rotate(${photo.rot}deg)`,
                          }}
                        >
                          <div
                            className="bg-white/90 p-[3px] pb-[14px] rounded-[1px]"
                            style={{
                              boxShadow: '0 4px 16px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)',
                              width: '105px',
                            }}
                          >
                            <img
                              src={photo.src}
                              alt=""
                              className="w-full aspect-[4/3] object-cover rounded-[0.5px]"
                              loading="lazy"
                              draggable={false}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ─── SIGNED IN: Invitation + Match + RSVPs ─── */}
                {authState === 'signed-in' && (
                  <div className="mt-10 space-y-6">
                    {/* Confirmation */}
                    <div className="rounded-[3px] border border-orange-300/20 bg-black/30 backdrop-blur-sm p-5 text-center space-y-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200/80" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                        Party Pass Active
                      </p>
                      <p className="text-xl md:text-2xl font-bold text-white/95" style={{ fontFamily: FONT_DISPLAY, letterSpacing: '0.04em' }}>
                        {userName ? `${userName}, you\u2019re in.` : 'You\u2019re in.'}
                      </p>
                      <p className="text-sm text-white/60" style={{ fontFamily: FONT_BODY }}>
                        Your curated match drops March 28 at 12 AM.
                      </p>
                    </div>

                    {/* YouTube Status Badge */}
                    {hasYouTube !== null && (
                      <div className="flex items-center justify-center gap-2.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{
                            background: hasYouTube ? '#34d399' : 'rgba(255,255,255,0.3)',
                            boxShadow: hasYouTube ? '0 0 8px rgba(52, 211, 153, 0.5)' : 'none',
                          }}
                        />
                        <p className="text-xs text-white/55" style={{ fontFamily: FONT_BODY }}>
                          {hasYouTube ? 'YouTube Connected — smarter match incoming' : 'YouTube not connected — you\u2019ll get a random match'}
                        </p>
                      </div>
                    )}

                    {/* Countdown */}
                    <div className="rounded-[3px] border border-orange-300/15 bg-black/25 backdrop-blur-sm p-5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-orange-200/60 mb-3 text-center" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
                        Match Reveal Countdown
                      </p>
                      <div className="flex justify-center gap-3">
                        {[
                          { value: countdown.days, label: 'Days' },
                          { value: countdown.hours, label: 'Hrs' },
                          { value: countdown.minutes, label: 'Min' },
                          { value: countdown.seconds, label: 'Sec' },
                        ].map((unit) => (
                          <div key={unit.label} className="rounded-[2px] border border-orange-200/10 bg-black/30 px-3 py-2.5 text-center min-w-[3.4rem]">
                            <p className="font-black tabular-nums text-xl text-white/90" style={{ fontFamily: FONT_DISPLAY }}>
                              {String(unit.value).padStart(2, '0')}
                            </p>
                            <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 mt-0.5" style={{ fontFamily: FONT_BODY }}>
                              {unit.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Match Card Area */}
                    <div className="rounded-[3px] border border-orange-300/15 bg-black/25 backdrop-blur-sm p-5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-orange-200/60 mb-3" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
                        Your Match
                      </p>

                      {!isRevealLive && (
                        <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-4 text-center">
                          <p className="text-sm text-white/65" style={{ fontFamily: FONT_BODY }}>
                            Match card unlocks March 28 at 12 AM.
                          </p>
                          <p className="text-xs text-white/40 mt-1.5" style={{ fontFamily: FONT_BODY }}>
                            We&apos;re computing compatibility in the background.
                          </p>
                        </div>
                      )}

                      {isRevealLive && (matchStatus === 'idle' || matchStatus === 'loading') && (
                        <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-4 text-center">
                          <p className="text-sm text-white/55" style={{ fontFamily: FONT_BODY }}>Loading your match card...</p>
                        </div>
                      )}

                      {isRevealLive && matchStatus === 'pending' && (
                        <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-4 text-center">
                          <p className="text-sm text-white/65" style={{ fontFamily: FONT_BODY }}>Finalizing your match. Refresh in a moment.</p>
                        </div>
                      )}

                      {isRevealLive && matchStatus === 'unavailable' && (
                        <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-4 text-center">
                          <p className="text-sm text-white/65" style={{ fontFamily: FONT_BODY }}>No match yet. We&apos;ll update this automatically.</p>
                        </div>
                      )}

                      {isRevealLive && matchStatus === 'error' && (
                        <div className="rounded-[2px] border border-red-400/20 bg-red-500/5 p-4 text-center space-y-2">
                          <p className="text-sm text-red-200" style={{ fontFamily: FONT_BODY }}>Failed to load your match.</p>
                          <button
                            type="button"
                            onClick={loadMatch}
                            className="text-xs text-red-100 underline underline-offset-2"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {isRevealLive && matchStatus === 'ready' && matchCard && (
                        <div className="rounded-[2px] border border-orange-300/20 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-4 space-y-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {matchCard.avatarUrl ? (
                              <img
                                src={matchCard.avatarUrl}
                                alt={`${matchCard.name}`}
                                className="w-12 h-12 rounded-full border border-orange-200/20 object-cover shrink-0"
                              />
                            ) : (
                              <span className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500 inline-flex items-center justify-center text-lg font-bold shrink-0">
                                {matchCard.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-lg font-bold text-white truncate" style={{ fontFamily: FONT_BODY }}>{matchCard.name}</p>
                              <p className="text-xs text-white/50" style={{ fontFamily: FONT_BODY }}>
                                {typeof matchCard.age === 'number' ? `${matchCard.age} years old` : ''}
                              </p>
                            </div>
                          </div>

                          {matchCard.currentObsession && (
                            <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-3">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-orange-200/50 mb-1" style={{ fontFamily: FONT_BODY }}>Current Obsession</p>
                              <p className="text-sm text-white/80 leading-relaxed" style={{ fontFamily: FONT_BODY }}>{matchCard.currentObsession}</p>
                            </div>
                          )}

                          <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-orange-200/50 mb-1" style={{ fontFamily: FONT_BODY }}>Why You Matched</p>
                            <p className="text-sm text-white/75 leading-relaxed" style={{ fontFamily: FONT_BODY }}>{matchCard.compatibilityDescription}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RSVP Roster */}
                    <div className="rounded-[3px] border border-orange-300/15 bg-black/25 backdrop-blur-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-orange-200/60" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
                          RSVP Roster
                        </p>
                        <p className="text-xs text-white/40" style={{ fontFamily: FONT_BODY }}>
                          {attendees.length} {attendees.length === 1 ? 'person' : 'people'}
                        </p>
                      </div>

                      {isRsvpLoading ? (
                        <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-4 text-center">
                          <p className="text-sm text-white/45" style={{ fontFamily: FONT_BODY }}>Loading...</p>
                        </div>
                      ) : attendees.length === 0 ? (
                        <div className="rounded-[2px] border border-orange-200/10 bg-black/30 p-4 text-center">
                          <p className="text-sm text-white/45" style={{ fontFamily: FONT_BODY }}>No RSVPs yet.</p>
                        </div>
                      ) : (
                        <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1.5">
                          {attendees.map((attendee, index) => (
                            <div
                              key={`${attendee.id}-${index}`}
                              className="rounded-[2px] border border-orange-200/8 bg-black/25 px-3 py-2 flex items-center gap-3"
                            >
                              {attendee.avatar_url ? (
                                <img
                                  src={attendee.avatar_url}
                                  alt=""
                                  className="w-7 h-7 rounded-full border border-orange-200/15 object-cover shrink-0"
                                />
                              ) : (
                                <span className="w-7 h-7 rounded-full border border-orange-200/10 bg-white/[0.04] inline-flex items-center justify-center text-[10px] font-semibold text-white/65 shrink-0">
                                  {attendee.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <p className="text-sm text-white/75 truncate" style={{ fontFamily: FONT_BODY }}>{attendee.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <footer className="relative mt-6 pt-6 text-center">
                  <svg className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-5 overflow-visible opacity-[0.18]" viewBox="0 0 160 20" fill="none" aria-hidden>
                    <path d="M 4 18 Q 80 0 156 18" stroke="rgba(255,200,160,1)" strokeWidth="0.6" />
                  </svg>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-white/32" style={{ fontFamily: FONT_BODY }}>
                    The Network
                  </p>
                  <p className="mt-3 text-xs text-white/25" style={{ fontFamily: FONT_BODY }}>
                    &copy; 2026
                  </p>
                </footer>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
