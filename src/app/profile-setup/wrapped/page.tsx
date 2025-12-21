'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import Image from 'next/image';

// Helper components for visuals
const StarFourPoint = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
    </svg>
);

const DoppelgangerCircles = () => (
    <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden pointer-events-none">
        {/* Circle Group 1 - Top Right */}
        <div className="absolute right-10 top-[10%] w-[120px] h-[120px] rounded-full border border-[#FF4D4D]" />
        <div className="absolute right-[55px] top-[12%] w-[90px] h-[90px] rounded-full border border-[#FF4D4D]" />

        {/* Circle Group 2 - Middle Right (High) */}
        <div className="absolute right-[180px] top-[25%] w-[120px] h-[120px] rounded-full border border-[#FF4D4D]" />
        <div className="absolute right-[195px] top-[27%] w-[90px] h-[90px] rounded-full border border-[#FF4D4D]" />

        {/* Circle Group 3 - Middle Right (Low) */}
        <div className="absolute right-10 top-[40%] w-[120px] h-[120px] rounded-full border border-[#FF4D4D]" />
        <div className="absolute right-[55px] top-[42%] w-[90px] h-[90px] rounded-full border border-[#FF4D4D]" />

        {/* Circle Group 4 - Bottom Right (High) */}
        <div className="absolute right-[180px] top-[55%] w-[120px] h-[120px] rounded-full border border-[#FF4D4D]" />
        <div className="absolute right-[195px] top-[57%] w-[90px] h-[90px] rounded-full border border-[#FF4D4D]" />

        {/* Circle Group 5 - Bottom Right (Low) */}
        <div className="absolute right-10 top-[70%] w-[120px] h-[120px] rounded-full border border-[#FF4D4D]" />
        <div className="absolute right-[55px] top-[72%] w-[90px] h-[90px] rounded-full border border-[#FF4D4D]" />
    </div>
);

interface Archetype {
    name: string;
    percentage: number;
    color?: string; // Add color support
}

interface Doppelganger {
    name: string;
}

const IdentityLine = ({ archetypes = [] }: { archetypes?: Archetype[] }) => {
    // Fallback if no data
    const displayArchetypes = archetypes.length > 0 ? archetypes : [
        { name: 'Builder', percentage: 32 },
        { name: 'Night Owl', percentage: 24 },
        { name: 'Tech Optimist', percentage: 19 },
        { name: 'Chaos Gremlin', percentage: 25 },
    ];

    // Colors for the 4 slots
    const colors = [
        'text-[#D4AF37]', // Gold
        'text-[#9F9FFF]', // Periwinkle
        'text-[#4ADE80]', // Green
        'text-[#FF6B6B]', // Red
    ];

    return (
        <div className="flex flex-wrap justify-center items-center gap-x-2 w-full max-w-[900px] mt-8 text-[28px] md:text-[34px] font-bold font-display leading-tight tracking-tight">
            {displayArchetypes.slice(0, 4).map((arch, i) => (
                <span key={i} className={`${colors[i % colors.length]}`}>
                    {arch.percentage}% {arch.name}{i < 3 ? '.' : ''}
                </span>
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
    const [processingStatus, setProcessingStatus] = useState<{
        interests: boolean;
        hierarchicalInterests: boolean;
        dnaV2: boolean;
        isNewUser: boolean;
    }>({
        interests: false,
        hierarchicalInterests: false,
        dnaV2: false,
        isNewUser: false
    });
    const hasStartedProcessing = useRef(false);
    const processingComplete = useRef(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Check if user needs processing and fetch profile data
    useEffect(() => {
        if (!user) return;
        const checkAndProcess = async () => {
            const supabase = createClient();
            
            // Check existing profile data
            const { data: profile } = await supabase
                .from('profiles')
                .select('interests, hierarchical_interests, personality_archetypes, doppelgangers')
                .eq('id', user.id)
                .single();

            const interests = (profile?.interests as string[]) || [];
            const hierarchicalInterests = (profile?.hierarchical_interests as any[]) || [];
            // @ts-ignore
            const hasArchetypes = profile?.personality_archetypes && profile.personality_archetypes.length > 0;
            // @ts-ignore
            const hasDoppelgangers = profile?.doppelgangers && profile.doppelgangers.length > 0;

            // Check DNA v2 status
            const { data: dnaV2 } = await supabase
                .from('digital_dna_v2')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const hasInterests = interests.length > 0;
            const hasHierarchical = hierarchicalInterests.length > 0;
            const hasDnaV2 = !!dnaV2;

            // Determine if this is a new user (needs processing)
            const isNewUser = !hasInterests || !hasHierarchical || !hasDnaV2;

            setProcessingStatus({
                interests: hasInterests,
                hierarchicalInterests: hasHierarchical,
                dnaV2: hasDnaV2,
                isNewUser
            });

            // Set archetypes and doppelgangers for display
            if (hasArchetypes) {
                // @ts-ignore
                setArchetypes(profile.personality_archetypes);
            }
            if (hasDoppelgangers) {
                // @ts-ignore
                setDoppelgangers(profile.doppelgangers);
            }
        };
        checkAndProcess();
    }, [user]);

    // Process user data when reaching loading slides (for new users)
    useEffect(() => {
        if (!user || !processingStatus.isNewUser || processingComplete.current) return;
        
        // Start processing when we reach the first loading slide (slide 4)
        if (currentSlideIndex === 4 && !hasStartedProcessing.current) {
            hasStartedProcessing.current = true;
            processUserData();
        }
    }, [currentSlideIndex, user, processingStatus.isNewUser]);

    const processUserData = async () => {
        if (!user || processingComplete.current) return;
        
        const supabase = createClient();
        
        try {
            // Step 1: Sync YouTube data (if not already synced)
            console.log('Syncing YouTube data...');
            let hasYouTubeData = false;
            try {
                // Check if YouTube data already exists
                const { data: existingSubs } = await supabase
                    .from('youtube_subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1);
                
                const { data: existingLikes } = await supabase
                    .from('youtube_liked_videos')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1);

                hasYouTubeData = Boolean((existingSubs && existingSubs.length > 0) || (existingLikes && existingLikes.length > 0));

                // Only sync if we don't have data yet
                if (!hasYouTubeData) {
                    console.log('No YouTube data found, syncing...');
                    await YouTubeService.syncYouTubeData(user.id);
                    hasYouTubeData = true; // Assume sync succeeded
                } else {
                    console.log('YouTube data already exists, skipping sync');
                }
            } catch (syncError: any) {
                console.error('Error syncing YouTube data:', syncError);
                // Check again after error - might have partial data
                const { data: checkSubs } = await supabase
                    .from('youtube_subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1);
                const { data: checkLikes } = await supabase
                    .from('youtube_liked_videos')
                    .select('id')
                    .eq('user_id', user.id)
                    .limit(1);
                hasYouTubeData = Boolean((checkSubs && checkSubs.length > 0) || (checkLikes && checkLikes.length > 0));
            }
            
            // Step 2: Derive interests and hierarchical interests (only if we have YouTube data)
            if (hasYouTubeData) {
                console.log('Deriving interests...');
                try {
                    await YouTubeService.deriveInterests(user.id);
                } catch (deriveError: any) {
                    console.error('Error deriving interests:', deriveError);
                    // Mark as ready to continue flow even if derivation fails
                    setProcessingStatus(prev => ({ ...prev, interests: true, hierarchicalInterests: true }));
                }
            } else {
                console.log('No YouTube data available, skipping interests derivation');
                // Mark as ready since we can't derive without YouTube data
                setProcessingStatus(prev => ({ ...prev, interests: true, hierarchicalInterests: true }));
            }
            
            // Poll for interests and hierarchical interests (only if derivation was attempted)
            let interestsReady = false;
            let hierarchicalReady = false;
            let pollCount = 0;
            const maxPolls = 30; // 30 seconds max
            
            while (pollCount < maxPolls && (!interestsReady || !hierarchicalReady)) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('interests, hierarchical_interests')
                    .eq('id', user.id)
                    .single();
                
                const interests = (profile?.interests as string[]) || [];
                const hierarchical = (profile?.hierarchical_interests as any[]) || [];
                
                if (interests.length > 0) {
                    interestsReady = true;
                    setProcessingStatus(prev => ({ ...prev, interests: true }));
                }
                
                if (hierarchical.length > 0) {
                    hierarchicalReady = true;
                    setProcessingStatus(prev => ({ ...prev, hierarchicalInterests: true }));
                }
                
                // If we've been polling for a while and still nothing, mark as ready to continue
                if (pollCount >= 10 && !interestsReady && !hierarchicalReady) {
                    console.log('Polling timeout - marking interests as ready to continue flow');
                    setProcessingStatus(prev => ({ ...prev, interests: true, hierarchicalInterests: true }));
                    break;
                }
                
                if (interestsReady && hierarchicalReady) break;
                
                await new Promise(r => setTimeout(r, 1000));
                pollCount++;
            }

            // Step 3: Trigger DNA v2 computation
            console.log('Triggering DNA v2 computation...');
            const { data: ytSubs } = await supabase
                .from('youtube_subscriptions')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);
            
            const { data: ytLikes } = await supabase
                .from('youtube_liked_videos')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);

            if ((ytSubs && ytSubs.length > 0) || (ytLikes && ytLikes.length > 0)) {
                await supabase.functions.invoke('compute-dna-v2', {
                    body: {
                        user_id: user.id,
                        trigger_source: 'NEW_USER_SIGNUP'
                    }
                });

                // Poll for DNA v2 completion
                let dnaReady = false;
                pollCount = 0;
                while (pollCount < maxPolls && !dnaReady) {
                    const { data: dnaV2 } = await supabase
                        .from('digital_dna_v2')
                        .select('id')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    
                    if (dnaV2) {
                        dnaReady = true;
                        setProcessingStatus(prev => ({ ...prev, dnaV2: true }));
                        break;
                    }
                    
                    await new Promise(r => setTimeout(r, 1000));
                    pollCount++;
                }
            }

            // Refresh archetypes and doppelgangers after processing
            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('personality_archetypes, doppelgangers')
                .eq('id', user.id)
                .single();

            if (updatedProfile?.personality_archetypes) {
                // @ts-ignore
                setArchetypes(updatedProfile.personality_archetypes);
            }
            if (updatedProfile?.doppelgangers) {
                // @ts-ignore
                setDoppelgangers(updatedProfile.doppelgangers);
            }

            processingComplete.current = true;
            console.log('Processing complete!');
        } catch (error) {
            console.error('Error processing user data:', error);
            // Continue anyway - don't block the flow
            processingComplete.current = true;
        }
    };

    const SLIDES: Slide[] = [
        // Slide 1 - You already have a digital life
        {
            id: 1,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    {/* Text Content */}
                    <div className="relative z-10 max-w-[800px] text-left px-8 -translate-y-20 md:-translate-x-20">
                        <h1 className="text-[40px] md:text-[60px] font-bold text-white font-display leading-[1.1] mb-2 tracking-tight">
                            You already have a digital life.
                        </h1>
                        <p className="text-[24px] md:text-[32px] font-medium text-gray-400 font-display">
                            But right now... it's scattered everywhere.
                        </p>
                    </div>

                    {/* Floating Orbs */}
                    <div className="absolute right-[10%] bottom-0 w-[300px] h-[300px] md:w-[400px] md:h-[400px] translate-y-1/4 animate-float-slow opacity-90 pointer-events-none">
                         <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute right-[5%] top-[40%] w-[80px] h-[80px] md:w-[100px] md:h-[100px] animate-float-medium opacity-80 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute left-[50%] bottom-[20%] w-[100px] h-[100px] md:w-[120px] md:h-[120px] -translate-x-full animate-float-fast opacity-85 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>

                    {/* TN Logo */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 2 - What if all of that added up to something?
        {
            id: 2,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="relative z-10 max-w-[800px] text-left px-8 -translate-y-20 md:-translate-x-20">
                        <h1 className="text-[40px] md:text-[60px] font-bold text-white font-display leading-[1.1] mb-2 tracking-tight">
                            What if all of that added up to something?
                        </h1>
                        <p className="text-[24px] md:text-[32px] font-medium text-gray-400 font-display">
                            One profile that actually shows who you are.
                        </p>
                    </div>

                     {/* Floating Orbs - Same as Slide 1 */}
                    <div className="absolute right-[10%] bottom-0 w-[300px] h-[300px] md:w-[400px] md:h-[400px] translate-y-1/4 animate-float-slow opacity-90 pointer-events-none">
                         <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute right-[5%] top-[40%] w-[80px] h-[80px] md:w-[100px] md:h-[100px] animate-float-medium opacity-80 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute left-[50%] bottom-[20%] w-[100px] h-[100px] md:w-[120px] md:h-[120px] -translate-x-full animate-float-fast opacity-85 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>

                    {/* TN Logo */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 3 - Introducing
        {
            id: 3,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="relative z-10 max-w-[800px] text-center px-4 -translate-y-10">
                        <h1 className="text-[34px] md:text-[50px] font-bold text-white font-display leading-[1.1] mb-2 tracking-tight">
                            Introducing: Digital DNA Wrapped
                        </h1>
                        <h2 className="text-[24px] md:text-[34px] font-bold text-gray-400 font-display">
                            “Spotify Wrapped” — but for life.
                        </h2>
                    </div>

                    {/* Stars - Top Right */}
                    <div className="absolute right-[10%] top-[10%] text-white animate-pulse-slow">
                        <StarFourPoint className="w-[50px] h-[50px]" />
                    </div>
                    <div className="absolute right-[5%] top-[5%] text-gray-300 animate-pulse-medium delay-100">
                        <StarFourPoint className="w-[60px] h-[60px]" />
                    </div>
                     <div className="absolute right-[12%] top-[18%] text-gray-500 animate-pulse-fast delay-200">
                        <StarFourPoint className="w-[40px] h-[40px]" />
                    </div>

                    {/* TN Logo - White */}
                    <div className="absolute left-10 bottom-10 w-[80px] h-[60px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 4 - Loading Part 1 (Reading Signals - Light)
        {
            id: 4,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <h1 className="text-[34px] font-bold text-white font-display mb-8">
                        Reading your signals...
                    </h1>
                    {/* Star - Top Left of Center */}
                    <div className="absolute left-[40%] top-[35%] text-white animate-pulse-slow">
                        <StarFourPoint className="w-8 h-8" />
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'auto-advance',
            duration: 1500 // Base duration, will be adjusted dynamically
        },
        // Slide 5 - Loading Part 2 (Clustering - Dark)
        {
            id: 5,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <h1 className="text-[34px] font-bold text-white font-display mb-8">
                        Clustering your obsessions...
                    </h1>
                    {/* Star - Right */}
                    <div className="absolute right-[25%] top-[45%] text-gray-500 animate-pulse-medium">
                        <StarFourPoint className="w-12 h-12" />
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'auto-advance',
            duration: 1500 // Base duration, will be adjusted dynamically
        },
        // Slide 6 - Building your identity map... (Transition 3)
        {
            id: 6,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <h1 className="text-[34px] font-bold text-white font-display mb-8">
                        Building your identity map...
                    </h1>
                    {/* Star - Bottom Left of Center */}
                    <div className="absolute left-[35%] bottom-[40%] text-white animate-pulse-fast">
                        <StarFourPoint className="w-10 h-10" />
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'auto-advance',
            duration: 2000 // Base duration, will be adjusted dynamically
        },
        // Slide 7 - You don't fit in one box (Revamped Identity Map)
        {
            id: 7,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-start justify-center px-8 md:px-20">
                    <div 
                        className="max-w-[1000px] text-left transition-transform duration-75"
                        style={{ transform: `translate(202px, -158px)` }}
                    >
                        <h1 
                            className="font-bold text-white mb-8 font-display leading-tight tracking-tight"
                            style={{ fontSize: `45px` }}
                        >
                            You don't fit in one box. So we gave you four.
                        </h1>
                        {/* Custom Left-Aligned Identity Line Wrapper */}
                        <div 
                            className="flex flex-wrap gap-x-3 w-full font-bold font-display leading-tight tracking-tight"
                            style={{ fontSize: `25px` }}
                        >
                            {(() => {
                                // Fallback if no data
                                const displayArchetypes = archetypes.length > 0 ? archetypes : [
                                    { name: 'Builder', percentage: 32 },
                                    { name: 'Night Owl', percentage: 24 },
                                    { name: 'Tech Optimist', percentage: 19 },
                                    { name: 'Chaos Gremlin', percentage: 25 },
                                ];
                                
                                const colors = [
                                    'text-[#D4AF37]', // Gold
                                    'text-[#9F9FFF]', // Periwinkle
                                    'text-[#4ADE80]', // Green
                                    'text-[#FF6B6B]', // Red
                                ];

                                return displayArchetypes.slice(0, 4).map((arch, i) => (
                                    <span key={i} className={`${colors[i % colors.length]}`}>
                                        {arch.percentage}% {arch.name}{i < 3 ? '.' : ''}
                                    </span>
                                ));
                            })()}
                        </div>
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 8 - Doppelgangers
        {
            id: 8,
            bg: 'dark',
            content: (
                <div className="w-full h-full relative flex items-center">
                    {/* Text Content - Left Side */}
                    <div className="w-full md:w-3/4 pl-8 md:pl-80 z-10">
                        <h1 className="text-[34px] md:text-[50px] font-bold text-white mb-6 font-display leading-tight tracking-tight whitespace-nowrap">
                            Your Digital Doppelgängers
                        </h1>
                        <p className="text-[20px] md:text-[28px] font-bold text-white mb-8 font-display whitespace-nowrap">
                            Your Digital DNA is 87% similar to:
                        </p>
                        <div className="space-y-2">
                            {doppelgangers.length > 0 ? (
                                doppelgangers.map((d, i) => (
                                    <p 
                                        key={i} 
                                        className="text-[28px] md:text-[36px] font-bold text-[#b3b3b3] font-display animate-fade-in-up whitespace-nowrap" 
                                        style={{ animationDelay: `${i * 100}ms` }}
                                    >
                                        {d.name}
                                    </p>
                                ))
                            ) : (
                                // Static placeholders if no data (matching Figma)
                                <>
                                    <p className="text-[28px] md:text-[36px] font-bold text-[#b3b3b3] font-display whitespace-nowrap">Paul Graham</p>
                                    <p className="text-[28px] md:text-[36px] font-bold text-[#b3b3b3] font-display whitespace-nowrap">Emma Chamberlain</p>
                                    <p className="text-[28px] md:text-[36px] font-bold text-[#b3b3b3] font-display whitespace-nowrap">Miles Morales</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side Visuals */}
                    <DoppelgangerCircles />

                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 9 - Final
        {
            id: 9,
            bg: 'dark',
            content: (
                <div className="w-full h-full relative p-8 md:p-20">
                     <div className="max-w-[800px] text-left pt-20">
                        <h1 className="text-[40px] md:text-[60px] font-bold text-white mb-4 font-display leading-tight tracking-tight">
                            Ready to meet more people like you?
                        </h1>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                localStorage.setItem('theme_inverted', 'true');
                                router.push('/');
                            }}
                            className="text-[24px] md:text-[32px] font-bold text-white hover:opacity-70 transition-opacity font-display cursor-pointer flex items-center gap-2"
                        >
                            Continue →
                        </button>
                    </div>

                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        }
    ];

    // Auto-advance logic with dynamic timing based on processing status
    useEffect(() => {
        const slide = SLIDES[currentSlideIndex];
        if (slide?.type === 'auto-advance') {
            // Calculate dynamic duration based on processing status
            let duration = slide.duration || 3000;
            
            // For loading slides (4, 5, 6), wait for processing if new user
            if (processingStatus.isNewUser && slide.id >= 4 && slide.id <= 6) {
                // Check if we should wait for processing to complete
                if (slide.id === 4) {
                    // Slide 4: Wait for interests, but max 5 seconds
                    if (!processingStatus.interests) {
                        duration = 5000;
                    } else {
                        duration = 1500; // Fast advance if ready
                    }
                } else if (slide.id === 5) {
                    // Slide 5: Wait for hierarchical interests, but max 5 seconds
                    if (!processingStatus.hierarchicalInterests) {
                        duration = 5000;
                    } else {
                        duration = 1500; // Fast advance if ready
                    }
                } else if (slide.id === 6) {
                    // Slide 6: Wait for DNA v2, but max 8 seconds
                    if (!processingStatus.dnaV2) {
                        duration = 8000;
                    } else {
                        duration = 2000; // Fast advance if ready
                    }
                }
            }
            
            const timer = setTimeout(() => {
                handleNext();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [currentSlideIndex, processingStatus]);

    const handleNext = () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            localStorage.setItem('theme_inverted', 'true');
            router.push('/');
        }
    };

    if (loading) return null;

    const currentSlide = SLIDES[currentSlideIndex];

    return (
        <div
            className={`h-screen w-full relative overflow-hidden transition-colors duration-500 ${currentSlide.bg === 'dark' ? 'bg-[#111111] text-white' : 'bg-[#f4f3ee] text-black'
                }`}
            onClick={currentSlide.type === 'manual' ? handleNext : undefined}
        >
            {/* Content */}
            <div key={currentSlideIndex} className="absolute inset-0 z-10 w-full h-full flex justify-center items-center animate-fade-in">
                {currentSlide.content}
            </div>

            {/* Preload Critical Assets */}
            <div className="fixed w-0 h-0 overflow-hidden pointer-events-none opacity-0">
                <Image src="/assets/onboarding/tn_logo.png" alt="" width={150} height={120} priority />
                <Image src="/assets/onboarding/tn_logo_black.png" alt="" width={150} height={120} priority />
                <Image src="/assets/onboarding/bubble.png" alt="" width={400} height={400} priority />
            </div>

            {/* Tap Indicator - Moved lower and centered */}
            {currentSlide.type === 'manual' && currentSlideIndex < SLIDES.length - 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm opacity-50 animate-bounce font-display pointer-events-none">
                    Tap to continue
                </div>
            )}

            {/* Navigation Dots - Top Center */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {SLIDES.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlideIndex(idx);
                        }}
                        className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${idx === currentSlideIndex
                                ? (currentSlide.bg === 'dark' ? 'bg-white' : 'bg-black')
                                : 'bg-gray-600'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
