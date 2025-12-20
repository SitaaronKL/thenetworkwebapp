'use client';

import React from 'react';
import styles from './InterestExplanationModal.module.css';

interface InterestExplanationModalProps {
    interest: string;
    explanation: string | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

export default function InterestExplanationModal({
    interest,
    explanation,
    isLoading,
    error,
    onClose
}: InterestExplanationModalProps) {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>{interest}</h2>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                            <p>Decoding your interest DNA...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.error}>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <p className={styles.explanation}>{explanation}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
