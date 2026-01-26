'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function AuthPage() {
    const router = useRouter();
    const { user, loading, signInWithGoogle } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/network');
        }
    }, [user, loading, router]);

    if (loading || user) {
        return (
            <div className={styles.container}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    const handleExistingUser = () => {
        // Existing users go straight to Google login
        signInWithGoogle();
    };

    const handleNewUser = () => {
        // New users go to consent/terms page first
        router.push('/consent');
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logoContainer}>
                    <img 
                        src="/app_icon.svg" 
                        alt="The Network" 
                        className={styles.logo}
                    />
                </div>

                {/* Title */}
                <h1 className={`${styles.title} font-brand`}>Welcome</h1>
                <p className={styles.subtitle}>Are you new to The Network?</p>

                {/* Buttons */}
                <div className={styles.buttons}>
                    <button
                        onClick={handleNewUser}
                        className={styles.primaryButton}
                    >
                        I'm new here
                    </button>
                    <button
                        onClick={handleExistingUser}
                        className={styles.secondaryButton}
                    >
                        I have an account
                    </button>
                </div>
            </div>
        </div>
    );
}
