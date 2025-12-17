'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';

// Helper components for visuals
const StarIcon = () => (
    <svg width="50" height="50" viewBox="0 0 51 51" fill="none">
        <path d="M25.5 0L28 18L46 25.5L28 33L25.5 51L23 33L5 25.5L23 18L25.5 0Z" fill="currentColor" />
    </svg>
);

const CirclesViz = () => (
    <div className="relative w-[300px] h-[300px]">
        {/* Simplified circles visualization */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full border-2 border-red-500 opacity-20"></div>
        <div className="absolute top-1/2 left-0 w-32 h-32 rounded-full border-2 border-red-500 opacity-20"></div>
        <div className="absolute bottom-0 right-1/4 w-20 h-20 rounded-full border-2 border-red-500 opacity-20"></div>
    </div>
);

interface Archetype {
    name: string;
    percentage: number;
}

interface Doppelganger {
    name: string;
}

const IdentityGrid = ({ archetypes = [] }: { archetypes?: Archetype[] }) => {
    // Fallback if no data
    const displayArchetypes = archetypes.length > 0 ? archetypes : [
        { name: 'Unknown', percentage: 0 },
        { name: 'Unknown', percentage: 0 },
        { name: 'Unknown', percentage: 0 },
        { name: 'Unknown', percentage: 0 },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 w-full max-w-[600px] mt-8">
            {displayArchetypes.slice(0, 4).map((arch, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-6 text-center border border-white/10 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="text-4xl font-bold mb-2">{arch.percentage}%</div>
                    <div className="text-xl">{arch.name}</div>
                </div>
            ))}
        </div>
    );
};

interface Slide {
    id: number;
    bg: 'dark' | 'light';
    content: React.ReactNode;
    type?: 'auto-advance' | 'manual';
    duration?: number;
}

export default function WrappedPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [archetypes, setArchetypes] = useState<Archetype[]>([]);
    const [doppelgangers, setDoppelgangers] = useState<Doppelganger[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Fetch Profile Data (Archetypes + Doppelgangers)
    useEffect(() => {
        if (!user) return;
        const fetchProfileData = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('profiles')
                .select('personality_archetypes, doppelgangers')
                .eq('id', user.id)
                .single();

            if (data?.personality_archetypes) {
                // @ts-ignore
                setArchetypes(data.personality_archetypes);
            }

            if (data?.doppelgangers) {
                // @ts-ignore
                setDoppelgangers(data.doppelgangers);
            }
        };
        fetchProfileData();
    }, [user]);

    const SLIDES: Slide[] = [
        // Slide 1
        {
            id: 1,
            bg: 'dark',
            content: (
                <div className="max-w-[800px] text-center">
                    <h1 className="text-[34px] md:text-[48px] font-bold leading-tight mb-4 font-display">
                        You already have a digital life.
                    </h1>
                    <p className="text-[24px] md:text-[34px] font-bold text-gray-400 font-display">
                        But right now… it's scattered everywhere.
                    </p>
                </div>
            ),
            type: 'manual'
        },
        // Slide 2
        {
            id: 2,
            bg: 'dark',
            content: (
                <div className="max-w-[800px] text-center">
                    <h1 className="text-[34px] md:text-[48px] font-bold leading-tight mb-4 font-display">
                        What if all of that added up to something?
                    </h1>
                    <p className="text-[24px] md:text-[34px] font-bold text-gray-400 font-display">
                        One profile that actually knows who you are.
                    </p>
                </div>
            ),
            type: 'manual'
        },
        // Slide 3
        {
            id: 3,
            bg: 'light',
            content: (
                <div className="max-w-[800px] text-center">
                    <h1 className="text-[34px] md:text-[48px] font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 font-display">
                        Your “Spotify Wrapped” — but for your life.
                    </h1>
                </div>
            ),
            type: 'manual'
        },
        // Slide 4 - Loading
        {
            id: 4,
            bg: 'light',
            content: (
                <div className="max-w-[800px] text-center flex flex-col items-center">
                    <div className="mb-8 text-black animate-spin">
                        <StarIcon />
                    </div>
                    <h1 className="text-[34px] font-bold text-black font-display">
                        Reading your signals…
                    </h1>
                </div>
            ),
            type: 'auto-advance',
            duration: 2000
        },
        // Slide 5 - Loading
        {
            id: 5,
            bg: 'dark',
            content: (
                <div className="max-w-[800px] text-center flex flex-col items-center">
                    <div className="mb-8 text-white animate-spin">
                        <StarIcon />
                    </div>
                    <h1 className="text-[34px] font-bold text-white font-display">
                        Clustering your obsessions…
                    </h1>
                </div>
            ),
            type: 'auto-advance',
            duration: 2000
        },
        // Slide 6 - Identity Map
        {
            id: 6,
            bg: 'light',
            content: (
                <div className="max-w-[1000px] text-center flex flex-col items-center">
                    <h1 className="text-[34px] md:text-[48px] font-bold text-black mb-12 font-display">
                        You don't fit in one box. So we gave you four.
                    </h1>
                    <IdentityGrid archetypes={archetypes} />
                </div>
            ),
            type: 'manual'
        },
        // Slide 7 - Age
        {
            id: 7,
            bg: 'dark',
            content: (
                <div className="max-w-[800px] text-center">
                    <h1 className="text-[34px] font-bold text-white mb-4 font-display">
                        We don't care how old you are.
                    </h1>
                    <p className="text-[24px] text-gray-400 font-display">
                        Age is just one tiny datapoint in your Digital DNA.
                        <br />
                        What actually matters: what you build, what you binge, and what you're obsessed with.
                    </p>
                </div>
            ),
            type: 'manual'
        },
        // Slide 8 - Doppelgangers
        {
            id: 8,
            bg: 'dark',
            content: (
                <div className="max-w-[1000px] text-center flex flex-col items-center">
                    <h1 className="text-[34px] font-bold text-white mb-4 font-display">
                        Your Digital Doppelgängers
                    </h1>
                    <p className="text-[24px] text-gray-400 mb-8 font-display">
                        Your Digital DNA is 87% similar to:
                    </p>
                    <div className="text-[24px] font-bold text-white space-y-2 font-display min-h-[120px]">
                        {doppelgangers.length > 0 ? (
                            doppelgangers.map((d, i) => (
                                <p key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                    {d.name}
                                </p>
                            ))
                        ) : (
                            // Fallback if loading or empty
                            <>
                                <p>Finding similar profiles...</p>
                            </>
                        )}
                    </div>
                    <div className="mt-12">
                        <CirclesViz />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 9 - Final
        {
            id: 9,
            bg: 'light',
            content: (
                <div className="max-w-[800px] text-center flex flex-col items-center">
                    <h1 className="text-[48px] font-bold text-black mb-8 font-display">
                        Welcome to The Network
                    </h1>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push('/');
                        }}
                        className="bg-black text-white text-[24px] font-bold py-4 px-12 rounded-full hover:scale-105 transition-transform font-display cursor-pointer"
                    >
                        Enter Your Network
                    </button>
                </div>
            ),
            type: 'manual'
        }
    ];

    // Auto-advance logic
    useEffect(() => {
        const slide = SLIDES[currentSlideIndex];
        if (slide?.type === 'auto-advance') {
            const timer = setTimeout(() => {
                handleNext();
            }, slide.duration || 3000);
            return () => clearTimeout(timer);
        }
    }, [currentSlideIndex]);

    const handleNext = () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            router.push('/');
        }
    };

    if (loading) return null;

    const currentSlide = SLIDES[currentSlideIndex];

    return (
        <div
            className={`min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${currentSlide.bg === 'dark' ? 'bg-[#252525] text-white' : 'bg-[#f4f3ee] text-black'
                }`}
            onClick={currentSlide.type === 'manual' ? handleNext : undefined}
        >
            {/* Content */}
            <div className="z-10 px-4 w-full flex justify-center animate-fade-in">
                {currentSlide.content}
            </div>

            {/* Tap Indicator */}
            {currentSlide.type === 'manual' && currentSlideIndex < SLIDES.length - 1 && (
                <div className="absolute bottom-8 text-sm opacity-50 animate-bounce font-display">
                    Tap to continue
                </div>
            )}

            {/* Navigation Dots */}
            <div className="absolute bottom-8 right-8 z-20 flex gap-2">
                {SLIDES.map((_, idx) => (
                    <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === currentSlideIndex
                                ? (currentSlide.bg === 'dark' ? 'bg-white' : 'bg-black')
                                : 'bg-gray-400'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
