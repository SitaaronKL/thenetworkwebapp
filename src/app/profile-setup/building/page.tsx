'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { YouTubeService } from '@/services/youtube';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

export default function BuildingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [isComplete, setIsComplete] = useState(false);
    const hasChecked = useRef(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Check for Existing DNA & Process
    useEffect(() => {
        if (!user || hasChecked.current) return;
        hasChecked.current = true;

        const processUserDNA = async () => {
            const supabase = createClient();
            
            // Check existing profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('interests, full_name, personality_archetypes, doppelgangers')
                .eq('id', user.id)
                .single();

            const interests = (profile?.interests as string[]) || [];
            // @ts-ignore
            const hasArchetypes = profile?.personality_archetypes && profile.personality_archetypes.length > 0;
            // @ts-ignore
            const hasDoppelgangers = profile?.doppelgangers && profile.doppelgangers.length > 0;

            const isFullyComplete = interests.length > 0 && hasArchetypes && hasDoppelgangers;

            if (isFullyComplete) {
                 // Already complete, redirect almost immediately (or handle via Wrapped)
                 setIsComplete(true);
            } else {
                // Need to process
                try {
                    // Sync YouTube
                    await YouTubeService.syncYouTubeData(user.id);
                    
                    // Derive interests if needed
                    if (interests.length === 0) {
                        await YouTubeService.deriveInterests(user.id);
                    }

                    // Poll for completion
                    let retries = 0;
                    while (retries < 10) {
                        const { data: check } = await supabase
                            .from('profiles')
                            .select('interests')
                            .eq('id', user.id)
                            .single();
                        
                        if (check?.interests && check.interests.length > 0) break;
                        await new Promise(r => setTimeout(r, 1000));
                        retries++;
                    }

                    // Trigger DNA v2 computation for new users
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            // Check if user has YouTube data before triggering DNA v2
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

                            // Only trigger if user has YouTube data
                            if ((ytSubs && ytSubs.length > 0) || (ytLikes && ytLikes.length > 0)) {
                                const { error: dnaError } = await supabase.functions.invoke('compute-dna-v2', {
                                    body: {
                                        trigger_source: 'NEW_USER_SIGNUP'
                                    }
                                });

                                if (dnaError) {
                                    console.error('Error triggering DNA v2 computation:', dnaError);
                                    // Don't block the flow if DNA computation fails
                                } else {
                                    console.log('DNA v2 computation triggered successfully');
                                }
                            } else {
                                console.log('No YouTube data found, skipping DNA v2 computation');
                            }
                        }
                    } catch (dnaErr) {
                        console.error('Error triggering DNA v2:', dnaErr);
                        // Don't block the flow if DNA computation fails
                    }

                    setIsComplete(true);
                } catch (err) {
                    console.error("Error processing:", err);
                    // Continue anyway
                    setIsComplete(true);
                }
            }
        };

        processUserDNA();
    }, [user]);

    // Navigate when complete
    useEffect(() => {
        if (isComplete) {
             router.push('/profile-setup/wrapped');
        }
    }, [isComplete, router]);

    // While loading/processing, we can show a minimal loading state or nothing
    // since the visual is now handled by the FIRST SLIDE of WrappedPage.
    // However, to prevent a blank screen during the redirect, we can show a spinner.
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#111111]">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
