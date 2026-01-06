'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import Image from 'next/image';
import HelpIcon from '@/components/HelpIcon';
import HelpModal from '@/components/HelpModal';

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
    const { user, session, loading } = useAuth();
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
    const [showNoYouTubeDataModal, setShowNoYouTubeDataModal] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

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
                // Error fetching YouTube counts
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
    // We check isNewUser OR if we haven't determined status yet (isNewUser could still be false during initial load)
    useEffect(() => {
        // Must have user AND session before processing
        if (!user || !session || processingComplete.current) return;

        // Start processing when we reach slide index 3 or later (Slide 4: "Connecting to YouTube...")
        // Slides are 0-indexed: 0=Slide1, 1=Slide2, 2=Slide3, 3=Slide4
        // We use >= 3 to handle race condition where checkAndProcess might not have completed yet
        // Also check isNewUser OR if we're still at the initial state (isNewUser not yet determined)
        const shouldProcess = processingStatus.isNewUser ||
            (!processingStatus.interests && !processingStatus.hierarchicalInterests && !processingStatus.dnaV2);

        if (currentSlideIndex >= 3 && !hasStartedProcessing.current && shouldProcess) {
            hasStartedProcessing.current = true;
            processUserDataWithYouTubeProgress();
        }
    }, [currentSlideIndex, user, session, processingStatus]);

    // New function with YouTube progress tracking
    const processUserDataWithYouTubeProgress = async () => {
        if (!user || processingComplete.current) return;

        // Verify we have a valid session from auth context
        if (!session) {
            return;
        }

        const supabase = createClient();

        // Verify the supabase client can see the session
        const { data: { session: clientSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            // Supabase client session error
        }
        if (!clientSession) {
            // Try to set the session from context
            const { error: setSessionError } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token || ''
            });
            if (setSessionError) {
                // Failed to set session
            }
        }

        try {
            // Step 1: Check YouTube connection (Slide 4)
            const accessToken = await YouTubeService.getAccessToken();
            if (accessToken) {
                setYoutubeStatus(prev => ({ ...prev, connected: true }));
                // Small delay before next step
                await new Promise(r => setTimeout(r, 500));
            }

            // Step 2: Fetch subscriptions with progress (Slide 5)
            let hasYouTubeData = false;
            try {
                // Check if YouTube data already exists
                const { data: existingSubs, error: existingSubsError } = await supabase
                    .from('youtube_subscriptions')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .limit(1);

                const { data: existingLikes, error: existingLikesError } = await supabase
                    .from('youtube_liked_videos')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .limit(1);

                if (existingSubsError) {
                    // Error checking existing subscriptions
                }
                if (existingLikesError) {
                    // Error checking existing liked videos
                }

                const existingSubsCount = existingSubs?.length || 0;
                const existingLikesCount = existingLikes?.length || 0;
                hasYouTubeData = existingSubsCount > 0 || existingLikesCount > 0;

                // Only sync if we don't have data yet
                if (!hasYouTubeData && accessToken) {
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
                    const subsCount = await YouTubeService.syncSubscriptionsToSupabase(user.id, subscriptions);
                    const likesCount = await YouTubeService.syncLikedVideosToSupabase(user.id, likedVideos);

                    // Only set hasYouTubeData if we actually synced something
                    hasYouTubeData = (subsCount > 0 || likesCount > 0);
                } else if (hasYouTubeData) {
                    setYoutubeStatus(prev => ({
                        ...prev,
                        subscriptionsCount: existingSubsCount,
                        subscriptionsTotal: existingSubsCount,
                        likedVideosCount: existingLikesCount,
                        likedVideosTotal: existingLikesCount
                    }));
                }
            } catch (syncError: any) {
                // Error syncing YouTube data
                // Check again after error - might have partial data
                const { data: checkSubs } = await supabase
                    .from('youtube_subscriptions')
                    .select('user_id')
                    .eq('user_id', user.id);
                const { data: checkLikes } = await supabase
                    .from('youtube_liked_videos')
                    .select('user_id')
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

            // Check if user has no YouTube data after sync - if so, delete account and redirect
            if (!hasYouTubeData) {
                setShowNoYouTubeDataModal(true);
                return; // Stop processing, modal will handle account deletion
            }

            // Step 2: Derive interests and hierarchical interests (only if we have YouTube data)
            if (hasYouTubeData) {
                try {
                    await YouTubeService.deriveInterests(user.id);
                } catch (deriveError: any) {
                    // Mark as ready to continue flow even if derivation fails
                    setProcessingStatus(prev => ({ ...prev, interests: true, hierarchicalInterests: true }));
                }
            } else {
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
                    setProcessingStatus(prev => ({ ...prev, interests: true, hierarchicalInterests: true }));
                    break;
                }

                if (interestsReady && hierarchicalReady) break;

                await new Promise(r => setTimeout(r, 1000));
                pollCount++;
            }

            // Step 3: Trigger DNA v2 computation
            // Use hasYouTubeData flag which we already computed, or re-check if needed

            // If we already know we have YouTube data from earlier, use that
            // Otherwise do a fresh check
            let shouldComputeDna: boolean = hasYouTubeData;

            if (!shouldComputeDna) {
                // Fresh check with proper error handling
                const { data: ytSubs, error: ytSubsError } = await supabase
                    .from('youtube_subscriptions')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .limit(1);

                const { data: ytLikes, error: ytLikesError } = await supabase
                    .from('youtube_liked_videos')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .limit(1);

                if (ytSubsError) {
                    // Error checking youtube_subscriptions
                }
                if (ytLikesError) {
                    // Error checking youtube_liked_videos
                }

                shouldComputeDna = (ytSubs?.length ?? 0) > 0 || (ytLikes?.length ?? 0) > 0;
            }

            if (shouldComputeDna) {
                // Retry logic for DNA computation with delay
                const maxDnaRetries = 5;
                let dnaRetries = 0;
                let dnaTriggered = false;

                while (dnaRetries < maxDnaRetries && !dnaTriggered) {
                    try {
                        // Add a small delay to ensure data is committed
                        if (dnaRetries > 0) {
                            await new Promise(r => setTimeout(r, 2000));
                        }

                        const response = await fetch('/api/compute-dna-v2', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                trigger_source: 'NEW_USER_SIGNUP'
                            })
                        });
                        const dnaResult = await response.json();

                        if (response.status === 202 && dnaResult.status === 'pending') {
                            // YouTube data not ready yet, retry
                            dnaRetries++;
                            continue;
                        }

                        if (!response.ok) {
                            dnaRetries++;
                            continue;
                        }

                        dnaTriggered = true;
                    } catch (dnaError) {
                        dnaRetries++;
                    }
                }

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
        } catch (error) {
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
                    <div className="relative z-10 max-w-[800px] text-center md:text-left px-6 md:px-8 -translate-y-10 md:-translate-y-20 md:-translate-x-20">
                        <h1 className="text-[28px] md:text-[60px] font-bold text-white font-display leading-[1.1] mb-2 tracking-tight">
                            You already have a digital life.
                        </h1>
                        <p className="text-[18px] md:text-[32px] font-medium text-gray-400 font-display">
                            But right now... it's scattered everywhere.
                        </p>
                    </div>

                    {/* Floating Orbs - smaller on mobile */}
                    <div className="absolute right-[5%] md:right-[10%] bottom-0 w-[150px] h-[150px] md:w-[400px] md:h-[400px] translate-y-1/4 animate-float-slow opacity-90 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute right-[5%] top-[35%] md:top-[40%] w-[50px] h-[50px] md:w-[100px] md:h-[100px] animate-float-medium opacity-80 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute left-[40%] md:left-[50%] bottom-[25%] md:bottom-[20%] w-[60px] h-[60px] md:w-[120px] md:h-[120px] -translate-x-full animate-float-fast opacity-85 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>

                    {/* TN Logo */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                    <div className="relative z-10 max-w-[800px] text-center md:text-left px-6 md:px-8 -translate-y-10 md:-translate-y-20 md:-translate-x-20">
                        <h1 className="text-[26px] md:text-[60px] font-bold text-white font-display leading-[1.1] mb-2 tracking-tight">
                            What if all of that added up to something?
                        </h1>
                        <p className="text-[16px] md:text-[32px] font-medium text-gray-400 font-display">
                            One profile that actually shows who you are.
                        </p>
                    </div>

                    {/* Floating Orbs - smaller on mobile */}
                    <div className="absolute right-[5%] md:right-[10%] bottom-0 w-[150px] h-[150px] md:w-[400px] md:h-[400px] translate-y-1/4 animate-float-slow opacity-90 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute right-[5%] top-[35%] md:top-[40%] w-[50px] h-[50px] md:w-[100px] md:h-[100px] animate-float-medium opacity-80 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>
                    <div className="absolute left-[40%] md:left-[50%] bottom-[25%] md:bottom-[20%] w-[60px] h-[60px] md:w-[120px] md:h-[120px] -translate-x-full animate-float-fast opacity-85 pointer-events-none">
                        <Image src="/assets/onboarding/bubble.png" alt="" fill className="object-contain" />
                    </div>

                    {/* TN Logo */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                    <div className="relative z-10 max-w-[800px] text-center px-6 md:px-4 -translate-y-10">
                        <h1 className="text-[24px] md:text-[50px] font-bold text-white font-display leading-[1.1] mb-2 tracking-tight">
                            Introducing: Digital DNA Wrapped
                        </h1>
                        <h2 className="text-[16px] md:text-[34px] font-bold text-gray-400 font-display">
                            "Spotify Wrapped" — but for life.
                        </h2>
                    </div>

                    {/* Stars - Top Right - smaller on mobile */}
                    <div className="absolute right-[10%] top-[15%] md:top-[10%] text-white animate-pulse-slow">
                        <StarFourPoint className="w-[30px] h-[30px] md:w-[50px] md:h-[50px]" />
                    </div>
                    <div className="absolute right-[5%] top-[8%] md:top-[5%] text-gray-300 animate-pulse-medium delay-100">
                        <StarFourPoint className="w-[35px] h-[35px] md:w-[60px] md:h-[60px]" />
                    </div>
                    <div className="absolute right-[15%] md:right-[12%] top-[22%] md:top-[18%] text-gray-500 animate-pulse-fast delay-200">
                        <StarFourPoint className="w-[25px] h-[25px] md:w-[40px] md:h-[40px]" />
                    </div>

                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-10 bottom-20 md:bottom-10 w-[80px] md:w-[80px] h-[60px] md:h-[60px] opacity-100 pointer-events-none">
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
                <div className="relative w-full h-full flex flex-col items-center justify-center px-6">
                    <h1 className="text-[24px] md:text-[34px] font-bold text-white font-display mb-6 md:mb-8 text-center">
                        Connecting to YouTube...
                    </h1>
                    {/* Star - Responsive positioning */}
                    <div className="absolute left-[30%] md:left-[40%] top-[30%] md:top-[35%] text-gray-500 animate-pulse-slow">
                        <StarFourPoint className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                <div className="relative w-full h-full flex flex-col items-center justify-center px-6">
                    <h1 className="text-[24px] md:text-[34px] font-bold text-white font-display mb-6 md:mb-8 text-center">
                        Fetching your subscriptions...
                    </h1>
                    {youtubeStatus.subscriptionsCount > 0 && (
                        <p className="text-[16px] md:text-[22px] text-gray-400 font-display text-center">
                            {youtubeStatus.subscriptionsTotal !== null
                                ? `Fetched ${youtubeStatus.subscriptionsCount} subscriptions`
                                : `Fetched ${youtubeStatus.subscriptionsCount}...`}
                        </p>
                    )}
                    {/* Star - Responsive positioning */}
                    <div className="absolute right-[15%] md:right-[25%] top-[40%] md:top-[45%] text-gray-500 animate-pulse-medium">
                        <StarFourPoint className="w-8 h-8 md:w-12 md:h-12" />
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                <div className="relative w-full h-full flex flex-col items-center justify-center px-6">
                    <h1 className="text-[24px] md:text-[34px] font-bold text-white font-display mb-6 md:mb-8 text-center">
                        Fetching your liked videos...
                    </h1>
                    {youtubeStatus.likedVideosCount > 0 && (
                        <p className="text-[16px] md:text-[22px] text-gray-400 font-display text-center">
                            {youtubeStatus.likedVideosTotal !== null
                                ? `Fetched ${youtubeStatus.likedVideosCount} videos`
                                : `Fetched ${youtubeStatus.likedVideosCount}...`}
                        </p>
                    )}
                    {/* Star - Responsive positioning */}
                    <div className="absolute left-[25%] md:left-[35%] bottom-[35%] md:bottom-[40%] text-gray-500 animate-pulse-fast">
                        <StarFourPoint className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                    <div className="w-full h-full flex flex-col items-center justify-center px-4 pb-24 md:pb-0">
                        <h1 className="text-[24px] md:text-[34px] font-bold text-white font-display mb-6 md:mb-8 text-center">
                            Your Interest Graph
                        </h1>
                        <div className="w-full max-w-[900px] px-4 md:px-8 overflow-y-auto max-h-[50vh] md:max-h-none">
                            {interests.length > 0 ? (
                                <div className="flex flex-wrap gap-2 md:gap-4 justify-center items-center">
                                    {interests.map((interest, index) => (
                                        <span
                                            key={index}
                                            className="px-4 md:px-6 py-2 md:py-3 bg-white/5 border border-white/10 rounded-full text-white text-[14px] md:text-[18px] font-medium font-display hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full flex flex-col items-center justify-center gap-8">
                                    {/* Animated spinner */}
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-white/10"></div>
                                        <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-white/60 animate-spin"></div>
                                        <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-transparent border-b-white/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                                    </div>

                                    {/* Loading text */}
                                    <p className="text-gray-400 font-display text-[14px] md:text-base animate-pulse">
                                        Analyzing your interests...
                                    </p>

                                    {/* Skeleton pills */}
                                    <div className="flex flex-wrap gap-2 md:gap-3 justify-center items-center max-w-[600px]">
                                        {[120, 80, 100, 90, 110, 70, 95, 85, 105, 75].map((width, index) => (
                                            <div
                                                key={index}
                                                className="h-10 md:h-12 rounded-full bg-white/5 animate-pulse"
                                                style={{
                                                    width: `${width}px`,
                                                    animationDelay: `${index * 100}ms`,
                                                    animationDuration: '1.5s'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Question Mark Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowInterestModal(true);
                            }}
                            className="mt-6 md:mt-8 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white text-xl md:text-2xl font-bold transition-all hover:scale-110"
                        >
                            ?
                        </button>
                        {/* Tap to continue hint - mobile only - only show when interests are loaded */}
                        {interests.length > 0 && (
                            <p className="mt-4 text-gray-500 text-sm font-display md:hidden">Tap to continue</p>
                        )}
                    </div>
                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                <div className="relative w-full h-full flex flex-col items-center md:items-start justify-center px-6 md:px-20">
                    <div
                        className="max-w-[1000px] text-center md:text-left transition-transform duration-75"
                        style={{ transform: typeof window !== 'undefined' && window.innerWidth >= 768 ? `translate(202px, -158px)` : 'none' }}
                    >
                        <h1
                            className="font-bold text-white mb-6 md:mb-8 font-display leading-tight tracking-tight text-[28px] md:text-[45px]"
                        >
                            You don't fit in one box. So we gave you four.
                        </h1>
                        {/* Custom Left-Aligned Identity Line Wrapper */}
                        <div
                            className="flex flex-wrap justify-center md:justify-start gap-x-2 md:gap-x-3 w-full font-bold font-display leading-tight tracking-tight text-[16px] md:text-[25px]"
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
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                <div className="w-full h-full relative flex items-center justify-center md:justify-start">
                    {/* Text Content - Left Side */}
                    <div className="w-full md:w-3/4 px-6 md:pl-80 z-10 text-center md:text-left">
                        <h1 className="text-[24px] md:text-[50px] font-bold text-white mb-4 md:mb-6 font-display leading-tight tracking-tight">
                            Your Digital Doppelgängers
                        </h1>
                        <p className="text-[16px] md:text-[28px] font-bold text-white mb-6 md:mb-8 font-display">
                            Your Digital DNA is 87% similar to:
                        </p>
                        <div className="space-y-2">
                            {doppelgangers.length > 0 ? (
                                doppelgangers.map((d, i) => (
                                    <p
                                        key={i}
                                        className="text-[20px] md:text-[36px] font-bold text-[#b3b3b3] font-display animate-fade-in-up"
                                        style={{ animationDelay: `${i * 100}ms` }}
                                    >
                                        {d.name}
                                    </p>
                                ))
                            ) : (
                                // Static placeholders if no data (matching Figma)
                                <>
                                    <p className="text-[20px] md:text-[36px] font-bold text-[#b3b3b3] font-display">Paul Graham</p>
                                    <p className="text-[20px] md:text-[36px] font-bold text-[#b3b3b3] font-display">Emma Chamberlain</p>
                                    <p className="text-[20px] md:text-[36px] font-bold text-[#b3b3b3] font-display">Miles Morales</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Side Visuals - Hidden on mobile */}
                    <div className="hidden md:block">
                        <DoppelgangerCircles />
                    </div>

                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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
                <div className="w-full h-full relative flex flex-col items-center md:items-start justify-center px-6 md:p-20">
                    <div className="max-w-[800px] text-center md:text-left">
                        <h1 className="text-[28px] md:text-[60px] font-bold text-white mb-6 md:mb-4 font-display leading-tight tracking-tight">
                            Ready to meet more people like you?
                        </h1>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                localStorage.setItem('theme_inverted', 'true');

                                if (user) {
                                    const supabase = createClient();

                                    // Mark onboarding as completed in the database
                                    await supabase
                                        .from('profiles')
                                        .update({ has_completed_onboarding: true })
                                        .eq('id', user.id);

                                    // Ensure DNA v2 is computed even if user clicked through quickly
                                    const { data: existingDna } = await supabase
                                        .from('digital_dna_v2')
                                        .select('id')
                                        .eq('user_id', user.id)
                                        .maybeSingle();

                                    if (!existingDna) {
                                        const { data: ytSubs } = await supabase
                                            .from('youtube_subscriptions')
                                            .select('user_id')
                                            .eq('user_id', user.id)
                                            .limit(1);

                                        const { data: ytLikes } = await supabase
                                            .from('youtube_liked_videos')
                                            .select('user_id')
                                            .eq('user_id', user.id)
                                            .limit(1);

                                        if ((ytSubs && ytSubs.length > 0) || (ytLikes && ytLikes.length > 0)) {
                                            fetch('/api/compute-dna-v2', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    user_id: user.id,
                                                    trigger_source: 'ONBOARDING_COMPLETION_FALLBACK'
                                                })
                                            }).catch(() => {
                                                // Background DNA v2 computation error
                                            });
                                        }
                                    }
                                }

                                // Check feature flag and redirect to review page if enabled
                                const reviewEnabled = process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true';
                                if (reviewEnabled) {
                                    router.push('/youtube-data-review');
                                } else {
                                    router.push('/network');
                                }
                            }}
                            className="text-[20px] md:text-[32px] font-bold text-white hover:opacity-70 transition-opacity font-display cursor-pointer flex items-center justify-center md:justify-start gap-2 w-full md:w-auto"
                        >
                            Continue →
                        </button>
                    </div>

                    {/* TN Logo - White */}
                    <div className="absolute left-4 md:left-6 bottom-20 md:bottom-6 w-[100px] md:w-[150px] h-[80px] md:h-[120px] opacity-100 pointer-events-none">
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

    const handleNext = async () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            localStorage.setItem('theme_inverted', 'true');

            if (user) {
                const supabase = createClient();

                // Mark onboarding as completed in the database
                await supabase
                    .from('profiles')
                    .update({ has_completed_onboarding: true })
                    .eq('id', user.id);

                // Ensure DNA v2 is computed even if user clicked through quickly
                // Check if DNA v2 exists, if not trigger computation in background
                const { data: existingDna } = await supabase
                    .from('digital_dna_v2')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!existingDna) {
                    // Check if user has YouTube data
                    const { data: ytSubs } = await supabase
                        .from('youtube_subscriptions')
                        .select('user_id')
                        .eq('user_id', user.id)
                        .limit(1);

                    const { data: ytLikes } = await supabase
                        .from('youtube_liked_videos')
                        .select('user_id')
                        .eq('user_id', user.id)
                        .limit(1);

                    if ((ytSubs && ytSubs.length > 0) || (ytLikes && ytLikes.length > 0)) {
                        // Trigger DNA v2 computation in background (don't await)
                        fetch('/api/compute-dna-v2', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: user.id,
                                trigger_source: 'ONBOARDING_COMPLETION_FALLBACK'
                            })
                        }).catch(() => {
                            // Background DNA v2 computation error
                        });
                    }
                }
            }

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
                className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowInterestModal(false);
                    }
                }}
            >
                <div
                    className="relative bg-[#1a1a1a] border border-white/10 rounded-t-[24px] md:rounded-[24px] max-w-4xl w-full md:mx-4 max-h-[85vh] md:max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Mobile drag handle */}
                    <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-[#1a1a1a] z-10">
                        <div className="w-10 h-1 bg-white/30 rounded-full"></div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => setShowInterestModal(false)}
                        className="absolute top-3 md:top-4 right-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors z-20"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="p-5 md:p-12 pt-2 md:pt-12">
                        {/* Header */}
                        <h2 className="text-[24px] md:text-[40px] font-bold text-white font-display mb-6 md:mb-8 leading-tight pr-8">
                            Your Interests, Without the Guesswork
                        </h2>

                        {/* Main Branding Section */}
                        <div className="mb-6 md:mb-8 space-y-4 md:space-y-6 text-gray-200 font-display text-[15px] md:text-[17px] leading-relaxed">
                            <p className="text-white text-[17px] md:text-[20px] font-medium">
                                Most apps make you explain yourself.
                            </p>
                            <p>
                                They ask you to pick categories, write bios, or perform a version of you that fits inside a template. But the things you actually care about do not live in a dropdown menu.
                            </p>
                            <p>
                                They live in the rabbit holes you return to. The creators you keep up with. The videos that make you stop scrolling and hit like.
                            </p>
                            <p className="text-white text-[17px] md:text-[20px] font-medium">
                                That is why TheNetwork starts somewhere real: your YouTube.
                            </p>
                            <p>
                                Not because we are trying to know everything about you, but because it is the cleanest signal of what you are genuinely into.
                            </p>
                        </div>

                        {/* What Connecting YouTube Does */}
                        <div className="mb-6 md:mb-8 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-[16px] md:rounded-[20px] p-4 md:p-8">
                            <h3 className="text-[20px] md:text-[24px] font-bold text-white font-display mb-3 md:mb-4">
                                What Connecting YouTube Does
                            </h3>
                            <div className="space-y-3 md:space-y-4 text-gray-200 font-display text-[15px] md:text-[17px] leading-relaxed">
                                <p>
                                    When you connect YouTube, we use two simple signals:
                                </p>
                                <ul className="space-y-2 md:space-y-3 ml-2 md:ml-4">
                                    <li className="flex items-start">
                                        <span className="text-white mr-2 md:mr-3">•</span>
                                        <span><strong className="text-white">Channels you follow</strong> show what you choose to keep in your orbit.</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-white mr-2 md:mr-3">•</span>
                                        <span><strong className="text-white">Videos you like</strong> show what you actively engage with.</span>
                                    </li>
                                </ul>
                                <p className="pt-2">
                                    Those two signals together are how we build something that feels like you, without you doing any work.
                                </p>
                                <div className="pt-3 md:pt-4 space-y-1 md:space-y-2 text-gray-300">
                                    <p>No long onboarding.</p>
                                    <p>No tell us your interests.</p>
                                    <p>No fake personality quizzes.</p>
                                </div>
                                <p className="pt-2 text-white font-medium">
                                    Just connect, and we map the patterns.
                                </p>
                            </div>
                        </div>

                        {/* What You Get */}
                        <div className="mb-6 md:mb-8 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-[16px] md:rounded-[20px] p-4 md:p-8">
                            <h3 className="text-[20px] md:text-[24px] font-bold text-white font-display mb-3 md:mb-4">
                                What You Get
                            </h3>
                            <div className="space-y-3 md:space-y-4 text-gray-200 font-display text-[15px] md:text-[17px] leading-relaxed">
                                <div>
                                    <p className="text-white font-semibold mb-1 md:mb-2">An interest profile that feels specific</p>
                                    <p className="text-gray-300 italic text-[14px] md:text-[17px]">
                                        Not science. More like quantum computing, aviation deep dives, indie game design, philosophy of mind, football tactics, music production, and more.
                                    </p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold mb-1 md:mb-2">Better matches</p>
                                    <p>
                                        You will meet people based on the overlaps that actually matter, the kind that lead to real conversations, not small talk.
                                    </p>
                                </div>
                                <div>
                                    <p className="text-white font-semibold mb-1 md:mb-2">A more honest starting point</p>
                                    <p>
                                        Your profile is not who you say you are. It is what you repeatedly choose, over time.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* What This Is Not */}
                        <div className="mb-6 md:mb-8 border-t border-white/10 pt-4 md:pt-6">
                            <h3 className="text-[20px] md:text-[24px] font-bold text-white font-display mb-3 md:mb-4">
                                What This Is Not
                            </h3>
                            <p className="text-gray-200 font-display text-[15px] md:text-[17px] leading-relaxed">
                                This is not about turning you into data. It is about turning your taste into a map, so you can find your people faster.
                            </p>
                            <p className="text-white font-medium mt-3 md:mt-4 text-[16px] md:text-[18px]">
                                That is the whole thing.
                            </p>
                        </div>

                        {/* The Easter Egg */}
                        <div className="mb-6 md:mb-8 bg-gradient-to-br from-[#2a1a1a] to-[#1a0a0a] border border-white/20 rounded-[16px] md:rounded-[20px] p-4 md:p-8">
                            <h3 className="text-[20px] md:text-[24px] font-bold text-white font-display mb-3 md:mb-4">
                                The Easter Egg
                            </h3>
                            <div className="space-y-3 md:space-y-4 text-gray-200 font-display text-[15px] md:text-[17px] leading-relaxed">
                                <p>
                                    If you are the type of person who reads the fine print for fun, you are probably our type of person.
                                </p>
                                <p>
                                    Come say hi in the Discord. We are building this in public, early, messy, and with people who care.
                                </p>
                                <a
                                    href="https://discord.gg/HrRjafUG"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 mt-3 md:mt-4 px-5 md:px-6 py-2.5 md:py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105 text-[14px] md:text-[16px]"
                                >
                                    Join the Discord
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Handle account deletion when no YouTube data is found
    const handleDeleteAccountNoYouTubeData = async () => {
        if (!user || !session || deletingAccount) return;

        setDeletingAccount(true);
        const supabase = createClient();

        try {
            // Call the delete-account edge function
            const { data, error } = await supabase.functions.invoke('delete-account', {
                body: {},
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (error) {
                throw error;
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            // Success - sign out and redirect to login
            await supabase.auth.signOut();
            router.push('/');
        } catch (error: any) {
            alert(`Error deleting account: ${error.message || 'An unexpected error occurred'}`);
            setDeletingAccount(false);
        }
    };

    // No YouTube Data Modal Component
    const NoYouTubeDataModal = () => {
        if (!showNoYouTubeDataModal) return null;

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            >
                <div
                    className="relative bg-[#1a1a1a] border border-white/10 rounded-[24px] max-w-lg w-full mx-4 p-8"
                >
                    <h2 className="text-[28px] font-bold text-white font-display mb-4 leading-tight">
                        No YouTube Data Found
                    </h2>
                    <p className="text-gray-200 font-display text-[16px] leading-relaxed mb-6">
                        We couldn't find any YouTube subscriptions or liked videos on your account.
                        TheNetwork requires YouTube data to create your profile and find meaningful connections.
                    </p>
                    <p className="text-gray-300 font-display text-[14px] leading-relaxed mb-6">
                        Your account will be deleted and you'll be redirected to the login page.
                        You can sign up again once you have YouTube activity.
                    </p>
                    <button
                        onClick={handleDeleteAccountNoYouTubeData}
                        disabled={deletingAccount}
                        className="w-full px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[16px]"
                    >
                        {deletingAccount ? 'Deleting Account...' : 'Continue'}
                    </button>
                </div>
            </div>
        );
    };

    // Check if current slide can be advanced
    const canAdvanceSlide = () => {
        // For slide 7 (Interest Graph), only allow advance if interests are loaded
        if (currentSlideIndex === 6 && interests.length === 0) {
            return false;
        }
        return currentSlide.type === 'manual' && !showInterestModal && !showNoYouTubeDataModal;
    };

    return (
        <>
            <HelpIcon onClick={() => setIsHelpOpen(true)} />
            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <div
                className={`h-screen w-full relative overflow-hidden transition-colors duration-500 ${currentSlide.bg === 'dark' ? 'bg-[#111111] text-white' : 'bg-[#f4f3ee] text-black'
                    }`}
                onClick={canAdvanceSlide() ? handleNext : undefined}
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
                {currentSlide.type === 'manual' && currentSlideIndex < SLIDES.length - 1 &&
                    // For slide 7 (Interest Graph), only show indicator when interests are loaded
                    (currentSlideIndex !== 6 || interests.length > 0) && (
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

                {/* No YouTube Data Modal */}
                <NoYouTubeDataModal />
            </div>
        </>
    );
}
