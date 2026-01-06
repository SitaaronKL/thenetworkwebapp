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
                setStatus('Authentication failed. Redirecting...');
                setTimeout(() => router.push('/'), 2000);
                return;
            }

            // Create or get profile - ensure profile exists with Google data
            let { data: profileData } = await supabase
                .from('profiles')
                .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url, has_completed_onboarding')
                .eq('id', userId)
                .maybeSingle();

            // If profile doesn't exist, create it with Google user metadata
            if (!profileData) {
                const userMetadata = session.user.user_metadata || {};
                const googleName = userMetadata.name || userMetadata.full_name || session.user.email?.split('@')[0] || 'User';
                const googlePicture = userMetadata.picture || userMetadata.avatar_url || null;

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
                    .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url, has_completed_onboarding')
                    .single();

                if (createError) {
                    // Try to continue anyway - profile might have been created by a trigger
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url, has_completed_onboarding')
                        .eq('id', userId)
                        .maybeSingle();
                    profileData = existingProfile;
                } else {
                    profileData = newProfile;
                    
                    // Track referral if code exists
                    const referralCode = localStorage.getItem('referral_code');
                    if (referralCode) {
                        try {
                            // Find the referrer by code
                            const { data: referralCodeData, error: codeError } = await supabase
                                .from('user_referral_codes')
                                .select('user_id')
                                .eq('referral_code', referralCode)
                                .single();

                            if (!codeError && referralCodeData) {
                                const referrerId = referralCodeData.user_id;
                                
                                // Import and call trackReferralSignup
                                const { trackReferralSignup } = await import('@/services/referral');
                                await trackReferralSignup(referrerId, userId, referralCode);
                            }
                            
                            // Clear the referral code from localStorage
                            localStorage.removeItem('referral_code');
                        } catch (error) {
                            console.error('Error tracking referral:', error);
                            // Don't block the flow if referral tracking fails
                        }
                    }
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
                        .select('id, interests, personality_archetypes, doppelgangers, full_name, avatar_url, has_completed_onboarding')
                        .single();

                    if (updatedProfile) {
                        profileData = updatedProfile;
                    }
                }
            }

            // Sync YouTube data in the background (don't block the flow)
            // This fetches subscriptions and liked videos into the database
            YouTubeService.syncYouTubeData(userId).catch((error) => {
                // Don't throw - this is background sync, user can continue
            });

            // Determine if user needs to complete profile setup

            // Check if user has already completed onboarding
            // @ts-ignore - has_completed_onboarding may not be in the type yet
            const hasCompletedOnboarding = profileData?.has_completed_onboarding === true;

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

            // Set to false for production - when true, forces all users through onboarding
            const FORCE_ONBOARDING = false;

            // Skip onboarding if user has already completed it (unless FORCE_ONBOARDING is true)
            if (hasCompletedOnboarding && !FORCE_ONBOARDING) {
                setStatus('Welcome back!');
                router.push('/network');

            } else if (FORCE_ONBOARDING || isNew) {
                // New user - needs full setup
                setStatus('Setting up your profile...');

                // Redirect to Profile Setup (Step 1)
                // router.push('/profile-setup');
                router.push('/profile-setup/wrapped');

            } else if (isPartial) {
                // Partial user - has interests but needs upgrade
                setStatus('Upgrading your profile...');
                // Send to "Building" page which will detect missing parts and auto-generate them
                router.push('/profile-setup/building');

            } else {
                // Existing user with complete profile
                // Redirect to building page to show "Retrieving DNA" animation -> Wrapped -> Home
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
