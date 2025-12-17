'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

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
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            // Check if this is a new user or partial user
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, interests, personality_archetypes, doppelgangers')
                .eq('id', userId)
                .maybeSingle();

            // Determine if user needs to complete profile setup

            // Check for interests
            const hasInterests = profile?.interests && profile.interests.length > 0;

            // Check for new features (archetypes, doppelgangers)
            // @ts-ignore
            const hasArchetypes = profile?.personality_archetypes && profile.personality_archetypes.length > 0;
            // @ts-ignore
            const hasDoppelgangers = profile?.doppelgangers && profile.doppelgangers.length > 0;

            const isFullyComplete = hasInterests && hasArchetypes && hasDoppelgangers;
            const isPartial = hasInterests && (!hasArchetypes || !hasDoppelgangers);
            const isNew = !hasInterests; // No interests means totally new

            const FORCE_ONBOARDING = false;

            if (FORCE_ONBOARDING || isNew) {
                // New user - needs full setup
                console.log('New user detected...');
                setStatus('Setting up your profile...');

                // Auto-populate profile from Google metadata
                const { user } = session;
                const metadata = user.user_metadata;
                const fullName = metadata?.full_name || metadata?.name || user.email?.split('@')[0] || 'User';
                const avatarUrl = metadata?.avatar_url || metadata?.picture || null;

                // Create/Update profile with Google data
                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        full_name: fullName,
                        avatar_url: avatarUrl,
                        star_color: '#8E5BFF', // Default
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'id' });

                if (upsertError) {
                    console.error('Error auto-creating profile:', upsertError);
                }

                router.push('/profile-setup/signals');

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
          background: #000;
        }
        
        .callback-loader {
          text-align: center;
          color: #fff;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fff;
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
