'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { YouTubeService } from '@/services/youtube';
import styles from './page.module.css';

const STATUS_MESSAGES = [
    'Syncing your YouTube data...',
    'Analyzing your subscriptions...',
    'Finding your interests...',
    'Building your Digital DNA...',
    'Almost there...',
];

export default function BuildingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [statusIndex, setStatusIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Cycle through status messages
    useEffect(() => {
        const interval = setInterval(() => {
            setStatusIndex(prev => {
                if (prev < STATUS_MESSAGES.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Process DNA in the background
    useEffect(() => {
        if (!user) return;

        const processDNA = async () => {
            try {
                // Step 1: Sync YouTube data
                const { subsCount, likesCount } = await YouTubeService.syncYouTubeData(user.id);
                console.log(`Synced ${subsCount} subscriptions and ${likesCount} liked videos`);

                // Step 2: Derive interests (this calls the edge function)
                if (subsCount > 0 || likesCount > 0) {
                    await YouTubeService.deriveInterests(user.id);
                    console.log('Interests derived successfully');
                }

                // Wait a minimum of 4 seconds for the animation to complete
                await new Promise(resolve => setTimeout(resolve, 2000));

                setIsComplete(true);

                // Redirect after a brief success state
                setTimeout(() => {
                    router.push('/');
                }, 1500);

            } catch (err: any) {
                console.error('Error processing DNA:', err);
                // Don't block the user - still redirect even if there's an error
                setError('Some data could not be processed');

                setTimeout(() => {
                    router.push('/');
                }, 2000);
            }
        };

        // Start processing after a brief delay
        const timeout = setTimeout(processDNA, 500);
        return () => clearTimeout(timeout);
    }, [user, router]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Progress Bar */}
            <div className={styles.progressContainer}>
                <span className={styles.progressLabel}>Build your Digital DNA</span>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: '100%' }}></div>
                </div>
                <span className={styles.progressPercent}>100%</span>
            </div>

            <main className={styles.main}>
                {/* DNA Animation */}
                <div className={styles.dnaContainer}>
                    {isComplete ? (
                        <div className={styles.successIcon}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    ) : (
                        <div className={styles.dnaHelix}>
                            <div className={styles.strand1}></div>
                            <div className={styles.strand2}></div>
                            <div className={styles.particles}>
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={styles.particle}
                                        style={{
                                            animationDelay: `${i * 0.15}s`,
                                            left: `${15 + (i % 4) * 20}%`,
                                            top: `${10 + Math.floor(i / 4) * 30}%`
                                        }}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Text */}
                <div className={styles.statusContainer}>
                    {isComplete ? (
                        <>
                            <h2 className={styles.completeTitle}>DNA Created!</h2>
                            <p className={styles.completeText}>Taking you to your network...</p>
                        </>
                    ) : (
                        <>
                            <h2 className={styles.processingTitle}>Constructing your Digital DNA</h2>
                            <p className={styles.statusText}>{STATUS_MESSAGES[statusIndex]}</p>
                            {error && <p className={styles.errorText}>{error}</p>}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
