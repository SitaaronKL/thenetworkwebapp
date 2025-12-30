'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';

export default function AuthCallback() {
    const router = useRouter();
    const [status, setStatus] = useState('Completing sign in...');

    useEffect(() => {
        const handleAuthCallback = async () => {
            const supabase = createClient();

            // Wait for auth state change to ensure OAuth callback is fully processed
            const waitForSession = new Promise<{ session: any; userId: string }>((resolve, reject) => {
                // First try to get existing session
                supabase.auth.getSession().then(({ data: { session }, error }) => {
                    if (session?.user) {
                        resolve({ session, userId: session.user.id });
                        return;
                    }

                    // If no session, wait for auth state change
                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        async (event, session) => {
                            if (event === 'SIGNED_IN' && session?.user) {
                                subscription.unsubscribe();
                                // Small delay to ensure session is fully established
                                await new Promise(resolve => setTimeout(resolve, 500));
                                resolve({ session, userId: session.user.id });
                            } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                                subscription.unsubscribe();
                                reject(new Error('Authentication failed'));
                            }
                        }
                    );

                    // Timeout after 10 seconds
                    setTimeout(() => {
                        subscription.unsubscribe();
                        reject(new Error('Timeout waiting for authentication'));
                    }, 10000);
                });
            });

            let userId: string;
            let session: any;

            try {
                const result = await waitForSession;
                userId = result.userId;
                session = result.session;
            } catch (error: any) {
                console.error('Session error:', error);
                setStatus('Authentication failed. Redirecting...');
                setTimeout(() => router.push('/'), 2000);
                return;
            }

            // Create or get profile - ensure profile exists with Google data
            let { data: profileData } = await supabase
                .from('profiles')
                .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url')
                .eq('id', userId)
                .maybeSingle();

            // If profile doesn't exist, create it with Google user metadata
            if (!profileData) {
                const userMetadata = session.user.user_metadata || {};
                const googleName = userMetadata.name || userMetadata.full_name || session.user.email?.split('@')[0] || 'User';
                const googlePicture = userMetadata.picture || userMetadata.avatar_url || null;

                console.log('Creating profile for new user:', { userId, googleName, hasPicture: !!googlePicture });

                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        full_name: googleName,
                        avatar_url: googlePicture,
                        star_color: '#8E5BFF', // Default star color
                        interests: [],
                        hierarchical_interests: []
                    })
                    .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url')
                    .single();

                if (createError) {
                    console.error('Error creating profile:', createError);
                    // Try to continue anyway - profile might have been created by a trigger
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url')
                        .eq('id', userId)
                        .maybeSingle();
                    profileData = existingProfile;
                } else {
                    profileData = newProfile;
                }
            } else {
                // Profile exists - update Google name and picture if they're missing or different
                const userMetadata = session.user.user_metadata || {};
                const googleName = userMetadata.name || userMetadata.full_name;
                const googlePicture = userMetadata.picture || userMetadata.avatar_url;

                const needsUpdate = 
                    (googleName && profileData.full_name !== googleName) ||
                    (googlePicture && profileData.avatar_url !== googlePicture);

                if (needsUpdate) {
                    console.log('Updating profile with Google data:', { googleName, hasPicture: !!googlePicture });
                    const updateData: any = {};
                    if (googleName && profileData.full_name !== googleName) {
                        updateData.full_name = googleName;
                    }
                    if (googlePicture && profileData.avatar_url !== googlePicture) {
                        updateData.avatar_url = googlePicture;
                    }

                    const { data: updatedProfile } = await supabase
                        .from('profiles')
                        .update(updateData)
                        .eq('id', userId)
                        .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url')
                        .single();

                    if (updatedProfile) {
                        profileData = updatedProfile;
                    }
                }
            }

            // Sync YouTube data in the background (don't block the flow)
            // This fetches subscriptions and liked videos into the database
            YouTubeService.syncYouTubeData(userId).catch((error) => {
                console.error('Error syncing YouTube data (non-blocking):', error);
                // Don't throw - this is background sync, user can continue
            });

            // Determine if user needs to complete profile setup

            // Check for interests
            const hasInterests = profileData?.interests && profileData.interests.length > 0;

            // Check for new features (archetypes, doppelgangers)
            // @ts-ignore
            const hasArchetypes = profileData?.personality_archetypes && profileData.personality_archetypes.length > 0;
            // @ts-ignore
            const hasDoppelgangers = profileData?.doppelgangers && profileData.doppelgangers.length > 0;

            const isFullyComplete = hasInterests && hasArchetypes && hasDoppelgangers;
            const isPartial = hasInterests && (!hasArchetypes || !hasDoppelgangers);
            const isNew = !hasInterests; // No interests means totally new

            const FORCE_ONBOARDING = true;

            if (FORCE_ONBOARDING || isNew) {
                // New user - needs full setup
                console.log('New user detected...');
                setStatus('Setting up your profile...');
                
                // Redirect to Profile Setup (Step 1)
                // router.push('/profile-setup');
                router.push('/profile-setup/wrapped');

            } else if (isPartial) {
                // Partial user - has interests but needs upgrade
                console.log('Partial profile detected (missing new stats)...');
                setStatus('Upgrading your profile...');
                // Send to "Building" page which will detect missing parts and auto-generate them
                router.push('/profile-setup/building');

            } else {
                // Existing user with complete profile
                // Redirect to building page to show "Retrieving DNA" animation -> Wrapped -> Home
                console.log('Existing user, redirecting to building...');
                router.push('/profile-setup/building');
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="callback-container">
            <div className="callback-loader">
                <div className="spinner"></div>
                <p>{status}</p>
            </div>

            <style jsx>{`
        .callback-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fff;
        }
        
        .callback-loader {
          text-align: center;
          color: #000;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        p {
          font-size: 16px;
          opacity: 0.8;
          max-width: 400px;
          margin: 0 auto;
        }
      `}</style>
        </div>
    );
}
