'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { YouTubeService } from '@/services/youtube';
import { createClient } from '@/lib/supabase';
import InterestGraph from '@/components/InterestGraph';

const STATUS_MESSAGES = [
    'Syncing your YouTube data...',
    'Analyzing your subscriptions...',
    'Finding your interests...',
    'Building your Digital DNA...',
    'Almost there...',
    'Retrieving your Digital DNA...',
];

export default function BuildingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [statusIndex, setStatusIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');
    const [existingInterests, setExistingInterests] = useState<string[]>([]);
    const [showGraph, setShowGraph] = useState(false);
    const [isExistingUser, setIsExistingUser] = useState(false);
    const [userFullName, setUserFullName] = useState('Me');

    const hasChecked = useRef(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Check for Existing DNA
    useEffect(() => {
        if (!user || hasChecked.current) return;
        hasChecked.current = true;

        const checkExistingDNA = async () => {
            const supabase = createClient();
            const { data: profile } = await supabase
                .from('profiles')
                .select('interests, full_name, personality_archetypes, doppelgangers')
                .eq('id', user.id)
                .single();

            if (profile?.full_name) {
                setUserFullName(profile.full_name);
            }

            const interests = (profile?.interests as string[]) || [];

            // Check if profile is TRULY complete (has interests, archetypes, and doppelgangers)
            // @ts-ignore
            const hasArchetypes = profile?.personality_archetypes && profile.personality_archetypes.length > 0;
            // @ts-ignore
            const hasDoppelgangers = profile?.doppelgangers && profile.doppelgangers.length > 0;

            const isFullyComplete = interests.length > 0 && hasArchetypes && hasDoppelgangers;

            if (isFullyComplete) {
                // User already has Complete DNA
                // Add a small delay for "Retrieving" effect so it's not jarring
                setStatusIndex(5); // "Retrieving your Digital DNA..."

                // We'll just use the existing state but maybe override the message or just let it spin for a second
                // Actually let's just wait 1.5s before showing
                await new Promise(resolve => setTimeout(resolve, 1500));

                setExistingInterests(interests);
                setIsExistingUser(true);
                setShowGraph(true);
                setIsComplete(true);
            } else {
                // New user OR Partial user (needs migration) - start processing
                // If they have interests but no archetypes/doppelgangers, we treat them as "constructing"
                // processDNA will re-run the derivation to get the missing pieces
                processDNA();
            }
        };

        checkExistingDNA();
    }, [user]);

    // Cycle through status messages (only if not showing graph immediately)
    useEffect(() => {
        if (showGraph) return;

        const interval = setInterval(() => {
            setStatusIndex(prev => {
                if (prev < STATUS_MESSAGES.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [showGraph]);

    const processDNA = async () => {
        if (!user) return;

        try {
            // Step 1: Sync YouTube data
            const { subsCount, likesCount } = await YouTubeService.syncYouTubeData(user.id);
            console.log(`Synced ${subsCount} subscriptions and ${likesCount} liked videos`);

            // Step 2: Derive interests (this calls the edge function)
            if (subsCount > 0 || likesCount > 0) {
                await YouTubeService.deriveInterests(user.id);
                console.log('Interests derived successfully');
            }

            // Wait a minimum of 2 seconds for visual pacing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Fetch the newly created interests
            const supabase = createClient();

            // Poll for interests since there might be a slight delay from the edge function
            let retries = 0;
            let interests: string[] = [];

            while (retries < 5) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('interests')
                    .eq('id', user.id)
                    .single();

                interests = (profile?.interests as string[]) || [];

                if (interests.length > 0) break;

                await new Promise(resolve => setTimeout(resolve, 1000));
                retries++;
            }

            setExistingInterests(interests);
            setShowGraph(true);
            setIsComplete(true);

        } catch (err: any) {
            console.error('Error processing DNA:', err);
            setError('Some data could not be processed');
            // Still allow continue even if error, maybe they have partial data or can skip
            setIsComplete(true);
        }
    };

    const handleContinue = () => {
        router.push('/profile-setup/wrapped');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4 relative overflow-hidden">

            {/* Background Graph */}
            {showGraph && (
                <div className="absolute inset-0 z-0 animate-fade-in">
                    <InterestGraph
                        interests={existingInterests}
                        userFullName={userFullName}
                    />
                </div>
            )}

            <div className="relative z-10 w-full max-w-[600px] flex flex-col items-center pointer-events-none">
                {/* Progress Bar Container */}
                <div className="w-full flex flex-col gap-2 mb-12">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[15px] font-normal text-black font-display">Build your Digital DNA</span>
                        <span className="text-[15px] font-normal text-black font-display">100%</span>
                    </div>
                    <div className="w-full h-[10px] bg-white border border-black relative">
                        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-b from-[#252525] to-[#454545]"></div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col items-center justify-center text-center mt-8 w-full">
                    {!showGraph ? (
                        /* Loading State */
                        <>
                            <div className="relative w-32 h-32 mb-8">
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <h2 className="text-[30px] font-bold text-black font-display mb-4">
                                Constructing your Digital DNA
                            </h2>
                            <p className="text-[16px] text-gray-600 font-display">
                                {STATUS_MESSAGES[statusIndex]}
                            </p>
                        </>
                    ) : (
                        /* Complete / Existing State */
                        <div className="animate-fade-in-up p-8 rounded-2xl pointer-events-auto">
                            <h2 className="text-[48px] font-bold text-black font-display mb-6 leading-[1.1] tracking-tight">
                                {isExistingUser
                                    ? "You already have a digital life."
                                    : "DNA Created!"}
                            </h2>
                            <p className="text-[24px] text-gray-600 font-display mb-12 max-w-[400px] mx-auto leading-normal">
                                {isExistingUser
                                    ? "But right now... it's scattered everywhere."
                                    : "Your interests have been mapped."}
                            </p>

                            <button
                                onClick={handleContinue}
                                className="bg-black text-white text-[20px] font-bold py-4 px-12 rounded-full hover:scale-105 transition-transform font-display shadow-xl cursor-pointer"
                            >
                                Continue →
                            </button>
                        </div>
                    )}

                    {error && <p className="text-red-500 mt-4 font-display z-10">{error}</p>}
                </div>
            </div>
        </div>
    );
}
