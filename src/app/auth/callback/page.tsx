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

            try {
                const result = await waitForSession;
                userId = result.userId;
            } catch (error: any) {
                console.error('Session error:', error);
                setStatus('Authentication failed. Redirecting...');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            // Check if this is a new user by checking if they have a profile with interests
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, interests, age')
                .eq('id', userId)
                .maybeSingle();

            // Determine if user needs to complete profile setup
            // New user = no profile, OR profile exists but hasn't completed setup (no age = hasn't gone through wizard)
            const needsProfileSetup = !profile || profile.age === null;

            if (needsProfileSetup) {
                // New user or incomplete profile - send to profile setup wizard
                console.log('New user detected, redirecting to profile setup...');
                setStatus('Setting up your profile...');
                router.push('/profile-setup');
            } else {
                // Existing user with complete profile - go to home
                console.log('Existing user, redirecting to home...');
                router.push('/');
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
