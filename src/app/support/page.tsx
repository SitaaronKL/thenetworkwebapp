'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SupportPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim() || null,
                    message: message.trim(),
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to submit');
            }

            setSubmitted(true);
        } catch {
            setError('Something went wrong. Please try emailing us at support@thenetwork.life instead.');
        } finally {
            setSubmitting(false);
        }
    };

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
                        &larr; Back
                    </button>
                    <h1 className={styles.title}>Support</h1>
                    <p className={styles.subtitle}>
                        Have a question, issue, or feedback? Let us know and we&apos;ll get back to you.
                    </p>
                </div>

                {submitted ? (
                    <div className={styles.successMessage}>
                        <h2 className={styles.successTitle}>Message Sent</h2>
                        <p className={styles.successText}>
                            Thanks for reaching out! We&apos;ll review your message and get back to you as soon as possible.
                        </p>
                        <button
                            className={styles.successBackButton}
                            onClick={() => router.back()}
                        >
                            &larr; Go Back
                        </button>
                    </div>
                ) : (
                    <>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="email">
                                    Email (optional)
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    className={styles.input}
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label} htmlFor="message">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    className={styles.textarea}
                                    placeholder="Describe your issue or feedback..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className={styles.errorText}>{error}</p>}

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={submitting || !message.trim()}
                            >
                                {submitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>

                        <div className={styles.contactInfo}>
                            <p>
                                You can also reach us directly at{' '}
                                <a href="mailto:support@thenetwork.life" className={styles.link}>
                                    support@thenetwork.life
                                </a>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
