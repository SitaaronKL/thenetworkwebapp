'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function ConsentPage() {
    const router = useRouter();
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
    const [agreedToTermsOfService, setAgreedToTermsOfService] = useState(false);
    const [agreedToTermsOfUse, setAgreedToTermsOfUse] = useState(false);

    const allAgreed = agreedToPrivacy && agreedToTermsOfService && agreedToTermsOfUse;

    const handleContinue = () => {
        if (allAgreed) {
            // Store consent in localStorage or sessionStorage
            localStorage.setItem('consent_agreed', 'true');
            localStorage.setItem('consent_timestamp', new Date().toISOString());
            router.push('/onboarding');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Agreement Required</h1>
                    <p className={styles.subtitle}>
                        To continue, please review and agree to our policies
                    </p>
                </div>

                {/* Agreement Items */}
                <div className={styles.agreements}>
                    {/* Privacy Policy */}
                    <div className={styles.agreementItem}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={agreedToPrivacy}
                                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.checkboxText}>
                                I have read and agree to the{' '}
                                <Link href="/privacy-policy" target="_blank" className={styles.link}>
                                    Privacy Policy
                                </Link>
                            </span>
                        </label>
                    </div>

                    {/* Terms of Service */}
                    <div className={styles.agreementItem}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={agreedToTermsOfService}
                                onChange={(e) => setAgreedToTermsOfService(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.checkboxText}>
                                I have read and agree to the{' '}
                                <Link href="/terms-of-service" target="_blank" className={styles.link}>
                                    Terms of Service
                                </Link>
                            </span>
                        </label>
                    </div>

                    {/* Terms of Use */}
                    <div className={styles.agreementItem}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={agreedToTermsOfUse}
                                onChange={(e) => setAgreedToTermsOfUse(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span className={styles.checkboxText}>
                                I have read and agree to the{' '}
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
                        By agreeing, you acknowledge that you have read, understood, and accept all three policies. 
                        You can review these policies at any time using the links above.
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
                        className={`${styles.continueButton} ${!allAgreed ? styles.disabled : ''}`}
                    >
                        Continue to Onboarding
                    </button>
                </div>
            </div>
        </div>
    );
}

