'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ConstellationSphere from '@/components/ConstellationSphere';
import InstagramFloat from '@/components/InstagramFloat';
import { createClient } from '@/utils/supabase/client';

// --- Helper Components from Waitlist ---

// Live Counter Component
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
    <div className="text-center mb-4">
      <div className={`text-4xl md:text-6xl font-bold text-white transition-all duration-300 ${isAnimating ? 'scale-110 opacity-100' : 'scale-100 opacity-90'}`}>
        {displayCount.toLocaleString()}
      </div>
      <p className="text-lg md:text-xl text-gray-300 mt-2">joined the waitlist</p>
    </div>
  );
}

// Animated Word Switcher Component
function AnimatedWord({ isDark = false }: { isDark?: boolean }) {
  const words: Array<{
    text: string;
    fontStyle: string;
    gradient: string | null;
    scale: string;
  }> = [
    { text: 'people', fontStyle: 'font-bold uppercase', gradient: null, scale: 'scale-x-60' },
    { text: 'friends ', fontStyle: 'font-semibold italic', gradient: null, scale: 'scale-x-95' },
    { text: 'creators', fontStyle: 'font-bold underline', gradient: null, scale: 'scale-x-95' },
    { text: 'dreamers', fontStyle: 'font-medium italic', gradient: null, scale: 'scale-x-95' },
    { text: 'thinkers', fontStyle: 'font-medium', gradient: null, scale: 'scale-x-100' },
    { text: 'leaders', fontStyle: 'font-bold underline', gradient: null, scale: 'scale-x-95' },
    { text: 'artists', fontStyle: 'font-medium italic', gradient: null, scale: 'scale-x-95' },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % words.length);
        setIsFadingOut(false);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [words.length]);

  const currentWord = words[currentIndex];

  const getGradientStyle = () => {
    if (!currentWord.gradient) return {};
    if (currentWord.gradient === 'from-blue-500 to-purple-500') {
      return { backgroundImage: 'linear-gradient(to right, #3b82f6, #a855f7)' };
    } else if (currentWord.gradient === 'from-pink-500 to-red-500') {
      return { backgroundImage: 'linear-gradient(to right, #ec4899, #ef4444)' };
    } else if (currentWord.gradient === 'from-green-500 to-teal-500') {
      return { backgroundImage: 'linear-gradient(to right, #10b981, #14b8a6)' };
    } else {
      return { backgroundImage: 'linear-gradient(to right, #f97316, #eab308)' };
    }
  };

  const hasGradient = currentWord.gradient !== null;

  return (
    <div
      className="relative flex items-center justify-center text-center h-20"
      style={{ width: 'min(20ch, 90%)' }}
    >
      <span
        className={`inline-block origin-center ${currentWord.scale} ${currentWord.fontStyle} transition-opacity duration-500 ease-out text-4xl md:text-6xl`}
        style={{
          opacity: isFadingOut ? 0 : 1,
          ...(hasGradient ? {
            ...getGradientStyle(),
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          } : {
            color: isDark ? '#000000' : '#ffffff',
          }),
        }}
      >
        {currentWord.text}
      </span>
    </div>
  );
}

// --- Main Landing Page Component ---

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const transitionSectionRef = useRef<HTMLElement>(null);
  const gallerySectionRef = useRef<HTMLElement>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);

  const COMMUNITY_IMAGES = [
    '/Community Images/1.png',
    '/Community Images/2.png',
    '/Community Images/3.png',
    '/Community Images/46453c202eca84241474bc57055aad3d.jpeg',
    '/Community Images/839acc6269cd3937057864303f84d87e.jpeg',
    '/Community Images/89da90158f96d252627fb061a5502f46.jpeg',
    '/Community Images/b5e87c57a5bfe48c5f712da2782fdad3.jpeg',
  ];

  // If already authenticated, redirect to home
  useEffect(() => {
    // Ensure theme is not inverted on landing page
    document.documentElement.style.filter = '';
    document.documentElement.style.backgroundColor = '';
    document.documentElement.classList.remove('theme-inverted');

    if (!loading && user) {
      router.push('/network');
    }
  }, [user, loading, router]);

  // Checkerboard transition scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const section = transitionSectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollProgress = Math.max(0, Math.min(1, 1 - (rect.top / windowHeight)));

      const stages = [
        '.transition-stage-1', '.transition-stage-2', '.transition-stage-3', 
        '.transition-stage-4', '.transition-stage-5', '.transition-stage-6', 
        '.transition-stage-7', '.transition-stage-8'
      ];

      const stageWidth = 1 / stages.length;
      
      stages.forEach((selector, index) => {
        const stage = section.querySelector(selector) as HTMLElement;
        if (!stage) return;

        const start = index * stageWidth;
        const end = (index + 1) * stageWidth;

        if (scrollProgress < start) {
          stage.style.opacity = '0';
        } else if (scrollProgress < end) {
          const progress = (scrollProgress - start) / stageWidth;
          stage.style.opacity = String(progress);
          // Also fade out previous stage
          if (index > 0) {
            const prevStage = section.querySelector(stages[index - 1]) as HTMLElement;
            if (prevStage) prevStage.style.opacity = String(1 - progress);
          }
        } else {
          stage.style.opacity = index === stages.length - 1 ? '1' : '0';
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Gallery section visibility observer and scroll handler (desktop only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !galleryVisible) {
            setGalleryVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (gallerySectionRef.current) {
      observer.observe(gallerySectionRef.current);
    }

    const handleGalleryScroll = () => {
      const section = gallerySectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollProgress = Math.max(0, Math.min(1, -rect.top / (sectionHeight - windowHeight)));

      const scrollContainer = section.querySelector('.gallery-scroll-container') as HTMLElement;
      const textContainer = section.querySelector('.gallery-text-container') as HTMLElement;

      if (scrollContainer && textContainer) {
        if (scrollProgress < 0.3) {
          scrollContainer.style.transform = 'translateX(0)';
          textContainer.style.transform = 'translateX(0)';
        } else {
          const adjustedProgress = (scrollProgress - 0.3) / 0.7;
          const maxScroll = scrollContainer.scrollWidth - window.innerWidth;
          const horizontalOffset = adjustedProgress * maxScroll * 1.3;

          scrollContainer.style.transform = `translateX(-${horizontalOffset}px)`;
          textContainer.style.transform = `translateX(-${horizontalOffset}px)`;
        }
      }
    };

    window.addEventListener('scroll', handleGalleryScroll);
    handleGalleryScroll();

    return () => {
      if (gallerySectionRef.current) {
        observer.unobserve(gallerySectionRef.current);
      }
      window.removeEventListener('scroll', handleGalleryScroll);
    };
  }, [galleryVisible]);

  if (loading) return null;

  const signalHeading = (
    <>
      SHAPED BY YOUR <span className="border-b-[3px] border-black pb-2 inline-block sm:inline">SIGNALS.</span>
    </>
  );

  return (
    <main style={{ backgroundColor: '#FFFFFF', paddingBottom: '80px' }}>
      <InstagramFloat />

      {/* Initial Landing Section - Full Screen */}
      <section className="relative h-100svh bg-black overflow-hidden">
        <ConstellationSphere />
        
        {/* Top Left - THE NETWORK. */}
        <div className="absolute top-8 left-8 z-20">
          <h1 className="text-white font-brand text-4xl sm:text-5xl md:text-6xl font-bold" style={{ letterSpacing: '-0.02em' }}>
            THE<br />NETWORK.
          </h1>
          <div className="mt-2 flex gap-4 text-white text-xs sm:text-sm">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-8 text-center px-4">
            <AnimatedWord />
            
            <button 
              onClick={() => router.push('/consent')}
              className="px-10 py-5 bg-white text-black rounded-full text-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer border-none"
            >
              Claim my Digital DNA
            </button>
          </div>
        </div>
      </section>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none mix-blend-normal md:mix-blend-difference">
        <div className="relative w-full h-28 pointer-events-auto">
          <Link href="/privacy-policy" className="absolute bottom-8 right-8 z-20 w-16 h-16 cursor-pointer">
            <img src="/app_icon.svg" alt="Network Icon" className="w-full h-full text-black md:brightness-0 md:invert hover:opacity-70 transition-opacity" />
          </Link>

          <div className="absolute bottom-16 left-6 right-28 z-10">
            <div className="h-[1px] bg-black md:bg-white opacity-70 md:opacity-30"></div>
          </div>
          
          <div className="absolute bottom-4 left-6 z-20 flex gap-8">
            <Link 
              href="/privacy-policy" 
              className="text-xs font-ui text-black md:text-white hover:opacity-70 transition-opacity"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms-of-service" 
              className="text-xs font-ui text-black md:text-white hover:opacity-70 transition-opacity"
            >
              Terms of Service
            </Link>
          </div>

          <div className="absolute bottom-4 right-8 z-20 flex gap-8">
            <button 
              onClick={() => router.push('/consent')} 
              className="text-xs font-ui text-black md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0"
            >
              Join
            </button>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="text-xs font-ui text-black md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0"
            >
              Home
            </button>
            <button 
              onClick={() => document.getElementById('signal-intelligence')?.scrollIntoView({ behavior: 'smooth' })} 
              className="text-xs font-ui text-black md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0"
            >
              What we do
            </button>
          </div>
        </div>
      </nav>

      {/* Transition Section */}
      <section 
        ref={transitionSectionRef}
        className="relative min-h-screen overflow-hidden"
        id="checkerboard-transition"
        style={{ background: 'black' }}
      >
        <div className="absolute inset-0 transition-stage-1" style={{ backgroundImage: 'radial-gradient(circle, white 3px, transparent 3px)', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-2" style={{ backgroundImage: 'radial-gradient(circle, white 8px, transparent 8px)', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-3" style={{ backgroundImage: 'radial-gradient(circle, white 13px, transparent 13px)', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'8\' y=\'8\' width=\'24\' height=\'24\' rx=\'4\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'4\' y=\'4\' width=\'32\' height=\'32\' rx=\'2\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-6" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0\' y=\'0\' width=\'40\' height=\'40\' rx=\'0\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-7" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'-2\' y=\'-2\' width=\'44\' height=\'44\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-8" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'-5\' y=\'-5\' width=\'50\' height=\'50\' fill=\'white\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px', opacity: 0 }} />
      </section>

      {/* Gallery Section */}
      <section ref={gallerySectionRef} className="relative bg-white overflow-hidden hidden md:block" style={{ minHeight: '200vh' }}>
        <div className="sticky top-0 min-h-screen flex flex-col justify-between py-12 px-6 md:px-12 overflow-hidden" style={{ paddingTop: '80px', paddingBottom: '30px' }}>
          <div className="w-full mb-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black leading-tight text-left max-w-7xl">
              We turn your feeds, starting with your YouTube - your digital DNA into a personalized set of people, moments, and opportunities that feel just right.
            </h2>
          </div>

          <div className="flex-1 flex items-center w-full overflow-hidden">
            <div className="gallery-scroll-container flex items-center gap-6">
              {COMMUNITY_IMAGES.map((src) => (
                <div className="flex-shrink-0" style={{ width: '350px', height: '440px' }} key={src}>
                  <div className="aspect-[4/5] bg-gray-300 rounded-2xl overflow-hidden w-full h-full">
                    <img src={src} alt="Community moment" className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full overflow-hidden mt-8">
            <div className="gallery-text-container flex items-center gap-12" style={{ whiteSpace: 'nowrap' }}>
              <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-black leading-none tracking-tight inline-block" style={{ fontSize: 'clamp(3.2rem, 9.6vw, 9.6rem)' }}>
                THIS COULD BE YOU!
              </h2>
              <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-black leading-none tracking-tight inline-block" style={{ fontSize: 'clamp(3.2rem, 9.6vw, 9.6rem)' }}>
                THIS COULD BE YOU!
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Gallery */}
      <section className="bg-white px-6 py-10 space-y-8 md:hidden">
        <h2 className="text-2xl font-bold text-black leading-tight">
          We turn your feeds, starting with your YouTube - your digital DNA into a personalized set of people, moments, and opportunities that feel just right.
        </h2>
        <div className="overflow-x-auto flex gap-4 snap-x snap-mandatory pb-2">
          {COMMUNITY_IMAGES.map((src) => (
            <div key={`mobile-${src}`} className="rounded-3xl overflow-hidden snap-start min-w-[260px] aspect-[4/5]">
              <img src={src} alt="Community moment" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <h2 className="text-4xl font-bold text-black">THIS COULD BE YOU!</h2>
      </section>

      {/* Signal Intelligence Section */}
      <section id="signal-intelligence" className="relative bg-white overflow-hidden py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-bold text-black mb-12 leading-none" style={{ fontSize: 'clamp(2rem, 8vw, 6rem)' }}>
            {signalHeading}
          </h2>
          <div className="max-w-2xl space-y-6">
            <p className="text-xl md:text-2xl text-black leading-relaxed font-medium">The small signals you leave behind every day.</p>
            <p className="text-xl md:text-2xl text-black leading-relaxed font-medium">With your permission, we read your YouTube subscriptions and liked videos — nothing more.</p>
            <p className="text-xl md:text-2xl text-black leading-relaxed font-medium">We use them to understand what you genuinely care about, so discovering people feels intentional, not random.</p>
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="relative min-h-screen bg-white overflow-hidden flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-black mb-12 leading-none">JOIN US</h2>
          <button 
            onClick={() => router.push('/consent')}
            className="px-10 py-5 bg-black text-white rounded-full text-xl font-semibold hover:bg-gray-800 transition-colors shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer border-none"
          >
            Connect to TheNetwork
          </button>
        </div>
      </section>
    </main>
  );
}
