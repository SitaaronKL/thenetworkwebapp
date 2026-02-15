'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

export default function SmsConsentPage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <button
                        className={styles.backButton}
                        onClick={() => router.back()}
                        aria-label="Go back"
                    >
                        ← Back
                    </button>
                    <h1 className={styles.title}>SMS Opt-In &amp; Verification Flow – TheNetwork</h1>
                </div>

                {/* Intro */}
                <div className={styles.intro}>
                    <h2 className={styles.introTitle}>SMS Consent &amp; Verification Process</h2>
                    <p className={styles.introText}>
                        TheNetwork uses SMS messaging solely to deliver one-time verification codes (OTP) during account signup and login.
                    </p>
                    <p className={styles.introText}>
                        SMS messages are sent only after a user voluntarily enters their phone number within the TheNetwork mobile application and taps &quot;Continue&quot; to request verification.
                    </p>
                    <p className={styles.introText}>
                        No marketing, promotional, or recurring messages are sent through this campaign.
                    </p>
                    <p className={styles.introText}>
                        Message and data rates may apply.
                    </p>
                    <p className={styles.introText}>
                        Users may reply STOP to opt out or HELP for assistance.
                    </p>
                    <p className={styles.introText}>
                        Privacy Policy:{' '}
                        <a href="https://www.thenetwork.life/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.link}>
                            https://www.thenetwork.life/privacy-policy
                        </a>
                    </p>
                    <p className={styles.introText}>
                        Terms of Service:{' '}
                        <a href="https://www.thenetwork.life/terms-of-service" target="_blank" rel="noopener noreferrer" className={styles.link}>
                            https://www.thenetwork.life/terms-of-service
                        </a>
                    </p>
                </div>

                {/* Steps */}
                <div className={styles.sections}>
                    {/* Step 1 */}
                    <section className={styles.step}>
                        <div className={styles.stepHeader}>
                            <span className={styles.stepNumber}>1</span>
                            <h2 className={styles.stepTitle}>Privacy &amp; Terms Acknowledgment</h2>
                        </div>
                        <p className={styles.stepText}>
                            Users must review and accept TheNetwork&apos;s Privacy Policy and Terms of Service before continuing with account setup.
                        </p>
                        <div className={styles.screenshotContainer}>
                            <Image src="/sms-consent/1a.png" alt="Privacy & Terms Acknowledgment screen – initial view" width={300} height={650} className={styles.screenshot} />
                            <Image src="/sms-consent/1b.png" alt="Privacy & Terms Acknowledgment screen – continue button" width={300} height={650} className={styles.screenshot} />
                        </div>
                    </section>

                    {/* Step 2 */}
                    <section className={styles.step}>
                        <div className={styles.stepHeader}>
                            <span className={styles.stepNumber}>2</span>
                            <h2 className={styles.stepTitle}>Identity Verification Notice</h2>
                        </div>
                        <p className={styles.stepText}>
                            Users are informed that identity verification is required before access to the platform is granted.
                        </p>
                        <div className={styles.screenshotContainer}>
                            <Image src="/sms-consent/2a.png" alt="Identity Verification Notice screen – confirm real person" width={300} height={650} className={styles.screenshot} />
                            <Image src="/sms-consent/2b.png" alt="Identity Verification Notice screen – phone number prompt" width={300} height={650} className={styles.screenshot} />
                        </div>
                    </section>

                    {/* Step 3 */}
                    <section className={styles.step}>
                        <div className={styles.stepHeader}>
                            <span className={styles.stepNumber}>3</span>
                            <h2 className={styles.stepTitle}>Phone Number Entry</h2>
                        </div>
                        <p className={styles.stepText}>
                            Users voluntarily enter their phone number in the app and tap &quot;Continue&quot; to request a one-time SMS verification code.
                        </p>
                        <div className={styles.screenshotContainer}>
                            <Image src="/sms-consent/3.png" alt="Phone Number Entry screen" width={300} height={650} className={styles.screenshot} />
                        </div>
                    </section>

                    {/* Step 4 */}
                    <section className={styles.step}>
                        <div className={styles.stepHeader}>
                            <span className={styles.stepNumber}>4</span>
                            <h2 className={styles.stepTitle}>Verification Code Sent</h2>
                        </div>
                        <p className={styles.stepText}>
                            After the user taps &quot;Continue,&quot; a one-time passcode (OTP) is sent via SMS to the provided phone number.
                        </p>
                        <div className={styles.screenshotContainer}>
                            <Image src="/sms-consent/4.png" alt="Verification Code Sent screen" width={300} height={650} className={styles.screenshot} />
                        </div>
                    </section>

                    {/* Step 5 */}
                    <section className={styles.step}>
                        <div className={styles.stepHeader}>
                            <span className={styles.stepNumber}>5</span>
                            <h2 className={styles.stepTitle}>Code Entry &amp; Authentication</h2>
                        </div>
                        <p className={styles.stepText}>
                            The user enters the one-time code received via SMS to complete account verification.
                        </p>
                        <div className={styles.screenshotContainer}>
                            <Image src="/sms-consent/5.png" alt="Code Entry & Authentication screen" width={300} height={650} className={styles.screenshot} />
                        </div>
                    </section>

                    {/* Important Notes */}
                    <section className={styles.notesSection}>
                        <h2 className={styles.notesTitle}>Important Notes</h2>
                        <ul className={styles.notesList}>
                            <li>SMS messages are strictly transactional and used only for identity verification.</li>
                            <li>TheNetwork does not send marketing or promotional SMS messages under this campaign.</li>
                            <li>Messages are sent only after the user initiates the verification process.</li>
                            <li>Users can reply STOP to opt out at any time.</li>
                            <li>Users can reply HELP for assistance.</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        className={styles.backButtonBottom}
                        onClick={() => router.back()}
                    >
                        ← Back
                    </button>
                </div>
            </div>
        </div>
    );
}
