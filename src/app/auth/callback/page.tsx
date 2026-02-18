'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import { ensureFriendPartyAttendance } from '@/lib/friend-party-attendance';

const MCMASTER_SCHOOL = 'McMaster University';
const POST_AUTH_REDIRECT_KEY = 'tn_post_auth_redirect';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Completing sign in...');
    const hasAuthError = Boolean(
        searchParams.get('error') ||
        searchParams.get('error_code') ||
        searchParams.get('error_description')
    );

    // Check for custom redirect (e.g., from party pages)
    const customRedirect = searchParams.get('redirect');

    useEffect(() => {
        if (hasAuthError) {
            router.replace('/');
            return;
        }
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
                router.replace('/');
                return;
            }

            const normalizeRedirect = (redirect: string | null) => {
                if (!redirect) return null;
                if (redirect.startsWith('/')) return redirect;

                try {
                    const url = new URL(redirect);
                    if (url.origin === window.location.origin) {
                        return `${url.pathname}${url.search}${url.hash}`;
                    }
                } catch (e) {
                    // Ignore invalid redirects
                }

                return null;
            };

            const storedRedirect = (() => {
                try {
                    return window.localStorage.getItem(POST_AUTH_REDIRECT_KEY);
                } catch {
                    return null;
                }
            })();
            const redirectCandidate = customRedirect || storedRedirect;
            const safeCustomRedirect = normalizeRedirect(redirectCandidate);
            if (storedRedirect) {
                try {
                    window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
                } catch {
                    // Non-blocking storage fallback.
                }
            }
            const isFriendPartyFlow = safeCustomRedirect?.startsWith('/friend-party') ?? false;

            const normalizeNetworksWithMcMaster = (networks: unknown): string[] => {
                const existing = Array.isArray(networks)
                    ? networks
                        .map((network) => String(network || '').trim())
                        .filter((network) => network.length > 0)
                    : [];

                const withoutMcMaster = existing.filter(
                    (network) => network.toLowerCase() !== MCMASTER_SCHOOL.toLowerCase()
                );

                return [MCMASTER_SCHOOL, ...withoutMcMaster];
            };

            const isFriendPartyProfileComplete = (extras: {
                age?: number | null;
                working_on?: string | null;
            } | null) => {
                const hasValidAge = typeof extras?.age === 'number' && extras.age >= 13 && extras.age <= 120;
                const hasWorkingOn = typeof extras?.working_on === 'string' && extras.working_on.trim().length > 0;
                return hasValidAge && hasWorkingOn;
            };

            // Check for YouTube permissions (provider_token)
            // If no provider_token, user likely didn't grant YouTube access
            const hasProviderToken = !!session.provider_token;

            if (!hasProviderToken) {
                // No YouTube access token - redirect to homepage with warning
                setStatus('YouTube access required. Redirecting...');
                await supabase.auth.signOut();
                setTimeout(() => router.push('/?youtube_required=true'), 1500);
                return;
            }

            // Try to verify YouTube access by making a test API call
            try {
                const testResponse = await fetch(
                    'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=1',
                    {
                        headers: {
                            'Authorization': `Bearer ${session.provider_token}`,
                        },
                    }
                );

                if (!testResponse.ok) {
                    // YouTube API rejected the token - user didn't grant YouTube scope
                    setStatus('YouTube access required. Redirecting...');
                    await supabase.auth.signOut();
                    setTimeout(() => router.push('/?youtube_required=true'), 1500);
                    return;
                }
            } catch (error) {
                // YouTube API call failed - assume no access
                setStatus('YouTube access required. Redirecting...');
                await supabase.auth.signOut();
                setTimeout(() => router.push('/?youtube_required=true'), 1500);
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
                }

                // Track referral if code exists (run for both new and existing profiles)
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

                            // Only track if referrer is not the user themselves
                            if (referrerId !== userId) {
                                // Import and call trackReferralSignup
                                const { trackReferralSignup } = await import('@/services/referral');
                                await trackReferralSignup(referrerId, userId, referralCode);
                            }
                        }

                        // Clear the referral code from localStorage
                        localStorage.removeItem('referral_code');
                    } catch (error) {
                        // Don't block the flow if referral tracking fails
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

            let friendPartyExtras: {
                age?: number | null;
                working_on?: string | null;
                networks?: string[] | null;
            } | null = null;

            if (isFriendPartyFlow) {
                try {
                    const { data: mcmasterSchool } = await supabase
                        .from('schools')
                        .select('id, name')
                        .ilike('name', 'McMaster%')
                        .limit(1)
                        .maybeSingle();

                    const profileUpdate: Record<string, unknown> = { school: MCMASTER_SCHOOL };
                    if (mcmasterSchool?.id) {
                        profileUpdate.school_id = mcmasterSchool.id;
                    }

                    const { error: profileUpdateError } = await supabase
                        .from('profiles')
                        .update(profileUpdate)
                        .eq('id', userId);

                    if (profileUpdateError && mcmasterSchool?.id) {
                        await supabase
                            .from('profiles')
                            .update({ school: MCMASTER_SCHOOL })
                            .eq('id', userId);
                    }
                } catch (e) {
                    // Non-blocking for auth flow.
                }

                const { data: extras } = await supabase
                    .from('user_profile_extras')
                    .select('age, working_on, networks')
                    .eq('user_id', userId)
                    .maybeSingle();

                const normalizedNetworks = normalizeNetworksWithMcMaster(extras?.networks);

                await supabase
                    .from('user_profile_extras')
                    .upsert({
                        user_id: userId,
                        college: MCMASTER_SCHOOL,
                        networks: normalizedNetworks,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });

                await ensureFriendPartyAttendance('link');

                friendPartyExtras = {
                    age: extras?.age ?? null,
                    working_on: extras?.working_on ?? null,
                    networks: normalizedNetworks,
                };
            }

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

            // Helper function to check friend count and route accordingly
            const routeBasedOnFriendCount = async () => {
                const { data: connections } = await supabase
                    .from('user_connections')
                    .select('sender_id, receiver_id')
                    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                    .eq('status', 'accepted');

                let friendCount = 0;
                if (connections) {
                    const friendIds = new Set<string>();
                    connections.forEach(conn => {
                        const otherId = conn.sender_id === userId ? conn.receiver_id : conn.sender_id;
                        friendIds.add(otherId);
                    });
                    friendCount = friendIds.size;
                }

                // Bypass /invite-friends; take returning users straight to network
                // if (friendCount >= 3) {
                //     router.push('/network');
                // } else {
                //     router.push('/invite-friends');
                // }
                router.push('/network');
            };

            // Kick off backend enrichment in the background.
            // This keeps sign-in fast while derive_interests + DNA run server-side.
            if (isFriendPartyFlow || isNew || isPartial) {
                fetch('/api/background-profile-enrichment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    keepalive: true,
                    body: JSON.stringify({
                        user_id: userId,
                        trigger_source: isFriendPartyFlow ? 'FRIEND_PARTY_SIGNIN' : 'AUTH_CALLBACK_SIGNIN',
                    }),
                }).catch(() => {
                    // Don't block login flow on background failures.
                });
            }

            // Friend-party should always continue to registration setup after OAuth.
            if (isFriendPartyFlow) {
                setStatus('Preparing your profile...');
                if (isFriendPartyProfileComplete(friendPartyExtras)) {
                    router.push('/friend-party/enrich');
                    return;
                }
                router.push('/friend-party/setup');
                return;
            }

            // Skip onboarding if user has already completed it (unless FORCE_ONBOARDING is true)
            if (hasCompletedOnboarding && !FORCE_ONBOARDING) {
                setStatus('Welcome back!');

                // Check for custom redirect (e.g., party page)
                if (safeCustomRedirect) {
                    router.push(safeCustomRedirect);
                    return;
                }

                // Route based on friend count for returning users
                await routeBasedOnFriendCount();

            } else if (FORCE_ONBOARDING || isNew) {
                // New user - needs full setup
                setStatus('Setting up your profile...');

                // Redirect to new onboarding flow
                router.push('/onboarding');

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
    }, [router, hasAuthError, customRedirect]);

    if (hasAuthError) {
        return null;
    }

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

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="callback-container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#fff'
            }}>
                <div className="callback-loader" style={{ textAlign: 'center', color: '#000' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid rgba(0, 0, 0, 0.1)',
                        borderTopColor: '#000',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
