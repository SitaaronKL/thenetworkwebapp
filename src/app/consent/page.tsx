'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

function ConsentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const slideIn = searchParams.get('slideIn') === 'true';
    
    const [agreed, setAgreed] = useState(false);
    const [shake, setShake] = useState(false);
    const [isAnimating, setIsAnimating] = useState(slideIn);

    const allAgreed = agreed;

    const { user, loading, signInWithGoogle } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            router.push('/network');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (slideIn) {
            // Trigger the animation after mount
            const timer = setTimeout(() => setIsAnimating(false), 50);
            return () => clearTimeout(timer);
        }
    }, [slideIn]);

    if (loading || user) return null;

    const handleAcceptAll = () => {
        setAgreed(true);
    };

    const handleContinue = () => {
        if (!allAgreed) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }
        // Store consent in localStorage
        localStorage.setItem('consent_agreed', 'true');
        localStorage.setItem('consent_timestamp', new Date().toISOString());
        // Trigger Google sign-in
        signInWithGoogle();
    };

    return (
        <div className={`${styles.container} font-ui ${slideIn ? styles.slideInContainer : ''} ${isAnimating ? styles.slideInStart : ''}`}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={`${styles.title} font-brand`}>Agreement Required</h1>
                    <p className={styles.subtitle}>
                        To continue, please review and agree to our policies
                    </p>
                </div>

                {/* Agreement Items */}
                <div className={styles.agreements}>
                    <div className={styles.agreementItem}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.checkboxText}>
                                I have read and agree to the{' '}
                                <Link href="/privacy-policy" target="_blank" className={styles.link}>
                                    Privacy Policy
                                </Link>
                                {' / '}
                                <Link href="/terms-of-use" target="_blank" className={styles.link}>
                                    Terms of Use
                                </Link>
                            </span>
                        </label>
                    </div>
                </div>

                {/* Info Box */}
                <div className={styles.infoBox}>
                    <p className={styles.infoText}>
                        By agreeing, you acknowledge our Privacy Policy and Terms of Use. You also agree to be respectful to others—we reserve the right to remove accounts for any abusive behavior. Your use of this app is also subject to Google&apos;s Terms of Service.
                    </p>
                </div>

                {/* YouTube Account Note */}
                <div className={styles.infoBox} style={{ marginBottom: '16px', borderLeft: 'none' }}>
                    <p className={styles.infoText} style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', color: '#3b82f6' }}>
                        Sign up with your most active YouTube account and don&apos;t forget to tick that checkbox!
                    </p>
                </div>

                {/* Action Buttons */}
                <div className={styles.actions}>
                    <button
                        onClick={() => router.back()}
                        className={styles.backButton}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleContinue}
                        disabled={!allAgreed}
                        className={`${styles.continueButton} ${!allAgreed ? styles.disabled : ''} ${shake ? styles.shake : ''}`}
                    >
                        Continue with YouTube →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ConsentPage() {
    return (
        <Suspense fallback={<div className={styles.container} />}>
            <ConsentContent />
        </Suspense>
    );
}

