'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function OnboardingPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const router = useRouter();

    // If already authenticated, redirect to home
    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);



    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h1 className={styles.header}>Onboard</h1>

                {/* Cards Container */}
                <div className={styles.cardsContainer}>
                    {/* Card 1 - Social Media is Draining */}
                    <div className={`${styles.card} ${styles.card1}`}>
                        <div className={styles.cardIcon}>
                            <Image
                                src="/0bf184c5cd6e5a5fd5f2c0aadf7ab81aee0e2cb2.png"
                                alt="Social media icon"
                                width={120}
                                height={140}
                                className={styles.iconImage}
                            />
                        </div>
                        <div className={styles.cardContent}>
                            <h2 className={styles.cardTitle}>Social media is draining</h2>
                            <p className={styles.cardDescription}>
                                And honestly? Kind of broken. Constantly building an online presence for likes.
                                Chasing trends. New posts just to keep things alive. It&apos;s exhausting.
                            </p>
                        </div>
                    </div>

                    {/* Card 2 - Instagram grid is not the real you */}
                    <div className={`${styles.card} ${styles.card2}`}>
                        <div className={styles.cardIcon}>
                            <Image
                                src="/375d0ae05acd14e7200b69d5022248f54102f91f.png"
                                alt="Grid icon"
                                width={120}
                                height={140}
                                className={styles.iconImage}
                            />
                        </div>
                        <div className={styles.cardContent}>
                            <h2 className={styles.cardTitle}>Instagram grid is not the real you</h2>
                            <p className={styles.cardDescription}>
                                The real you is in your Spotify on repeat, your 3am YouTube rabbit holes,
                                your Discord convos. That&apos;s where your actual personality lives.
                            </p>
                        </div>
                    </div>

                    {/* Card 3 - No more performing */}
                    <div className={`${styles.card} ${styles.card3}`}>
                        <div className={styles.cardIcon}>
                            <Image
                                src="/a2f182e7f7b59b4fe488bf754951d5e8a7987a98.png"
                                alt="DNA icon"
                                width={120}
                                height={140}
                                className={styles.iconImage}
                            />
                        </div>
                        <div className={styles.cardContent}>
                            <h2 className={styles.cardTitle}>No more performing. The Network that understands you</h2>
                            <p className={styles.cardDescription}>
                                TheNetwork distills your online life into who you actually are then
                                connects you with people who get your interests.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Continue with Google Button */}
                <button className={styles.googleButton} onClick={signInWithGoogle}>
                    <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {/* Bottom text */}
                <p className={styles.bottomText}>
                    No posting. No DMs. No spam.
                </p>
            </main>
        </div>
    );
}
