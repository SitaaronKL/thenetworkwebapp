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

// Animated Phrase Switcher Component
function AnimatedWord({ isDark = false }: { isDark?: boolean }) {
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
    "friends, but smarter",
    "IRL > online",
    "social discovery, rebuilt",
    "your network, organized",
    "your social cheat code",
    "your OS for social life",
    "social graphs you can use",
    "meet beyond your bubble",
    "community, on autopilot",
    "your social home base",
    "the fastest way to belong",
    "go from \"we should hang\" to plans",
    "less scrolling, more living",
    "meet people worth meeting",
    "discover the hidden connectors",
    "track friendships like a pro",
    "the CRM for your social life",
    "turn names into relationships",
    "see who's actually close",
    "find people you'd vibe with",
    "upgrade your social luck",
    "your network, in HD",
    "mutuals with meaning",
    "meet through shared obsessions",
    "make every intro personal",
    "context turns strangers into friends",
    "the easiest way to expand circles",
    "meet people by what you love",
    "find your niche on campus",
    "discover every sub-community",
    "find your people",
    "see how mutuals are connected",
    "unlock warm introductions",
    "the anti-awkward app",
    "skip \"what's your major?\"",
    "start with what matters",
    "real connections, no grind",
    "your social life GPS",
    "never forget a face again",
    "remember who introduced you",
    "track who's who in life",
    "connect across campuses",
    "build meaningful connections",
    "\"wait, you know them too?\"",
    "the cleanest way to network",
    "build social momentum",
    "meet people, consistently",
    "new connections, every week",
    "your social graph, visualized",
    "see the rooms you should be in",
    "meet people before you meet them",
    "social discovery without cringe",
    "the smart way to socialize",
    "depth is the new clout",
    "curated proximity",
    "traverse dynamic social graphs",
    "never forget how you knew someone",
    "the network effect, for you",
    "your second brain for people",
    "relationships, searchable",
    "find the bridge between circles",
    "make your network legible",
    "friends of friends, instantly",
    "unlock the \"who should I meet?\"",
    "meet the top 1% of your campus",
    "your next opportunity is a person",
    "your network, now actionable",
    "uncover campus communities",
    "keep track of who you know",
    "never forget you know someone",
    "discover shared interests",
    "more user data, greater depth",
    "privacy-first by design",
    "the first social designed for real life",
    "never lose anyone",
    "deepen your conversations",
    "built on shared social networks",
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
      className="relative flex items-center justify-center text-center min-h-[4rem] md:min-h-[5rem] px-4"
      style={{ width: 'min(90vw, 800px)' }}
    >
      <span
        className="inline-block font-semibold transition-opacity duration-500 ease-out text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight"
        style={{
          opacity: isFadingOut ? 0 : 1,
          color: isDark ? '#000000' : '#ffffff',
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
      >
        {currentPhrase}
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

function LandingPageContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const transitionSectionRef = useRef<HTMLElement>(null);
  const gallerySectionRef = useRef<HTMLElement>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [showYouTubeWarning, setShowYouTubeWarning] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);

  // Double-tap handler for hidden login access via logo
  const handleLogoDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - trigger login
      signInWithGoogle();
    }
    lastTapRef.current = now;
  }, [signInWithGoogle]);

  // Check for YouTube permission warning from redirect
  useEffect(() => {
    if (searchParams.get('youtube_required') === 'true') {
      setShowYouTubeWarning(true);
      // Clear the URL parameter without reload
      window.history.replaceState({}, '', '/');
    }

    // Campaign / Source Tracking
    const campaign = searchParams.get('campaign') || searchParams.get('source') || searchParams.get('utm_source');
    const school = searchParams.get('school');
    
    if (campaign && typeof window !== 'undefined') {
      localStorage.setItem('marketing_campaign_code', campaign);
    }
    
    if (school && typeof window !== 'undefined') {
      localStorage.setItem('marketing_campaign_school', school);
    }
  }, [searchParams]);

  // Fetch total users count (waitlist + profiles)
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
  // === SCROLL Y TRACKER (uncomment to debug scroll positions) ===
  // const [scrollY, setScrollY] = useState(0);

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

    // Clean up any leftover style filters (landing page has its own theme handling)
    document.documentElement.style.filter = '';
    document.documentElement.classList.remove('theme-light');
  }, [theme, mounted]);

  // === SCROLL Y TRACKER useEffect (uncomment along with state above to enable) ===
  // useEffect(() => {
  //   const handleScrollTracker = () => {
  //     setScrollY(window.scrollY);
  //   };
  //   window.addEventListener('scroll', handleScrollTracker);
  //   return () => window.removeEventListener('scroll', handleScrollTracker);
  // }, []);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (!loading && user) {
      router.push('/network');
    }
  }, [user, loading, router]);

  // If this browser has already signed up for the waitlist, auto-open the referral modal
  useEffect(() => {
    if (typeof window === 'undefined' || loading || user) return;
    if (localStorage.getItem('waitlist_signed_up_email')) {
      setIsWaitlistModalOpen(true);
    }
  }, [loading, user]);

  // Checkerboard transition scroll handler - COMMENTED OUT
  // useEffect(() => {
  //   const handleScroll = () => {
  //     const section = transitionSectionRef.current;
  //     if (!section) return;

  //     const rect = section.getBoundingClientRect();
  //     const windowHeight = window.innerHeight;
  //     const scrollProgress = Math.max(0, Math.min(1, 1 - (rect.top / windowHeight)));

  //     const stages = [
  //       '.transition-stage-1', '.transition-stage-2', '.transition-stage-3',
  //       '.transition-stage-4', '.transition-stage-5', '.transition-stage-6',
  //       '.transition-stage-7', '.transition-stage-8'
  //     ];

  //     const stageWidth = 1 / stages.length;

  //     stages.forEach((selector, index) => {
  //       const stage = section.querySelector(selector) as HTMLElement;
  //       if (!stage) return;

  //       const start = index * stageWidth;
  //       const end = (index + 1) * stageWidth;

  //       if (scrollProgress < start) {
  //         stage.style.opacity = '0';
  //       } else if (scrollProgress < end) {
  //         const progress = (scrollProgress - start) / stageWidth;
  //         stage.style.opacity = String(progress);
  //         // Also fade out previous stage
  //         if (index > 0) {
  //           const prevStage = section.querySelector(stages[index - 1]) as HTMLElement;
  //           if (prevStage) prevStage.style.opacity = String(1 - progress);
  //         }
  //       } else {
  //         stage.style.opacity = index === stages.length - 1 ? '1' : '0';
  //       }
  //     });
  //   };

  //   window.addEventListener('scroll', handleScroll);
  //   handleScroll();
  //   return () => window.removeEventListener('scroll', handleScroll);
  // }, []);

  // Gallery section visibility observer and scroll handler (desktop only) - COMMENTED OUT
  // useEffect(() => {
  //   if (typeof window !== 'undefined' && window.innerWidth <= 768) return;

  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       entries.forEach((entry) => {
  //         if (entry.isIntersecting && !galleryVisible) {
  //           setGalleryVisible(true);
  //         }
  //       });
  //     },
  //     { threshold: 0.3 }
  //   );

  //   if (gallerySectionRef.current) {
  //     observer.observe(gallerySectionRef.current);
  //   }

  //   const handleGalleryScroll = () => {
  //     const section = gallerySectionRef.current;
  //     if (!section) return;

  //     const rect = section.getBoundingClientRect();
  //     const sectionHeight = section.offsetHeight;
  //     const windowHeight = window.innerHeight;
  //     // Added offset of 300px to start animation earlier (around Y: 1400 instead of 1687)
  //     const earlyStartOffset = 300;
  //     const scrollProgress = Math.max(0, Math.min(1, (-rect.top + earlyStartOffset) / (sectionHeight - windowHeight)));

  //     const scrollContainer = section.querySelector('.gallery-scroll-container') as HTMLElement;
  //     const textContainer = section.querySelector('.gallery-text-container') as HTMLElement;

  //     if (scrollContainer && textContainer) {
  //       if (scrollProgress < 0.3) {
  //         scrollContainer.style.transform = 'translateX(0)';
  //         textContainer.style.transform = 'translateX(0)';
  //       } else {
  //         const adjustedProgress = (scrollProgress - 0.3) / 0.7;
  //         const maxScroll = scrollContainer.scrollWidth - window.innerWidth;
  //         const horizontalOffset = adjustedProgress * maxScroll * 1.3;

  //         scrollContainer.style.transform = `translateX(-${horizontalOffset}px)`;
  //         textContainer.style.transform = `translateX(-${horizontalOffset}px)`;
  //       }
  //     }
  //   };

  //   window.addEventListener('scroll', handleGalleryScroll);
  //   handleGalleryScroll();

  //   return () => {
  //     if (gallerySectionRef.current) {
  //       observer.unobserve(gallerySectionRef.current);
  //     }
  //     window.removeEventListener('scroll', handleGalleryScroll);
  //   };
  // }, [galleryVisible]);

  if (loading || user) return null;

  const signalHeading = (
    <>
      SHAPED BY YOUR <span className="border-b-[3px] border-black pb-2 inline-block sm:inline">SIGNALS.</span>
    </>
  );

  return (
    <main style={{ backgroundColor: '#ffffff' }}>
      {/* === SCROLL Y TRACKER UI (uncomment along with state + useEffect to enable) ===
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-500 text-white px-4 py-2 rounded-full font-mono text-lg font-bold shadow-lg">
        Y: {Math.round(scrollY)}
      </div>
      */}

      {/* Initial Landing Section - Full Screen */}
      <section className="relative h-100svh overflow-hidden transition-colors duration-500 bg-black">

        <ConstellationSphere theme="dark" />

        {/* Top Left - THE NETWORK. */}
        <div className="absolute top-6 left-4 md:top-8 md:left-8 z-20">
          <h1 className="font-brand text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold transition-colors duration-500 text-white" style={{ letterSpacing: '-0.02em' }}>
            THE<br />NETWORK.
          </h1>
        </div>

        {/* Hidden Login Button - Commented out but preserved (double-tap logo to access)
        <div className="absolute top-6 right-4 md:top-8 md:right-8 z-20">
          <button
            onClick={signInWithGoogle}
            className={`font-brand text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold transition-all duration-300 cursor-pointer bg-transparent border-none hover:opacity-70 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
            style={{ letterSpacing: '-0.02em' }}
          >
            LOGIN
          </button>
        </div>
        */}

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-6 text-center px-4">
            <AnimatedWord isDark={false} />

            <p className="text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed animate-fade-in-up opacity-0 transition-colors duration-500 text-white/90" style={{ animationDelay: '0.3s' }}>
              The shortest path to the right people:<br />a social network designed for real life.
            </p>

            <div className="flex flex-col items-center gap-3 sm:gap-4 mt-4">
              <button
                onClick={() => setIsWaitlistModalOpen(true)}
                className="px-8 py-4 sm:px-10 sm:py-5 rounded-full text-lg sm:text-xl font-semibold transition-all duration-300 shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer bg-white text-black hover:bg-gray-100"
              >
                Join The Network
              </button>
            </div>

            {/* YouTube Permission Warning */}
            {showYouTubeWarning && (
              <div className="mt-6 max-w-md mx-auto animate-fade-in-up">
                <div className={`px-4 py-3 rounded-xl border ${theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    YouTube access is required for the best experience. Please join the waitlist and grant YouTube permissions to continue.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Fixed Bottom Navigation - Desktop */}
      <nav className="hidden md:block fixed bottom-0 left-0 right-0 z-50 pointer-events-none mix-blend-difference">
        <div className="relative w-full h-28 pointer-events-auto">
          <div className="absolute bottom-1 left-4 z-20">
            <InstagramFloat variant="navbar" isOnDarkBackground={true} />
          </div>
          {/* Double-tap logo to access login */}
          <button 
            onClick={handleLogoDoubleTap}
            className="absolute bottom-8 right-8 z-20 w-16 h-16 cursor-pointer bg-transparent border-none p-0"
            aria-label="Network Icon - Double tap to login"
          >
            <img 
              src="/app_icon.svg" 
              alt="Network Icon" 
              className="w-full h-full brightness-0 invert hover:opacity-70 transition-opacity" 
            />
          </button>

          <div className="absolute bottom-16 left-6 right-28 z-10">
            <div className="h-[1px] bg-white"></div>
          </div>
        </div>
      </nav>

      {/* Fixed Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none mix-blend-difference">
        <div className="relative w-full pointer-events-auto px-4 pb-4">
          <div className="absolute bottom-0 left-2 z-20 translate-y-[10px]">
            <InstagramFloat variant="navbar" isOnDarkBackground={true} />
          </div>
          {/* App Icon - Double-tap to access login */}
          <button 
            onClick={handleLogoDoubleTap}
            className="absolute bottom-2 right-4 w-12 h-12 cursor-pointer z-20 bg-transparent border-none p-0"
            aria-label="Network Icon - Double tap to login"
          >
            <img 
              src="/app_icon.svg" 
              alt="Network Icon" 
              className="w-full h-full brightness-0 invert hover:opacity-70 transition-opacity" 
            />
          </button>

          {/* Horizontal Line - Cut off early for logo */}
          <div className="absolute bottom-8 left-4 right-20 z-10">
            <div className="h-[1px] bg-white"></div>
          </div>
        </div>
      </nav>

      {/* Transition Section - COMMENTED OUT */}
      {/* <section
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
      </section> */}

      {/* Gallery Section - COMMENTED OUT */}
      {/* <section ref={gallerySectionRef} className={`relative overflow-hidden hidden md:block ${theme === 'dark' ? 'bg-white' : 'bg-black'}`} style={{ minHeight: '200vh' }}>
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
      </section> */}

      {/* Signal Intelligence Section */}
      <section id="signal-intelligence" className="relative h-100svh overflow-hidden bg-white flex items-center">
        <div className="w-full px-6 md:px-12 text-left">
          <p className="text-3xl md:text-4xl lg:text-5xl leading-tight font-bold text-black tracking-tight">
            From who you are, we turn your signals <br className="md:hidden" />into the connections<br className="hidden md:block" /> that finally <br className="md:hidden" />place you in the right community.
          </p>
        </div>
      </section>

      {/* FAQ Section - COMMENTED OUT */}
      {/* <section id="faq" className={`relative overflow-hidden pt-32 pb-24 px-6 md:px-12 mt-8 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}>
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
      </section> */}

      {/* Join Us Section */}
      <section className="relative h-100svh overflow-hidden flex items-center justify-center px-6 bg-white">
        <div className="text-center">
          <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-12 leading-none text-black">JOIN US</h2>
          <button
            onClick={() => setIsWaitlistModalOpen(true)}
            className="px-10 py-5 rounded-full text-xl font-semibold transition-colors shadow-xl transform hover:scale-105 active:scale-95 cursor-pointer border-none bg-black text-white hover:bg-gray-800"
          >
            Join The Network
          </button>
        </div>
      </section>

      {/* Waitlist Modal */}
      <WaitlistModal 
        isOpen={isWaitlistModalOpen} 
        onClose={() => setIsWaitlistModalOpen(false)}
        theme={theme}
      />

    </main >
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LandingPageContent />
    </Suspense>
  );
}
