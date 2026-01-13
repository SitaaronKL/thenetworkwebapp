'use client';

import React, { useState } from 'react';
import styles from './CandidateCard.module.css';
import { RecommendationCandidate } from '@/types/aria';
import { createClient } from '@/lib/supabase';

interface CandidateCardProps {
    candidate: RecommendationCandidate;
    connectionStatus: 'connected' | 'pending' | 'none';
    onInvite: (id: string) => void;
    onSkip: (id: string) => void;
}

export default function CandidateCard({ candidate, connectionStatus, onInvite, onSkip }: CandidateCardProps) {
    const [loading, setLoading] = useState(false);

    const handleInvite = async () => {
        setLoading(true);
        await onInvite(candidate.id);
        setLoading(false);
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.avatarWrapper}>
                    {candidate.avatarUrl ? (
                        <img src={candidate.avatarUrl} alt={candidate.name} className={`${styles.avatar} invert-media`} />
                    ) : (
                        <div className={styles.avatarPlaceholder}>{candidate.name[0]}</div>
                    )}
                    <div className={styles.matchBadge}>{Math.round(candidate.matchScore * 100)}% Match</div>
                </div>
                <div className={styles.info}>
                    <h3 className={styles.name}>{candidate.name}</h3>
                    <p className={styles.headline}>{candidate.headline || 'Network Member'}</p>
                </div>
            </div>

            <div className={styles.reasoning}>
                <p>{candidate.matchReason}</p>
            </div>

            <div className={styles.actions}>
                {connectionStatus === 'connected' ? (
                    <div className={styles.connectedBadge}>Connected</div>
                ) : connectionStatus === 'pending' ? (
                    <div className={styles.pendingBadge}>Invite Sent</div>
                ) : (
                    <>
                        <button className={styles.skipButton} onClick={() => onSkip(candidate.id)}>Skip</button>
                        <button
                            className={styles.inviteButton}
                            onClick={handleInvite}
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Connect'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
