import React from 'react';
import styles from './CandidateDetailModal.module.css';
import { RecommendationCandidate } from '@/types/aria';

interface Props {
    candidate: RecommendationCandidate;
    onClose: () => void;
    onInvite: (id: string) => void;
    isPending: boolean;
    isConnected: boolean;
}

export default function CandidateDetailModal({ candidate, onClose, onInvite, isPending, isConnected }: Props) {
    if (!candidate) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>

                <div className={styles.header}>
                    <img
                        src={candidate.avatarUrl || '/assets/onboarding/tn_logo_black.png'}
                        alt={candidate.name}
                        className={styles.avatar}
                        onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = '/assets/onboarding/tn_logo_black.png';
                            if (target.src.includes(fallback)) return;
                            target.src = fallback;
                        }}
                    />
                    <div className={styles.headerInfo}>
                        <h2 className={styles.name}>{candidate.name}</h2>
                        <p className={styles.headline}>{candidate.headline || 'Member'}</p>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Why you should meet</h3>
                        <p className={styles.matchReason}>
                            {candidate.matchReason || "Aria thinks this would be a great connection for you based on your shared interests and goals."}
                        </p>
                    </div>

                    {/* Add more sections here if data exists, e.g. Skills, Bio */}
                </div>

                <div className={styles.footer}>
                    {isConnected ? (
                        <button className={`${styles.actionButton} ${styles.connected}`} disabled>
                            Connected
                        </button>
                    ) : isPending ? (
                        <button className={`${styles.actionButton} ${styles.pending}`} disabled>
                            Request Pending
                        </button>
                    ) : (
                        <button className={`${styles.actionButton} ${styles.connect}`} onClick={() => onInvite(candidate.id)}>
                            Connect
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
