'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

interface Platform {
    id: string;
    name: string;
    icon: string;
    color: string;
    available: boolean;
}

const PLATFORMS: Platform[] = [
    { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000', available: true },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000', available: false },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2', available: false },
    { id: 'x', name: 'X', icon: '𝕏', color: '#000000', available: false },
    { id: 'spotify', name: 'Spotify', icon: '🎧', color: '#1DB954', available: false },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F', available: false },
];

export default function SignalsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
    const [showTooltip, setShowTooltip] = useState<string | null>(null);
    const [showWhyModal, setShowWhyModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            router.push('/landing');
        }
    }, [user, loading, router]);

    // Check which platforms are already connected
    useEffect(() => {
        if (!user) return;

        const checkConnectedPlatforms = async () => {
            const supabase = createClient();

            // Check if YouTube data exists
            const { data: ytData } = await supabase
                .from('youtube_subscriptions')
                .select('channel_id')
                .eq('user_id', user.id)
                .limit(1);

            if (ytData && ytData.length > 0) {
                setConnectedPlatforms(['youtube']);
            }
        };

        checkConnectedPlatforms();
    }, [user]);

    const handlePlatformClick = (platform: Platform) => {
        if (!platform.available) {
            setShowTooltip(platform.id);
            setTimeout(() => setShowTooltip(null), 2000);
            return;
        }

        if (platform.id === 'youtube') {
            if (connectedPlatforms.includes('youtube')) {
                // Already connected
                setShowTooltip('youtube-connected');
                setTimeout(() => setShowTooltip(null), 2000);
            } else {
                // YouTube is connected via Google OAuth at sign-in
                // Show that it's already available due to Google sign-in
                setShowTooltip('youtube-ready');
                setTimeout(() => setShowTooltip(null), 2000);
                setConnectedPlatforms(prev => [...prev, 'youtube']);
            }
        }
    };

    const handleContinue = async () => {
        setIsProcessing(true);
        // Navigate to building page - the actual processing happens there
        router.push('/profile-setup/building');
    };

    const handleSkip = () => {
        router.push('/profile-setup/building');
    };

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
                    <div className={styles.progressFill} style={{ width: '66%' }}></div>
                </div>
                <span className={styles.progressPercent}>66%</span>
            </div>

            <main className={styles.main}>
                <h1 className={styles.title}>Connect your world</h1>
                <p className={styles.subtitle}>These help us understand who you really are</p>

                {/* Platform Grid */}
                <div className={styles.platformGrid}>
                    {PLATFORMS.map((platform) => (
                        <div
                            key={platform.id}
                            className={`${styles.platformCard} ${connectedPlatforms.includes(platform.id) ? styles.connected : ''} ${!platform.available ? styles.unavailable : ''}`}
                            onClick={() => handlePlatformClick(platform)}
                        >
                            <div
                                className={styles.platformIcon}
                                style={{
                                    background: connectedPlatforms.includes(platform.id)
                                        ? platform.color
                                        : '#f5f5f7'
                                }}
                            >
                                <span>{platform.icon}</span>
                            </div>
                            <span className={styles.platformName}>{platform.name}</span>

                            {connectedPlatforms.includes(platform.id) && (
                                <div className={styles.checkmark}>✓</div>
                            )}

                            {/* Tooltip */}
                            {showTooltip === platform.id && (
                                <div className={styles.tooltip}>Coming Soon</div>
                            )}
                            {showTooltip === 'youtube-connected' && platform.id === 'youtube' && (
                                <div className={styles.tooltip}>Already connected!</div>
                            )}
                            {showTooltip === 'youtube-ready' && platform.id === 'youtube' && (
                                <div className={styles.tooltipSuccess}>Connected via Google!</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Why add signals link */}
                <button
                    className={styles.whyLink}
                    onClick={() => setShowWhyModal(true)}
                >
                    Why add signals?
                </button>

                {/* Continue Button */}
                <button
                    className={styles.continueButton}
                    onClick={handleContinue}
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Processing...' : 'Continue →'}
                </button>

                {/* Skip Link */}
                <button
                    className={styles.skipLink}
                    onClick={handleSkip}
                >
                    Skip for now
                </button>
            </main>

            {/* Why Modal */}
            {showWhyModal && (
                <div className={styles.modalOverlay} onClick={() => setShowWhyModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Why add signals?</h2>
                        <div className={styles.modalContent}>
                            <p>
                                <strong>Your signals tell us who you really are.</strong>
                            </p>
                            <p>
                                Instead of filling out endless forms about your interests,
                                we analyze the content you actually consume — your YouTube subscriptions,
                                Spotify playlists, and more.
                            </p>
                            <p>
                                This creates a more authentic profile that helps us connect you
                                with people who share your genuine interests, not just what you
                                think sounds good on paper.
                            </p>
                            <p className={styles.modalNote}>
                                🔒 Your data is private. We never post or share your information.
                            </p>
                        </div>
                        <button
                            className={styles.modalClose}
                            onClick={() => setShowWhyModal(false)}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
