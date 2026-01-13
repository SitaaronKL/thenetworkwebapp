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

// FAQ Accordion Item Component
function FAQItem({ question, answer, isOpen, onClick }: {
  question: string;
  answer: string | React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left bg-transparent border-none cursor-pointer group"
      >
        <span className="text-lg md:text-xl font-semibold text-black pr-8 group-hover:text-gray-700 transition-colors">
          {question}
        </span>
        <span
          className={`text-2xl text-black transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}
      >
        <div className="text-base md:text-lg text-gray-700 leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

// --- Main Landing Page Component ---

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const transitionSectionRef = useRef<HTMLElement>(null);
  const gallerySectionRef = useRef<HTMLElement>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [showSignalsModal, setShowSignalsModal] = useState(false);

  const FAQ_DATA = [
    {
      question: "What is TheNetwork?",
      answer: "TheNetwork is a social networking application that helps users discover and connect with other people based on shared interests. With the user's explicit permission, the app reads YouTube subscriptions and liked videos using the YouTube Data API (read-only scope only). This data is used solely to understand user interests and to make people discovery and recommendations feel intentional rather than random."
    },
    {
      question: "What happens after I sign up?",
      answer: "After connecting your Google account, we'll analyze your YouTube activity to create your \"Digital DNA\", a unique profile of your interests, personality archetypes, and the creators who shape your worldview. You'll see a personalized summary of who you are based on your digital footprint, then you can start discovering and connecting with like-minded people."
    },
    {
      question: "Who will I meet on TheNetwork?",
      answer: "You'll meet real people who share your genuine interests, not random followers or bots. Whether you're into niche hobbies, specific creators, or broader topics, we connect you with others who truly resonate with what you care about. Think of it as finding your tribe based on what you actually watch, not just what you say you like."
    },
    {
      question: "How does TheNetwork use my YouTube data?",
      answer: "We analyze your YouTube subscriptions and liked videos to understand your genuine interests: the creators you follow, the topics you engage with. This helps us match you with people who share similar passions and curiosities. We only use read-only access, meaning we can never post, modify, or delete anything on your YouTube account."
    },
    {
      question: "Is my data shared with anyone?",
      answer: "No, your data is never sold or shared with third parties for advertising or marketing purposes. Your YouTube data is used exclusively within TheNetwork to improve your experience and help you find like-minded people. We take your privacy seriously."
    },
    {
      question: "How do you match me with other people?",
      answer: "We use your YouTube signals, specifically your subscriptions and liked videos, to build a profile of your interests. Our matching algorithm then identifies other users with overlapping interests, helping you discover people who genuinely share your passions rather than random connections."
    },
    {
      question: "Can I revoke access to my data?",
      answer: (
        <>
          Yes, absolutely. You can revoke TheNetwork's access to your YouTube data at any time through your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
            Google Account permissions
          </a>
          . You can also delete your account within the app, which will remove all your data from our systems.
        </>
      )
    },
    {
      question: "What happens if I delete my account?",
      answer: "When you delete your account, all your personal data, including any cached YouTube data, is permanently removed from our systems. Your connections and any content you've shared will also be deleted. This action cannot be undone."
    }
  ];

  const COMMUNITY_IMAGES = [
    '/Community Images/1.png',
    '/Community Images/2.png',
    '/Community Images/3.png',
    '/Community Images/46453c202eca84241474bc57055aad3d.jpeg',
    '/Community Images/839acc6269cd3937057864303f84d87e.jpeg',
    '/Community Images/89da90158f96d252627fb061a5502f46.jpeg',
    '/Community Images/b5e87c57a5bfe48c5f712da2782fdad3.jpeg',
  ];

  // Theme persistence
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme_mode');
    if (saved === 'light') {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('theme_mode', theme);

    // Apply global theme class for other components if needed, though we handle main page specifically
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Clean up any leftover style filters
    document.documentElement.style.filter = '';
    document.documentElement.classList.remove('theme-inverted');
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // If already authenticated, redirect to home
  useEffect(() => {
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

  if (loading || user) return null;

  const signalHeading = (
    <>
      SHAPED BY YOUR <span className="border-b-[3px] border-black pb-2 inline-block sm:inline">SIGNALS.</span>
    </>
  );

  return (
    <main style={{ backgroundColor: theme === 'dark' ? '#ffffff' : '#000000', paddingBottom: '80px' }}>
      <InstagramFloat />

      {/* Initial Landing Section - Full Screen */}
      <section className={`relative h-100svh overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>

        <ConstellationSphere theme={theme} />

        {/* Top Left - THE NETWORK. */}
        <div className="absolute top-8 left-8 z-20">
          <h1 className={`font-brand text-4xl sm:text-5xl md:text-6xl font-bold transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`} style={{ letterSpacing: '-0.02em' }}>
            THE<br />NETWORK.
          </h1>
          <div className={`mt-2 flex gap-4 text-xs sm:text-sm transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Top Right - Theme Toggle */}
        <div className="absolute top-8 right-8 z-50">
          <button
            onClick={toggleTheme}
            className={`w-12 h-12 flex items-center justify-center rounded-full border transition-all duration-300 cursor-pointer text-xl ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-black/5 hover:bg-black/10 border-black/10 text-black'}`}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-6 text-center px-4">
            <AnimatedWord isDark={theme === 'light'} />

            <p className={`text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed animate-fade-in-up opacity-0 transition-colors duration-500 ${theme === 'dark' ? 'text-white/90' : 'text-black/90'}`} style={{ animationDelay: '0.3s' }}>
              Most social apps optimize for watching. We're building for doing: real plans, real places, real people, starting from the interests you already reveal every day.
              <button
                onClick={() => setShowSignalsModal(true)}
                className={`ml-2 inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full border transition-all duration-200 cursor-pointer bg-transparent text-sm md:text-base font-normal -mt-10 ${theme === 'dark' ? 'border-white/30 hover:border-white/60 text-white/50 hover:text-white/80 hover:bg-white/10' : 'border-black/30 hover:border-black/60 text-black/50 hover:text-black/80 hover:bg-black/10'}`}
                aria-label="What are signals?"
                title="What are signals?"
              >
                ?
              </button>
            </p>

            <button
              onClick={() => {
                // Check if user has seen YouTube account disclaimer
                const hasSeenDisclaimer = typeof window !== 'undefined' && localStorage.getItem('youtube_account_disclaimer_acknowledged') === 'true';
                if (hasSeenDisclaimer) {
                  router.push('/consent');
                } else {
                  router.push('/youtube-account-disclaimer');
                }
              }}
              className={`mt-4 px-10 py-5 rounded-full text-xl font-semibold transition-all duration-300 shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer border-none ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              Discover My Network
            </button>
          </div>

          <button
            onClick={() => document.getElementById('checkerboard-transition')?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-32 pointer-events-auto flex flex-col items-center gap-2 animate-pulse cursor-pointer transition-opacity hover:opacity-70 bg-transparent border-none p-0"
            style={{ animationDuration: '3s' }}
          >
            <span className={`text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-500 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>Scroll to explore</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </button>
        </div>
      </section>

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none mix-blend-normal md:mix-blend-difference">
        <div className="relative w-full h-28 pointer-events-auto">
          <Link href="/privacy-policy" className="absolute bottom-8 right-8 z-20 w-16 h-16 cursor-pointer">
            <img src="/app_icon.svg" alt="Network Icon" className={`w-full h-full md:brightness-0 md:invert hover:opacity-70 transition-opacity ${theme === 'dark' ? 'text-black' : 'text-white filter invert'}`} />
          </Link>

          <div className="absolute bottom-16 left-6 right-28 z-10">
            <div className={`h-[1px] md:bg-white opacity-70 md:opacity-30 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}></div>
          </div>

          <div className="absolute bottom-4 left-6 z-20 flex gap-8">
            <Link
              href="/privacy-policy"
              className={`text-xs font-ui md:text-white hover:opacity-70 transition-opacity ${theme === 'dark' ? 'text-black' : 'text-white'}`}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className={`text-xs font-ui md:text-white hover:opacity-70 transition-opacity ${theme === 'dark' ? 'text-black' : 'text-white'}`}
            >
              Terms of Service
            </Link>
          </div>

          <div className="absolute bottom-4 right-8 z-20 flex gap-8">
            <button
              onClick={() => router.push('/consent')}
              className={`text-xs font-ui md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0 ${theme === 'dark' ? 'text-black' : 'text-white'}`}
            >
              Join
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`text-xs font-ui md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0 ${theme === 'dark' ? 'text-black' : 'text-white'}`}
            >
              Home
            </button>
            <button
              onClick={() => document.getElementById('signal-intelligence')?.scrollIntoView({ behavior: 'smooth' })}
              className={`text-xs font-ui md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0 ${theme === 'dark' ? 'text-black' : 'text-white'}`}
            >
              What we do
            </button>
            <button
              onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              className={`text-xs font-ui md:text-white hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none p-0 ${theme === 'dark' ? 'text-black' : 'text-white'}`}
            >
              FAQ
            </button>
          </div>
        </div>
      </nav>

      {/* Transition Section - Only visible in Dark Mode */}
      {/* Transition Section */}
      <section
        ref={transitionSectionRef}
        className="relative min-h-screen overflow-hidden"
        id="checkerboard-transition"
        style={{ background: theme === 'dark' ? 'black' : 'white' }}
      >
        <div className="absolute inset-0 transition-stage-1" style={{ backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? 'white' : 'black'} 3px, transparent 3px)`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-2" style={{ backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? 'white' : 'black'} 8px, transparent 8px)`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-3" style={{ backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? 'white' : 'black'} 13px, transparent 13px)`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-4" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='8' width='24' height='24' rx='4' fill='${theme === 'dark' ? 'white' : 'black'}'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-5" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='4' y='4' width='32' height='32' rx='2' fill='${theme === 'dark' ? 'white' : 'black'}'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-6" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='40' height='40' rx='0' fill='${theme === 'dark' ? 'white' : 'black'}'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-7" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='-2' y='-2' width='44' height='44' fill='${theme === 'dark' ? 'white' : 'black'}'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px', opacity: 0 }} />
        <div className="absolute inset-0 transition-stage-8" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='-5' y='-5' width='50' height='50' fill='${theme === 'dark' ? 'white' : 'black'}'/%3E%3C/svg%3E")`, backgroundSize: '40px 40px', opacity: 0 }} />
      </section>

      {/* Gallery Section */}
      <section ref={gallerySectionRef} className={`relative overflow-hidden hidden md:block ${theme === 'dark' ? 'bg-white' : 'bg-black'}`} style={{ minHeight: '200vh' }}>
        <div className="sticky top-0 min-h-screen flex flex-col justify-between py-12 px-6 md:px-12 overflow-hidden" style={{ paddingTop: '80px', paddingBottom: '30px' }}>
          <div className="w-full mb-6">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-left max-w-7xl ${theme === 'dark' ? 'text-black' : 'text-white'}`}>
              We turn your feeds, starting with YouTube, into your Digital DNA; a personalized set of people, moments, and opportunities that feel just right.
            </h2>
          </div>

          <div className="flex-1 flex items-center w-full overflow-hidden">
            <div className="gallery-scroll-container flex items-center gap-6">
              {COMMUNITY_IMAGES.map((src) => (
                <div className="flex-shrink-0" style={{ width: '350px', height: '440px' }} key={src}>
                  <div className="aspect-[4/5] bg-neutral-800 rounded-2xl overflow-hidden w-full h-full">
                    <img src={src} alt="Community moment" className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full overflow-hidden mt-8">
            <div className="gallery-text-container flex items-center gap-12" style={{ whiteSpace: 'nowrap' }}>
              <h2 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight inline-block ${theme === 'dark' ? 'text-black' : 'text-white'}`} style={{ fontSize: 'clamp(3.2rem, 9.6vw, 9.6rem)' }}>
                THIS COULD BE YOU!
              </h2>
              <h2 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight inline-block ${theme === 'dark' ? 'text-black' : 'text-white'}`} style={{ fontSize: 'clamp(3.2rem, 9.6vw, 9.6rem)' }}>
                THIS COULD BE YOU!
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Gallery */}
      <section className={`px-6 py-10 space-y-8 md:hidden ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}>
        <h2 className={`text-2xl font-bold leading-tight ${theme === 'dark' ? 'text-black' : 'text-white'}`}>
          We turn your feeds, starting with YouTube, into your Digital DNA; a personalized set of people, moments, and opportunities that feel just right.
        </h2>
        <div className="overflow-x-auto flex gap-4 snap-x snap-mandatory pb-2">
          {COMMUNITY_IMAGES.map((src) => (
            <div key={`mobile-${src}`} className="rounded-3xl overflow-hidden snap-start min-w-[260px] aspect-[4/5]">
              <img src={src} alt="Community moment" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <h2 className={`text-4xl font-bold ${theme === 'dark' ? 'text-black' : 'text-white'}`}>THIS COULD BE YOU!</h2>
      </section>

      {/* Signal Intelligence Section */}
      <section id="signal-intelligence" className={`relative overflow-hidden py-24 px-6 md:px-12 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}>
        <div className="max-w-7xl mx-auto">
          <h2 className={`font-bold mb-12 leading-none ${theme === 'dark' ? 'text-black' : 'text-white'}`} style={{ fontSize: 'clamp(2rem, 8vw, 6rem)' }}>
            {signalHeading}
          </h2>
          <div className="max-w-2xl space-y-6">
            <p className={`text-xl md:text-2xl leading-relaxed font-medium ${theme === 'dark' ? 'text-black' : 'text-white'}`}>The small signals you leave behind every day.</p>
            <p className={`text-xl md:text-2xl leading-relaxed font-medium ${theme === 'dark' ? 'text-black' : 'text-white'}`}>You choose to connect YouTube, and we use your subscriptions and liked videos, read-only, to build your Digital DNA.</p>
            <p className={`text-xl md:text-2xl leading-relaxed font-medium ${theme === 'dark' ? 'text-black' : 'text-white'}`}>That's how meeting people starts to feel intentional, not random.</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className={`relative overflow-hidden pt-32 pb-24 px-6 md:px-12 mt-8 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}>
        <div className="max-w-4xl mx-auto">
          <h2 className={`font-bold mb-12 leading-none ${theme === 'dark' ? 'text-black' : 'text-white'}`} style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>
            QUESTIONS? <span className={`border-b-[3px] pb-2 inline-block sm:inline ${theme === 'dark' ? 'border-black' : 'border-white'}`}>ANSWERS.</span>
          </h2>
          <div className={`${theme === 'dark' ? 'bg-neutral-100' : 'bg-neutral-900'} rounded-2xl p-6 md:p-10`}>
            {FAQ_DATA.map((faq, index) => (
              <div key={index} className={`border-b last:border-b-0 ${theme === 'dark' ? 'border-gray-200' : 'border-gray-800'}`}>
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full py-6 flex items-center justify-between text-left bg-transparent border-none cursor-pointer group"
                >
                  <span className={`text-lg md:text-xl font-semibold pr-8 transition-colors ${theme === 'dark' ? 'text-black group-hover:text-gray-700' : 'text-white group-hover:text-gray-300'}`}>
                    {faq.question}
                  </span>
                  <span
                    className={`text-2xl transition-transform duration-300 flex-shrink-0 ${openFAQ === index ? 'rotate-45' : 'rotate-0'} ${theme === 'dark' ? 'text-black' : 'text-white'}`}
                  >
                    +
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFAQ === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}
                >
                  <div className={`text-base md:text-lg leading-relaxed ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`}>
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className={`relative min-h-screen overflow-hidden flex items-center justify-center px-6 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}>
        <div className="text-center">
          <h2 className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-12 leading-none ${theme === 'dark' ? 'text-black' : 'text-white'}`}>JOIN US</h2>
          <button
            onClick={() => router.push('/consent')}
            className={`px-10 py-5 rounded-full text-xl font-semibold transition-colors shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer border-none ${theme === 'dark' ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-200'}`}
          >
            Connect to TheNetwork
          </button>
        </div>
      </section>

      {/* Signals Explanation Modal */}
      {
        showSignalsModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
            onClick={() => setShowSignalsModal(false)}
          >
            <div
              className={`rounded-3xl p-8 max-w-lg w-[90%] relative animate-slide-up max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-white' : 'bg-neutral-900'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSignalsModal(false)}
                className={`absolute top-4 right-4 transition-colors cursor-pointer bg-transparent border-none text-2xl p-2 ${theme === 'dark' ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'}`}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-black' : 'text-white'}`}>What are signals?</h3>
              <div className={`text-lg leading-relaxed space-y-4 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`}>
                <p>
                  Your signals are the digital breadcrumbs you leave behind: the YouTube channels you subscribe to, the videos you like, the content you engage with.
                </p>
                <p>
                  From a neuroscience perspective, what you watch is what you're genuinely interested in, and that's something you can't fake. In a world where connection can feel lonely and random, we wanted to create something that makes sense for you to use and feel confident using.
                </p>
                <p>
                  We started with a small experiment with 20 friends. The success rate of finding new people who were very similar to each other was remarkably high. That small scale experiment convinced us to make this a large scale experiment, and here we are.
                </p>
                <p>
                  We use your signals to connect you with people who share what you actually care about, based on what you genuinely watch, not just what you say you like.
                </p>
              </div>
            </div>
          </div>
        )
      }
    </main >
  );
}
