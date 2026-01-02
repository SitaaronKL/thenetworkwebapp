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
    // YouTube-specific progress tracking
    const [youtubeStatus, setYoutubeStatus] = useState<{
        connected: boolean;
        subscriptionsCount: number;
        subscriptionsTotal: number | null;
        likedVideosCount: number;
        likedVideosTotal: number | null;
    }>({
        connected: false,
        subscriptionsCount: 0,
        subscriptionsTotal: null,
        likedVideosCount: 0,
        likedVideosTotal: null,
    });
    const hasStartedProcessing = useRef(false);
    const processingComplete = useRef(false);
    const [interests, setInterests] = useState<string[]>([]);
    const [showInterestModal, setShowInterestModal] = useState(false);
    const [actualYoutubeCounts, setActualYoutubeCounts] = useState<{
        subscriptions: number;
        likedVideos: number;
    }>({
        subscriptions: 0,
        likedVideos: 0
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Helper functions for YouTube progress tracking
    const fetchSubscriptionsWithProgress = async (accessToken: string): Promise<any[]> => {
        const all: any[] = [];
        let pageToken: string | undefined;
        let pageCount = 0;

        do {
            const result = await YouTubeService.fetchSubscriptions(accessToken, 50, pageToken);
            all.push(...result.items);
            pageToken = result.nextPageToken;
            pageCount++;
            
            // Update progress every page
            setYoutubeStatus(prev => ({ 
                ...prev, 
                subscriptionsCount: all.length,
                subscriptionsTotal: result.nextPageToken ? null : all.length // null means still loading
            }));
            
            // Small delay to show progress
            if (result.nextPageToken) {
                await new Promise(r => setTimeout(r, 300));
            }
        } while (pageToken);

        return all;
    };

    const fetchLikedVideosWithProgress = async (accessToken: string): Promise<any[]> => {
        const all: any[] = [];
        let pageToken: string | undefined;
        const maxItems = 800; // Cap at 800 as per your service

        do {
            if (all.length >= maxItems) break;
            
            const effectivePageSize = Math.min(50, maxItems - all.length);
            const result = await YouTubeService.fetchLikedVideos(accessToken, effectivePageSize, pageToken);
            all.push(...result.items);
            pageToken = result.nextPageToken;
            
            // Update progress every page
            setYoutubeStatus(prev => ({ 
                ...prev, 
                likedVideosCount: all.length,
                likedVideosTotal: result.nextPageToken ? null : all.length
            }));
            
            // Small delay to show progress
            if (result.nextPageToken && all.length < maxItems) {
                await new Promise(r => setTimeout(r, 300));
            }
        } while (pageToken && all.length < maxItems);

        return all;
    };

    // Fetch actual YouTube data counts
    useEffect(() => {
        if (!user) return;
        const fetchYoutubeCounts = async () => {
            const supabase = createClient();
            try {
                const { count: subsCount } = await supabase
                    .from('youtube_subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                
                const { count: likesCount } = await supabase
                    .from('youtube_liked_videos')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);
                
                setActualYoutubeCounts({
                    subscriptions: subsCount || 0,
                    likedVideos: likesCount || 0
                });
            } catch (error) {
                console.error('Error fetching YouTube counts:', error);
            }
        };
        fetchYoutubeCounts();
    }, [user]);

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

            // If archetypes already exist, use them and skip regeneration entirely
            // This prevents the "refresh" issue where values flash before being regenerated
            if (hasArchetypes) {
                // @ts-ignore
                setArchetypes(profile.personality_archetypes);
            }
            if (hasDoppelgangers) {
                // @ts-ignore
                setDoppelgangers(profile.doppelgangers);
            }

            // Only mark as new user if we don't have archetypes yet
            // This prevents regeneration when DNA data already exists
            const isNewUser = !hasArchetypes;

            // Set interests for the graph
            if (interests.length > 0) {
                setInterests(interests);
            }

            setProcessingStatus({
                interests: hasInterests,
                hierarchicalInterests: hasHierarchical,
                dnaV2: hasDnaV2,
                isNewUser
            });
        };
        checkAndProcess();
    }, [user]);

    // Process user data when reaching loading slides (for new users)
    useEffect(() => {
        if (!user || !processingStatus.isNewUser || processingComplete.current) return;
        
        // Start processing when we reach the first loading slide (slide 4)
        if (currentSlideIndex === 4 && !hasStartedProcessing.current) {
            hasStartedProcessing.current = true;
            processUserDataWithYouTubeProgress();
        }
    }, [currentSlideIndex, user, processingStatus.isNewUser]);

    // New function with YouTube progress tracking
    const processUserDataWithYouTubeProgress = async () => {
        if (!user || processingComplete.current) return;
        
        const supabase = createClient();
        
        try {
            // Step 1: Check YouTube connection (Slide 4)
            console.log('Checking YouTube connection...');
            const accessToken = await YouTubeService.getAccessToken();
            if (accessToken) {
                setYoutubeStatus(prev => ({ ...prev, connected: true }));
                // Small delay to show "Connected ✅"
                await new Promise(r => setTimeout(r, 1000));
            } else {
                console.warn('No YouTube access token available');
                // Continue anyway - might have data from previous sync
            }

            // Step 2: Fetch subscriptions with progress (Slide 5)
            let hasYouTubeData = false;
            try {
                // Check if YouTube data already exists
                const { data: existingSubs } = await supabase
                    .from('youtube_subscriptions')
                    .select('id')
                    .eq('user_id', user.id);
                
                const { data: existingLikes } = await supabase
                    .from('youtube_liked_videos')
                    .select('id')
                    .eq('user_id', user.id);

                const existingSubsCount = existingSubs?.length || 0;
                const existingLikesCount = existingLikes?.length || 0;
                hasYouTubeData = existingSubsCount > 0 || existingLikesCount > 0;

                // Only sync if we don't have data yet
                if (!hasYouTubeData && accessToken) {
                    console.log('No YouTube data found, syncing with progress...');
                    
                    // Fetch subscriptions with progress updates
                    const subscriptions = await fetchSubscriptionsWithProgress(accessToken);
                    setYoutubeStatus(prev => ({ 
                        ...prev, 
                        subscriptionsCount: subscriptions.length,
                        subscriptionsTotal: subscriptions.length
                    }));
                    
                    // Fetch liked videos with progress updates
                    const likedVideos = await fetchLikedVideosWithProgress(accessToken);
                    setYoutubeStatus(prev => ({ 
                        ...prev, 
                        likedVideosCount: likedVideos.length,
                        likedVideosTotal: likedVideos.length
                    }));

                    // Sync to database
                    await YouTubeService.syncSubscriptionsToSupabase(user.id, subscriptions);
                    await YouTubeService.syncLikedVideosToSupabase(user.id, likedVideos);
                    
                    hasYouTubeData = true;
                } else if (hasYouTubeData) {
                    console.log('YouTube data already exists, using existing counts');
                    setYoutubeStatus(prev => ({ 
                        ...prev, 
                        subscriptionsCount: existingSubsCount,
                        subscriptionsTotal: existingSubsCount,
                        likedVideosCount: existingLikesCount,
                        likedVideosTotal: existingLikesCount
                    }));
                }
            } catch (syncError: any) {
                console.error('Error syncing YouTube data:', syncError);
                // Check again after error - might have partial data
                const { data: checkSubs } = await supabase
                    .from('youtube_subscriptions')
                    .select('id')
                    .eq('user_id', user.id);
                const { data: checkLikes } = await supabase
                    .from('youtube_liked_videos')
                    .select('id')
                    .eq('user_id', user.id);
                const subsCount = checkSubs?.length || 0;
                const likesCount = checkLikes?.length || 0;
                hasYouTubeData = subsCount > 0 || likesCount > 0;
                setYoutubeStatus(prev => ({ 
                    ...prev, 
                    subscriptionsCount: subsCount,
                    subscriptionsTotal: subsCount,
                    likedVideosCount: likesCount,
                    likedVideosTotal: likesCount
                }));
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
                    setInterests(interests); // Update interests state for the graph
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

    // Keep old function for backward compatibility (if needed elsewhere)
    const processUserData = processUserDataWithYouTubeProgress;

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
        // Slide 4 - Connecting to YouTube
        {
            id: 4,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <h1 className="text-[34px] font-bold text-white font-display mb-8">
                        Connecting to YouTube...
                    </h1>
                    {youtubeStatus.connected && (
                        <p className="text-[22px] text-green-400 font-display mb-4">
                            Connected ✅
                        </p>
                    )}
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
            duration: 2000 // Wait for connection check
        },
        // Slide 5 - Fetching subscriptions
        {
            id: 5,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <h1 className="text-[34px] font-bold text-white font-display mb-8">
                        Fetching your subscriptions...
                    </h1>
                    {youtubeStatus.subscriptionsCount > 0 && (
                        <p className="text-[22px] text-gray-400 font-display">
                            {youtubeStatus.subscriptionsTotal !== null 
                                ? `Fetched ${youtubeStatus.subscriptionsCount} subscriptions`
                                : `Fetched ${youtubeStatus.subscriptionsCount}...`}
                        </p>
                    )}
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
            duration: 3000 // Wait for subscriptions to complete
        },
        // Slide 6 - Fetching liked videos
        {
            id: 6,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <h1 className="text-[34px] font-bold text-white font-display mb-8">
                        Fetching your liked videos...
                    </h1>
                    {youtubeStatus.likedVideosCount > 0 && (
                        <p className="text-[22px] text-gray-400 font-display">
                            {youtubeStatus.likedVideosTotal !== null 
                                ? `Fetched ${youtubeStatus.likedVideosCount} videos`
                                : `Fetched ${youtubeStatus.likedVideosCount}...`}
                        </p>
                    )}
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
            duration: 3000 // Wait for liked videos to complete
        },
        // Slide 7 - Interest Graph
        {
            id: 7,
            bg: 'dark',
            content: (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="w-full h-full flex flex-col items-center justify-center px-4">
                        <h1 className="text-[34px] font-bold text-white font-display mb-8 text-center">
                            Your Interest Graph
                        </h1>
                        <div className="w-full max-w-[900px] px-8">
                            {interests.length > 0 ? (
                                <div className="flex flex-wrap gap-4 justify-center items-center">
                                    {interests.map((interest, index) => (
                                        <span
                                            key={index}
                                            className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-white text-[18px] font-medium font-display hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full flex items-center justify-center">
                                    <p className="text-gray-400 font-display">Loading your interests...</p>
                                </div>
                            )}
                        </div>
                        {/* Question Mark Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowInterestModal(true);
                            }}
                            className="mt-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-2xl font-bold transition-all hover:scale-110"
                        >
                            ?
                        </button>
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-6 bottom-6 w-[150px] h-[120px] opacity-100 pointer-events-none">
                        <Image src="/assets/onboarding/tn_logo.png" alt="TN" fill className="object-contain" />
                    </div>
                </div>
            ),
            type: 'manual'
        },
        // Slide 8 - You don't fit in one box (Revamped Identity Map)
        {
            id: 8,
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
        // Slide 9 - Doppelgangers
        {
            id: 9,
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
        // Slide 10 - Final
        {
            id: 10,
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
                                // Check feature flag and redirect to review page if enabled
                                const reviewEnabled = process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true';
                                if (reviewEnabled) {
                                    router.push('/youtube-data-review');
                                } else {
                                    router.push('/network');
                                }
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
            
            // For YouTube slides (4, 5, 6), wait for YouTube API calls to complete
            if (processingStatus.isNewUser && slide.id >= 4 && slide.id <= 6) {
                if (slide.id === 4) {
                    // Slide 4: Wait for YouTube connection
                    if (!youtubeStatus.connected) {
                        duration = 3000; // Wait up to 3 seconds for connection
                    } else {
                        duration = 1500; // Fast advance if connected
                    }
                } else if (slide.id === 5) {
                    // Slide 5: Wait for subscriptions to be fetched
                    if (youtubeStatus.subscriptionsTotal === null && youtubeStatus.subscriptionsCount === 0) {
                        duration = 5000; // Still fetching, wait longer
                    } else if (youtubeStatus.subscriptionsTotal === null) {
                        duration = 3000; // In progress, wait a bit more
                    } else {
                        duration = 1500; // Done, fast advance
                    }
                } else if (slide.id === 6) {
                    // Slide 6: Wait for liked videos to be fetched
                    if (youtubeStatus.likedVideosTotal === null && youtubeStatus.likedVideosCount === 0) {
                        duration = 5000; // Still fetching, wait longer
                    } else if (youtubeStatus.likedVideosTotal === null) {
                        duration = 3000; // In progress, wait a bit more
                    } else {
                        duration = 2000; // Done, fast advance
                    }
                }
            } else if (slide.id >= 4 && slide.id <= 6) {
                // For existing users, still show the slides but with shorter duration
                duration = slide.duration || 2000;
            }
            
            const timer = setTimeout(() => {
                handleNext();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [currentSlideIndex, processingStatus, youtubeStatus]);

    const handleNext = () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            localStorage.setItem('theme_inverted', 'true');
            // Check feature flag and redirect to review page if enabled
            const reviewEnabled = process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true';
            if (reviewEnabled) {
                router.push('/youtube-data-review');
            } else {
                router.push('/network');
            }
        }
    };

    if (loading) return null;

    const currentSlide = SLIDES[currentSlideIndex];

    // Interest Explanation Modal Component
    const InterestExplanationModal = () => {
        if (!showInterestModal) return null;

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowInterestModal(false);
                    }
                }}
            >
                <div
                    className="relative bg-[#1a1a1a] border border-white/10 rounded-[24px] max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setShowInterestModal(false)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="p-8 md:p-12">
                        {/* Header */}
                        <h2 className="text-[32px] md:text-[40px] font-bold text-white font-display mb-6">
                            How We Use Your YouTube Data
                        </h2>

                        {/* Section 0: Why We Need YouTube API Access */}
                        <div className="mb-8 bg-[#0a0a0a] border border-white/10 rounded-[16px] p-6">
                            <h3 className="text-[24px] font-bold text-white font-display mb-4">
                                Why YouTube API Access Is Required
                            </h3>
                            <div className="space-y-4 text-gray-300 font-display text-[16px] leading-relaxed">
                                <p>
                                    <strong className="text-white">The Problem We Solve:</strong> Traditional social platforms match users based on superficial profiles, demographics, or self-reported interests. These methods fail to capture authentic intellectual passions and deep interests that drive meaningful connections.
                                </p>
                                <p>
                                    <strong className="text-white">Why YouTube Data Is Essential:</strong> YouTube viewing behavior provides the most accurate, authentic representation of a person's true interests because:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li><strong className="text-white">Subscriptions reveal recurring interests:</strong> The channels you actively subscribe to represent topics you're committed to following over time, not just casual viewing</li>
                                    <li><strong className="text-white">Liked videos show genuine engagement:</strong> Unlike passive viewing, liking a video requires active engagement, indicating genuine interest and intellectual investment in the content</li>
                                    <li><strong className="text-white">Behavioral data is more authentic than self-reports:</strong> What you actually watch and engage with reveals your true passions more accurately than what you claim to be interested in</li>
                                    <li><strong className="text-white">Volume enables pattern recognition:</strong> With {actualYoutubeCounts.subscriptions || youtubeStatus.subscriptionsTotal || youtubeStatus.subscriptionsCount || 0} subscriptions and {actualYoutubeCounts.likedVideos || youtubeStatus.likedVideosTotal || youtubeStatus.likedVideosCount || 0} liked videos, we can identify patterns and themes that would be impossible to detect with smaller datasets</li>
                                </ul>
                                <p>
                                    <strong className="text-white">Why We Need the YouTube API:</strong> This data cannot be obtained through any other means. Users cannot manually provide this information because:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Most users cannot recall all their subscriptions or liked videos</li>
                                    <li>Manual entry would be time-consuming and error-prone</li>
                                    <li>The volume of data (hundreds of subscriptions and liked videos) makes manual collection impractical</li>
                                    <li>We need historical data to identify patterns over time</li>
                                </ul>
                                <p className="mt-4 pt-4 border-t border-white/10">
                                    <strong className="text-white">Data Minimization:</strong> We request only the <code className="text-white/80 bg-white/5 px-1 rounded">youtube.readonly</code> scope, which provides the minimum access necessary. We do NOT request or use:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Video content or thumbnails</li>
                                    <li>Comments or social interactions</li>
                                    <li>Watch history (beyond liked videos)</li>
                                    <li>Playlists or other metadata</li>
                                    <li>Any write permissions</li>
                                </ul>
                                <p className="mt-4">
                                    <strong className="text-white">Conclusion:</strong> YouTube API access with the <code className="text-white/80 bg-white/5 px-1 rounded">youtube.readonly</code> scope is the only way to obtain the subscription and liked video data necessary for our interest generation and matching service. Without this API access, our service cannot function as designed.
                                </p>
                            </div>
                        </div>

                        {/* Section 1: Data Collection and Storage */}
                        <div className="mb-8">
                            <h3 className="text-[24px] font-bold text-white font-display mb-4">
                                Data Collection and Secure Storage
                            </h3>
                            <div className="space-y-4 text-gray-300 font-display text-[16px] leading-relaxed">
                                <p>
                                    When you connect your YouTube account, we collect and securely store the following data:
                                </p>
                                <ul className="list-disc list-inside space-y-3 ml-4">
                                    <li>
                                        <strong className="text-white">
                                            {actualYoutubeCounts.subscriptions || youtubeStatus.subscriptionsTotal || youtubeStatus.subscriptionsCount || 0} Subscribed Channels:
                                        </strong>{' '}
                                        We retrieve the list of channels you subscribe to via the YouTube Data API v3 (using the <code className="text-white/80 bg-white/5 px-1 rounded">youtube.readonly</code> scope). This data is stored securely in our database, including channel titles and subscription metadata. We analyze these channel subscriptions to identify recurring themes, topics, and content categories that indicate your areas of interest and passion.
                                    </li>
                                    <li>
                                        <strong className="text-white">
                                            {actualYoutubeCounts.likedVideos || youtubeStatus.likedVideosTotal || youtubeStatus.likedVideosCount || 0} Liked Videos:
                                        </strong>{' '}
                                        We retrieve your liked videos history via the YouTube Data API v3 (using the <code className="text-white/80 bg-white/5 px-1 rounded">youtube.readonly</code> scope). This includes video titles, channel information, and timestamps. This data is stored securely in our database. We examine the patterns in your liked videos to discover your content preferences, intellectual interests, and viewing behaviors that reveal your authentic passions.
                                    </li>
                                </ul>
                                <p className="mt-4">
                                    <strong className="text-white">Data Storage:</strong> All YouTube data is stored securely in our encrypted database. We only store the data necessary for interest analysis: channel titles, video titles, and channel information. We do not store video content, thumbnails, or any personal identifiers beyond what is required for the analysis. This data is retained only as long as your account is active and is deleted immediately upon account deletion or YouTube disconnection.
                                </p>
                                <p className="mt-4 pt-4 border-t border-white/10">
                                    <strong className="text-white">Complete Data Inventory:</strong> The following is a complete list of ALL YouTube data we collect, store, and use:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                                    <li><strong className="text-white">From Subscriptions:</strong> Channel title only (e.g., "Veritasium", "3Blue1Brown")</li>
                                    <li><strong className="text-white">From Liked Videos:</strong> Video title and channel title only (e.g., "The Science of Sleep" by "SciShow")</li>
                                    <li><strong className="text-white">Metadata:</strong> Timestamps for when subscriptions/likes were added (for pattern analysis over time)</li>
                                </ul>
                                <p className="mt-4">
                                    <strong className="text-white">What We Do NOT Collect:</strong> We explicitly do NOT collect, store, or use: video descriptions, video content, thumbnails, comments, view counts, subscriber counts, playlist data, watch history (beyond liked videos), user channel information, or any other YouTube data beyond what is listed above.
                                </p>
                            </div>
                        </div>

                        {/* Section 2: Interest Generation Process */}
                        <div className="mb-8 border-t border-white/10 pt-8">
                            <h3 className="text-[24px] font-bold text-white font-display mb-4">
                                Interest Generation Process
                            </h3>
                            <div className="space-y-4 text-gray-300 font-display text-[16px] leading-relaxed">
                                <p>
                                    <strong className="text-white">Step 1: Data Processing</strong>
                                </p>
                                <p>
                                    We process your stored YouTube data (subscriptions and liked videos) by extracting text content (channel titles and video titles) and preparing it for analysis. This text data is anonymized and sent to our AI processing service.
                                </p>
                                <p>
                                    <strong className="text-white">Step 2: AI Analysis</strong>
                                </p>
                                <p>
                                    Using OpenAI's GPT models, we analyze the aggregated text data from your subscriptions and liked videos. The AI system identifies patterns, themes, and recurring topics across your viewing behavior. It looks for:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li>Recurring topics and subject matter across multiple channels and videos</li>
                                    <li>Specific interests that go beyond generic categories (e.g., "Quantum Computing" rather than just "Science")</li>
                                    <li>Intellectual depth and specificity in your content consumption patterns</li>
                                    <li>Connections between different areas of interest</li>
                                </ul>
                                <p>
                                    <strong className="text-white">Step 3: Interest Extraction</strong>
                                </p>
                                <p>
                                    The AI generates a list of <strong className="text-white">{interests.length || 15} unique, non-overlapping interests</strong> that represent your authentic passions. These interests are specific and meaningful (e.g., "Indie Game Development," "Philosophy of Mind," "Entrepreneurship") rather than generic categories. The system ensures each interest is distinct and represents a genuine aspect of your intellectual identity.
                                </p>
                                <p>
                                    <strong className="text-white">Step 4: Storage of Derived Data</strong>
                                </p>
                                <p>
                                    The generated interests are stored in your user profile. We store only the final list of interest labels—we do not store the raw analysis, intermediate processing steps, or any connection to specific YouTube videos or channels. The interests become abstract representations of your passions, disconnected from the original YouTube data.
                                </p>
                                <p className="mt-4 pt-4 border-t border-white/10">
                                    <strong className="text-white">Why This Data Is Essential:</strong> The accuracy and quality of our interest generation depends entirely on having access to both subscription and liked video data:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                                    <li><strong className="text-white">Subscriptions alone are insufficient:</strong> Subscriptions show what you follow, but not what you actively engage with. A user might subscribe to a channel but rarely watch it, or might watch content without subscribing.</li>
                                    <li><strong className="text-white">Liked videos alone are insufficient:</strong> Liked videos show engagement, but without subscription data, we miss the recurring themes and long-term interests that subscriptions reveal.</li>
                                    <li><strong className="text-white">Combined data enables accurate analysis:</strong> Only by analyzing BOTH subscriptions (recurring interests) AND liked videos (active engagement) can we identify patterns that reveal authentic, deep interests rather than casual viewing habits.</li>
                                    <li><strong className="text-white">Volume matters:</strong> With {actualYoutubeCounts.subscriptions || youtubeStatus.subscriptionsTotal || youtubeStatus.subscriptionsCount || 0} subscriptions and {actualYoutubeCounts.likedVideos || youtubeStatus.likedVideosTotal || youtubeStatus.likedVideosCount || 0} liked videos, we have sufficient data points to identify meaningful patterns. Smaller datasets would produce inaccurate or generic interest profiles.</li>
                                </ul>
                                <p className="mt-4">
                                    <strong className="text-white">Service Dependency:</strong> Our service cannot function without YouTube API access because:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                                    <li>There is no alternative source for this behavioral data</li>
                                    <li>Manual entry would be impractical and inaccurate</li>
                                    <li>The volume of data required makes manual collection impossible</li>
                                    <li>Historical data is necessary to identify patterns over time</li>
                                    <li>Without this data, we cannot generate accurate interest profiles, and without interest profiles, our matching service cannot function</li>
                                </ul>
                            </div>
                        </div>

                        {/* Section 3: Matching Algorithm */}
                        <div className="mb-8 border-t border-white/10 pt-8">
                            <h3 className="text-[24px] font-bold text-white font-display mb-4">
                                How We Use Interests for Matching
                            </h3>
                            <div className="space-y-4 text-gray-300 font-display text-[16px] leading-relaxed">
                                <p>
                                    <strong className="text-white">Matching Process:</strong> Your derived interests (the abstract labels generated from your YouTube data) are used exclusively for matching you with other users who have similar interests. This matching process operates entirely on the derived interest data—we do not use your raw YouTube data (channel names, video titles, etc.) for matching purposes.
                                </p>
                                <p>
                                    <strong className="text-white">Compatibility Calculation:</strong> When comparing your interests with another user's interests, we calculate a compatibility score based on:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-4">
                                    <li><strong className="text-white">Shared Interest Count:</strong> The number of interests that appear in both users' interest lists</li>
                                    <li><strong className="text-white">Interest Specificity:</strong> More specific interests (e.g., "Quantum Computing") are weighted higher than generic ones (e.g., "Science") when calculating compatibility</li>
                                    <li><strong className="text-white">Interest Overlap Quality:</strong> The depth and meaningfulness of shared interests—users with overlapping specific interests are considered more compatible than those with only generic category overlaps</li>
                                </ul>
                                <p>
                                    <strong className="text-white">Privacy in Matching:</strong> When you are matched with another user, they only see your derived interests (e.g., "Entrepreneurship," "Philosophy")—they never see your YouTube channel subscriptions, liked videos, or any other YouTube data. The matching system operates on abstract interest labels only.
                                </p>
                                <p>
                                    <strong className="text-white">Purpose of Matching:</strong> The goal is to connect you with people who share your deep intellectual interests and passions, enabling meaningful conversations and relationships based on authentic common ground rather than superficial similarities.
                                </p>
                            </div>
                        </div>

                        {/* Section 4: Example */}
                        <div className="mb-8 border-t border-white/10 pt-8">
                            <h3 className="text-[24px] font-bold text-white font-display mb-4">
                                Example: How Matching Works
                            </h3>
                            <div className="space-y-4 text-gray-300 font-display text-[16px] leading-relaxed mb-4">
                                <p>
                                    Below is a concrete example of how the matching algorithm compares derived interests between two users:
                                </p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-white/5 rounded-[16px] p-6 space-y-4">
                                <div className="space-y-3 text-gray-300 font-display text-[16px]">
                                    <div>
                                        <p className="text-white font-semibold mb-2">Your Derived Interests (from your YouTube data):</p>
                                        <p className="text-gray-400">
                                            {interests.length > 0 
                                                ? `${interests.slice(0, 5).join(', ')}${interests.length > 5 ? '...' : ''}`
                                                : 'Quantum Computing, Indie Game Development, Philosophy, Creative Writing, Machine Learning'
                                            }
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1 italic">
                                            (These are abstract labels generated from your YouTube viewing behavior)
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center py-2">
                                        <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold mb-2">Potential Match's Derived Interests (from their YouTube data):</p>
                                        <p className="text-gray-400">
                                            {interests.length > 0 
                                                ? `${interests.slice(0, 3).join(', ')}, Philosophy, Creative Writing`
                                                : 'Quantum Computing, Indie Game Development, Philosophy, Creative Writing, Music Production'
                                            }
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1 italic">
                                            (These are abstract labels generated from their YouTube viewing behavior)
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-white font-semibold">Compatibility Calculation:</p>
                                        <p className="text-white font-semibold mt-2">Match Score: <span className="text-[#4ADE80]">87%</span></p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            <strong className="text-white">Analysis:</strong> You share {interests.length > 0 ? Math.min(interests.slice(0, 3).length, 3) : 3} core interests ({interests.length > 0 ? interests.slice(0, 3).join(', ') : 'Quantum Computing, Indie Game Development, Philosophy'}). The algorithm identified these as specific, meaningful interests (not generic categories), which increases the compatibility weight. The shared interests indicate strong intellectual alignment, making this a high-quality match for meaningful connections.
                                        </p>
                                        <p className="text-gray-500 text-sm mt-2 italic">
                                            Note: Neither user sees the other's YouTube data—only the derived interest labels are used for matching and visibility.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Data Privacy and Usage */}
                        <div className="mb-8 border-t border-white/10 pt-8">
                            <h3 className="text-[24px] font-bold text-white font-display mb-4">
                                Data Privacy and Usage
                            </h3>
                            <div className="space-y-4 text-gray-300 font-display text-[16px] leading-relaxed">
                                <p>
                                    <strong className="text-white">Data Usage Scope:</strong> Your YouTube data is used exclusively for the purpose of generating your interest profile and matching you with compatible users. We do not use this data for advertising, marketing, or any other purposes beyond user matching.
                                </p>
                                <p>
                                    <strong className="text-white">Data Sharing:</strong> We never share your raw YouTube data (channel subscriptions, liked videos, video titles, etc.) with other users or third parties. Only the derived interest labels (e.g., "Entrepreneurship," "Philosophy") are used in the matching process and may be visible to matched users.
                                </p>
                                <p>
                                    <strong className="text-white">Data Retention:</strong> Your YouTube data is retained only as long as your account is active. When you disconnect your YouTube account or delete your account, all associated YouTube data (subscriptions, liked videos) is immediately and permanently deleted from our systems. The derived interests may be retained if you choose to keep your account, but they become disconnected from the original YouTube data.
                                </p>
                                <p>
                                    <strong className="text-white">Data Security:</strong> All YouTube data is stored in encrypted databases with access controls. We follow industry-standard security practices to protect your data from unauthorized access, disclosure, or misuse.
                                </p>
                                <p>
                                    <strong className="text-white">User Control:</strong> You have full control over your YouTube data. You can disconnect your YouTube account at any time, which will immediately stop data collection and trigger deletion of stored YouTube data. You can also delete your account entirely, which removes all associated data.
                                </p>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-gray-400 text-sm font-display leading-relaxed">
                                <strong className="text-white">Summary:</strong> This process transforms your YouTube viewing behavior into abstract interest labels through secure, AI-powered analysis. These interest labels are then used exclusively for matching you with users who share similar intellectual passions. Your raw YouTube data remains private, secure, and is never shared with other users or used for purposes beyond interest generation and user matching.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className={`h-screen w-full relative overflow-hidden transition-colors duration-500 ${currentSlide.bg === 'dark' ? 'bg-[#111111] text-white' : 'bg-[#f4f3ee] text-black'
                }`}
            onClick={currentSlide.type === 'manual' && !showInterestModal ? handleNext : undefined}
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

            {/* Interest Explanation Modal */}
            <InterestExplanationModal />
        </div>
    );
}
