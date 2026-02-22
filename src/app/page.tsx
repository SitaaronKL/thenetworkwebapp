'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ConstellationSphere from '@/components/ConstellationSphere';
import InstagramFloat from '@/components/InstagramFloat';
import WaitlistModal from '@/components/WaitlistModal';
import { createClient } from '@/utils/supabase/client';

function LiveCounter({ realCount }: { realCount: number }) {
  const STORAGE_KEY = 'waitlistDisplayCount';
  const [displayCount, setDisplayCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const driftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introRafRef = useRef<number | null>(null);
  const [introDone, setIntroDone] = useState(false);

  const saveToStorage = useCallback((count: number) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch {
      // ignore
    }
  }, []);

  const animateChange = useCallback(() => {
    setIsAnimating(true);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 300);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored = raw ? parseInt(raw, 10) : NaN;
      const startValue = 0;
      const target = Number.isNaN(stored) ? realCount : Math.max(stored, realCount);

      if (Number.isNaN(stored)) {
        saveToStorage(target);
      }

      if (target > startValue) {
        const duration = 1200;
        let start: number | null = null;
        const step = (ts: number) => {
          if (start === null) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const next = Math.round(startValue + (target - startValue) * eased);
          setDisplayCount(next);
          if (progress < 1) {
            introRafRef.current = requestAnimationFrame(step);
          } else {
            saveToStorage(target);
            setIntroDone(true);
          }
        };
        introRafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayCount(target);
        if (target !== stored) saveToStorage(target);
        setIntroDone(true);
      }
    } catch {
      // ignore
    }
    return () => {
      if (introRafRef.current) cancelAnimationFrame(introRafRef.current);
    };
  }, [realCount, saveToStorage]);

  useEffect(() => {
    if (!introDone) return;
    setDisplayCount(prev => {
      const next = Math.max(prev, realCount);
      if (next !== prev) {
        animateChange();
        saveToStorage(next);
      }
      return next;
    });
  }, [realCount, introDone, animateChange, saveToStorage]);

  useEffect(() => {
    const schedule = () => {
      const delay = 15000 + Math.random() * 15000;
      driftTimeoutRef.current = setTimeout(() => {
        setDisplayCount(prev => {
          const increment = Math.random() > 0.5 ? 2 : 1;
          const next = prev + increment;
          animateChange();
          saveToStorage(next);
          return next;
        });
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (driftTimeoutRef.current) clearTimeout(driftTimeoutRef.current);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    };
  }, [animateChange, saveToStorage]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`font-mono text-6xl md:text-8xl lg:text-9xl font-light tracking-tight text-white transition-all duration-300 ${isAnimating ? 'scale-105 opacity-100' : 'scale-100 opacity-80'}`}
        style={{ letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}
      >
        {displayCount.toLocaleString()}
      </span>
      <span className="overline text-[#666666] mt-2">joined the waitlist</span>
    </div>
  );
}

function AnimatedWord() {
  const phrases: string[] = [
    "meet the right people, faster",
    "turn mutuals into friends",
    "stop networking. start connecting.",
    "the social layer for real life",
    "your people, already nearby",
    "find the friend of a friend",
    "make intros that actually land",
    "connections with context",
    "know how you're connected",
    "build your inner circle",
    "discover your next cofounder",
    "find your next roommate",
    "find your next study group",
    "meet people who match your taste",
    "IRL > online",
    "social discovery, rebuilt",
    "your network, organized",
    "your OS for social life",
    "social graphs you can use",
    "meet beyond your bubble",
    "your social home base",
    "the fastest way to belong",
    "less scrolling, more living",
    "meet people worth meeting",
    "discover the hidden connectors",
    "the CRM for your social life",
    "turn names into relationships",
    "see who's actually close",
    "find people you'd vibe with",
    "your network, in HD",
    "mutuals with meaning",
    "meet through shared obsessions",
    "context turns strangers into friends",
    "the easiest way to expand circles",
    "find your people",
    "see how mutuals are connected",
    "unlock warm introductions",
    "start with what matters",
    "real connections, no grind",
    "never forget a face again",
    "connect across campuses",
    "build meaningful connections",
    "new connections, every week",
    "your social graph, visualized",
    "meet people before you meet them",
    "social discovery without cringe",
    "depth is the new clout",
    "curated proximity",
    "traverse dynamic social graphs",
    "the network effect, for you",
    "your second brain for people",
    "friends of friends, instantly",
    "your next opportunity is a person",
    "your network, now actionable",
    "privacy-first by design",
    "the first social designed for real life",
    "deepen your conversations",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % phrases.length);
        setIsFadingOut(false);
      }, 550);
    }, 3500);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const currentPhrase = phrases[currentIndex];

  return (
    <div
      className="relative flex items-center justify-center text-center min-h-[3rem] md:min-h-[4rem] px-4"
      style={{ width: 'min(90vw, 700px)' }}
    >
      <span
        className="inline-block font-display font-medium transition-opacity duration-500 ease-out text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight tracking-tight"
        style={{
          opacity: isFadingOut ? 0 : 1,
          color: '#ffffff',
          willChange: 'opacity',
          transform: 'translateZ(0)',
          letterSpacing: '-0.02em',
        }}
      >
        {currentPhrase}
      </span>
    </div>
  );
}

function LandingPageContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [showYouTubeWarning, setShowYouTubeWarning] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleLogoDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      router.push('/auth');
    }
    lastTapRef.current = now;
  }, [router]);

  useEffect(() => {
    if (searchParams.get('youtube_required') === 'true') {
      setShowYouTubeWarning(true);
      window.history.replaceState({}, '', '/');
    }

    const campaign = searchParams.get('campaign') || searchParams.get('source') || searchParams.get('utm_source');
    const school = searchParams.get('school');

    if (campaign && typeof window !== 'undefined') {
      localStorage.setItem('marketing_campaign_code', campaign);
    }

    if (school && typeof window !== 'undefined') {
      localStorage.setItem('marketing_campaign_school', school);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const supabase = createClient();
        const [waitlistResult, profilesResult] = await Promise.all([
          supabase.from('waitlist').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true })
        ]);

        const waitlistCount = waitlistResult.count || 0;
        const profilesCount = profilesResult.count || 0;
        setTotalUsers(waitlistCount + profilesCount);
      } catch (error) {
        console.error('Error fetching total users:', error);
      }
    };

    fetchTotalUsers();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push('/network');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || loading || user) return;
    if (localStorage.getItem('waitlist_signed_up_email')) {
      setIsWaitlistModalOpen(true);
    }
  }, [loading, user]);

  if (loading || user) return null;

  return (
    <main className="bg-black">

      {/* ================================================================
          HERO SECTION — Full viewport, editorial dark canvas
          ================================================================ */}
      <section className="relative h-100svh overflow-hidden bg-black">

        <ConstellationSphere theme="dark" />

        {/* Top bar — brand name + overline info */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-5 pt-6 md:px-10 md:pt-8">
          <div>
            <h1
              className="font-brand text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-none"
              style={{ letterSpacing: '-0.03em' }}
            >
              THE<br />NETWORK.
            </h1>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 pt-1">
            <span className="overline">social discovery</span>
            <span className="overline">designed for real life</span>
          </div>
        </header>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-8 text-center px-4">
            <AnimatedWord />

            <p
              className="text-sm md:text-base font-normal max-w-md mx-auto leading-relaxed animate-fade-in-up opacity-0"
              style={{
                animationDelay: '0.3s',
                color: '#A0A0A0',
              }}
            >
              The shortest path to the right people:<br />a social network designed for real life.
            </p>

            <div className="flex flex-col items-center gap-4 mt-2">
              <button
                onClick={() => setIsWaitlistModalOpen(true)}
                className="px-8 py-3.5 sm:px-10 sm:py-4 text-sm sm:text-base font-semibold tracking-wide cursor-pointer
                           bg-white text-black hover:opacity-85 active:scale-[0.98]
                           transition-all duration-200"
                style={{ letterSpacing: '0.02em' }}
              >
                Join The Network
              </button>
            </div>

            {showYouTubeWarning && (
              <div className="mt-4 max-w-md mx-auto animate-fade-in-up">
                <div className="px-4 py-3 border border-[#EF4444]/30 bg-[#EF4444]/10">
                  <p className="text-sm font-medium text-[#EF4444]">
                    Oops! Looks like you forgot to tick the YouTube permissions checkbox during sign-in. Please try again and make sure to grant access!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-pulse-slow">
          <div className="w-[1px] h-8 bg-gradient-to-b from-transparent to-white/30" />
        </div>
      </section>

      {/* ================================================================
          SIGNAL INTELLIGENCE — Value proposition
          ================================================================ */}
      <section className="relative min-h-screen flex items-center bg-black overflow-hidden">
        {/* Subtle ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 py-24">
          <p
            className="font-display text-2xl md:text-4xl lg:text-5xl xl:text-6xl leading-tight font-medium text-white tracking-tight max-w-5xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            From who you are, we turn your signals into the connections
            that finally place you in the right community.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <div className="h-[1px] w-16 bg-white/20" />
            <span className="overline">signal intelligence</span>
          </div>
        </div>
      </section>

      {/* ================================================================
          3D SPLINE — Immersive interactive visualization
          ================================================================ */}
      <section className="relative h-screen bg-black overflow-hidden" style={{ touchAction: 'pan-y' }}>
        {/* Spline 3D scene — scaled up & shifted to center the crystal, hiding scene text */}
        <div
          className="absolute z-0"
          style={{
            top: '-20%',
            left: '-20%',
            width: '140%',
            height: '140%',
          }}
        >
          <iframe
            src="https://my.spline.design/ticktockinteractivelanding-jnoiMLvNHVsT06I0IhOQImfb/"
            style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
            allow="autoplay; fullscreen"
            loading="lazy"
          />
        </div>

        {/* Edge vignette to mask Spline's native text */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: `
              linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.85) 100%)
            `,
          }}
        />

        {/* "Join the Waitlist" clickable overlay — pointer-events pass through to iframe except on button */}
        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-6 pointer-events-none">
          <button
            onClick={() => setIsWaitlistModalOpen(true)}
            className="bg-transparent border-none cursor-pointer p-0 group pointer-events-auto"
          >
            <h2
              className="font-display font-bold text-white text-center transition-opacity duration-200 group-hover:opacity-80"
              style={{
                fontSize: 'clamp(2.5rem, 10vw, 8rem)',
                letterSpacing: '-0.04em',
                lineHeight: 0.9,
              }}
            >
              JOIN THE<br />WAITLIST
            </h2>
          </button>
        </div>

        {/* Bottom gradient: Spline scene fading into black site */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none"
          style={{
            height: '40%',
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.85) 60%, #000000 100%)',
          }}
        />

        {/* Top gradient: black site fading into Spline scene */}
        <div
          className="absolute top-0 left-0 right-0 z-[3] pointer-events-none"
          style={{
            height: '25%',
            background: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 40%, #000000 100%)',
          }}
        />

        {/* Footer links pinned to bottom */}
        <div className="absolute bottom-6 left-0 right-0 z-[60] flex items-center justify-center gap-6 pointer-events-auto">
          <Link href="/privacy-policy" className="text-xs text-[#666666] hover:text-white transition-colors duration-200 no-underline">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="text-xs text-[#666666] hover:text-white transition-colors duration-200 no-underline">
            Terms
          </Link>
          <Link href="/terms-of-use" className="text-xs text-[#666666] hover:text-white transition-colors duration-200 no-underline">
            Use Policy
          </Link>
        </div>
      </section>

      {/* ================================================================
          FIXED NAVIGATION — Desktop
          ================================================================ */}
      <nav className="hidden md:flex fixed bottom-0 left-0 right-0 z-50 pointer-events-none mix-blend-difference">
        <div className="flex items-center justify-between w-full pointer-events-auto px-8 pb-8">
          <InstagramFloat variant="navbar" isOnDarkBackground={true} />
          <button
            onClick={handleLogoDoubleTap}
            className="w-12 h-12 cursor-pointer bg-transparent border-none p-0"
            aria-label="Network Icon - Double tap to login"
          >
            <img
              src="/app_icon.svg"
              alt="Network Icon"
              className="w-full h-full brightness-0 invert hover:opacity-70 transition-opacity"
            />
          </button>
        </div>
      </nav>

      {/* ================================================================
          FIXED NAVIGATION — Mobile
          ================================================================ */}
      <nav className="md:hidden flex fixed bottom-0 left-0 right-0 z-50 pointer-events-none mix-blend-difference">
        <div className="flex items-center justify-between w-full pointer-events-auto px-4 pb-4">
          <InstagramFloat variant="navbar" isOnDarkBackground={true} />
          <button
            onClick={handleLogoDoubleTap}
            className="w-10 h-10 cursor-pointer bg-transparent border-none p-0"
            aria-label="Network Icon - Double tap to login"
          >
            <img
              src="/app_icon.svg"
              alt="Network Icon"
              className="w-full h-full brightness-0 invert hover:opacity-70 transition-opacity"
            />
          </button>
        </div>
      </nav>

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LandingPageContent />
    </Suspense>
  );
}
