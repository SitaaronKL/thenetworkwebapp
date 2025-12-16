'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // If already authenticated, redirect to home
    useEffect(() => {
        if (!loading && user) {
            router.push('/');
        }
    }, [user, loading, router]);

    const handleClaimDNA = () => {
        router.push('/onboarding');
    };

    const handleSeeExample = () => {
        // Placeholder - can be implemented later
        console.log('See example clicked');
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
            <main className={styles.main}>
                {/* Logo Image */}
                <div className={styles.logoSection}>
                    <Image
                        src="/TheNetwork.svg"
                        alt="TheNetwork"
                        width={431}
                        height={86}
                        priority
                        className={styles.logoImage}
                    />
                    <p className={styles.tagline}>Control who you are online</p>
                </div>

                {/* CTA Buttons */}
                <div className={styles.ctaSection}>
                    <button className={styles.primaryButton} onClick={handleClaimDNA}>
                        Claim my Digital DNA
                    </button>
                    <button className={styles.secondaryButton} onClick={handleSeeExample}>
                        See an example
                    </button>
                </div>

                {/* Trust badges */}
                <div className={styles.trustBadges}>
                    <span>Private by default</span>
                    <span className={styles.dot}>•</span>
                    <span>You control what you connect</span>
                    <span className={styles.dot}>•</span>
                    <span>Understand yourself and find people similar to you</span>
                </div>
            </main>

            {/* Footer */}
            <footer className={styles.footer}>
                <a href="#" className={styles.footerLink}>Privacy</a>
                <a href="#" className={styles.footerLink}>Terms of Service</a>
                <a href="#" className={styles.footerLink}>Terms of Use</a>
            </footer>
        </div>
    );
}
