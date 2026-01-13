'use client';

import { useState, useEffect } from 'react';
import { NetworkPerson } from '@/types/network';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import styles from './ProfileModal.module.css';

interface ProfileModalProps {
    person: NetworkPerson;
    onClose: () => void;
}

// Parse vector from database (handles both string and array formats)
function parseVector(vector: any): number[] | null {
    if (!vector) return null;
    
    if (Array.isArray(vector)) {
        return vector.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
    }
    
    if (typeof vector === 'string') {
        try {
            const parsed = JSON.parse(vector);
            if (Array.isArray(parsed)) {
                return parsed.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
            }
        } catch {
            return null;
        }
    }
    
    return null;
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const normASqrt = Math.sqrt(normA);
    const normBSqrt = Math.sqrt(normB);
    if (normASqrt === 0 || normBSqrt === 0) return 0;
    return dotProduct / (normASqrt * normBSqrt);
}

/**
 * Apply stricter scaling to compatibility scores to make high scores less common
 * Uses power function (similarity^1.8) to create a more realistic distribution
 * This matches the scaling applied in the database function
 */
function scaleCompatibilityScore(rawSimilarity: number): number {
    // Clamp to [0, 1]
    const clamped = Math.max(0, Math.min(1, rawSimilarity));
    // Apply power function to make high scores less common
    return Math.pow(clamped, 1.8);
}

// Calculate stars from similarity
function calculateStars(similarity: number): number {
    const percent = Math.round(similarity * 100);
    if (percent >= 75) return 5;
    if (percent >= 50) return 4;
    if (percent >= 30) return 3;
    if (percent >= 15) return 2;
    return 1;
}

export default function ProfileModal({ person, onClose }: ProfileModalProps) {
    const { user } = useAuth();
    const [compatibilityDescription, setCompatibilityDescription] = useState<string>('');
    const [compatibilityPercentage, setCompatibilityPercentage] = useState<number | null>(null);
    const [sharedInterests, setSharedInterests] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<any>(null);

    useEffect(() => {
        if (!user || !person) return;
        
        const loadCompatibility = async () => {
            setIsLoading(true);
            const supabase = createClient();

            try {
                // Get current user's profile
                const { data: currentUserProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name, interests, bio')
                    .eq('id', user.id)
                    .single();

                // Get other person's profile
                const { data: otherProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name, interests, bio, avatar_url')
                    .eq('id', person.id)
                    .single();

                if (!currentUserProfile || !otherProfile) {
                    setIsLoading(false);
                    return;
                }

                setProfileData(otherProfile);

                // Calculate shared interests
                const userInterests = (currentUserProfile.interests || []) as string[];
                const otherInterests = (otherProfile.interests || []) as string[];
                const shared = userInterests.filter(i => otherInterests.includes(i));
                setSharedInterests(shared);

                // Get compatibility score from user_matches table (pre-calculated using DNA v2)
                const { data: matchData } = await supabase
                    .from('user_matches')
                    .select('compatibility_percentage, similarity_score, shared_interests')
                    .eq('user_id', user.id)
                    .eq('match_user_id', person.id)
                    .maybeSingle();

                let similarity = 0;
                if (matchData?.compatibility_percentage != null) {
                    // Use stored compatibility percentage from user_matches
                    setCompatibilityPercentage(matchData.compatibility_percentage);
                    // Convert percentage back to similarity for fallback calculations
                    similarity = matchData.compatibility_percentage / 100;
                    
                    // Update shared interests from stored data if available
                    if (matchData.shared_interests && Array.isArray(matchData.shared_interests)) {
                        setSharedInterests(matchData.shared_interests as string[]);
                    }
                } else if (matchData?.similarity_score != null) {
                    // Fallback: use similarity_score if compatibility_percentage is not available
                    similarity = matchData.similarity_score;
                    setCompatibilityPercentage(Math.round(similarity * 100));
                    
                    // Update shared interests from stored data if available
                    if (matchData.shared_interests && Array.isArray(matchData.shared_interests)) {
                        setSharedInterests(matchData.shared_interests as string[]);
                    }
                } else {
                    // Fallback: Calculate on-the-fly if not in user_matches table
                    // Try DNA v2 first, then DNA v1
                    const { data: userDnaV2 } = await supabase
                        .from('digital_dna_v2')
                        .select('composite_vector')
                        .eq('user_id', user.id)
                        .single();

                    const { data: otherDnaV2 } = await supabase
                        .from('digital_dna_v2')
                        .select('composite_vector')
                        .eq('user_id', person.id)
                        .single();

                    if (userDnaV2?.composite_vector && otherDnaV2?.composite_vector) {
                        const userVec = parseVector(userDnaV2.composite_vector);
                        const otherVec = parseVector(otherDnaV2.composite_vector);
                        if (userVec && otherVec && userVec.length > 0 && otherVec.length > 0) {
                            const rawSimilarity = cosineSimilarity(userVec, otherVec);
                            similarity = scaleCompatibilityScore(rawSimilarity);
                        }
                    } else {
                        // Fallback to DNA v1
                        const { data: userDnaV1 } = await supabase
                            .from('digital_dna_v1')
                            .select('interest_vector')
                            .eq('user_id', user.id)
                            .single();

                        const { data: otherDnaV1 } = await supabase
                            .from('digital_dna_v1')
                            .select('interest_vector')
                            .eq('user_id', person.id)
                            .single();

                        if (userDnaV1?.interest_vector && otherDnaV1?.interest_vector) {
                            const userVec = parseVector(userDnaV1.interest_vector);
                            const otherVec = parseVector(otherDnaV1.interest_vector);
                            if (userVec && otherVec && userVec.length > 0 && otherVec.length > 0) {
                                const rawSimilarity = cosineSimilarity(userVec, otherVec);
                                similarity = scaleCompatibilityScore(rawSimilarity);
                            }
                        }
                    }

                    // If no DNA found, use shared interests as fallback
                    if (similarity === 0 && sharedInterests.length > 0) {
                        const totalInterests = new Set([...userInterests, ...otherInterests]).size;
                        const rawSimilarity = sharedInterests.length / Math.max(totalInterests, 1);
                        similarity = scaleCompatibilityScore(rawSimilarity);
                    }
                    
                    // Trigger background calculation to store this score for future use
                    // (non-blocking, fire-and-forget)
                    supabase.functions.invoke('update-dna-v2-compatibility', {
                        body: { user_id: user.id }
                    }).catch(() => {
                        // Silently fail - this is just for caching
                    });
                }

                // Convert similarity (0-1) to percentage (0-100)
                const percentage = Math.round(similarity * 100);
                setCompatibilityPercentage(percentage);

                // Check for cached compatibility description
                const userAId = user.id < person.id ? user.id : person.id;
                const userBId = user.id < person.id ? person.id : user.id;

                const { data: cached } = await supabase
                    .from('user_compatibility_descriptions')
                    .select('description')
                    .eq('user_a_id', userAId)
                    .eq('user_b_id', userBId)
                    .maybeSingle();

                if (cached && cached.description) {
                    setCompatibilityDescription(cached.description);
                } else {
                    // Generate new description
                    const { data: reasonData, error: reasonError } = await supabase.functions.invoke(
                        'generate-suggestion-reason',
                        {
                            body: {
                                userAId: user.id,
                                userBId: person.id,
                                userProfile: {
                                    interests: userInterests,
                                    bio: currentUserProfile.bio || ''
                                },
                                candidateProfile: {
                                    interests: otherInterests,
                                    bio: otherProfile.bio || ''
                                },
                                similarity: similarity
                            }
                        }
                    );

                    if (!reasonError && reasonData?.reason) {
                        setCompatibilityDescription(reasonData.reason);
                    }
                }
            } catch (error) {
                // Error loading compatibility
            } finally {
                setIsLoading(false);
            }
        };

        loadCompatibility();
    }, [user, person]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className={styles.closeButton} onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Avatar */}
                <div className={styles.avatarContainer}>
                    {person.imageUrl ? (
                        <img
                            src={person.imageUrl}
                            alt={person.name}
                            className={`${styles.avatar} invert-media`}
                        />
                    ) : (
                        <div className={styles.avatarPlaceholder}>
                            {person.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Name */}
                <h2 className={styles.name}>{person.name}</h2>

                {/* Compatibility Percentage */}
                {compatibilityPercentage !== null && (
                    <div className={styles.compatibilityPercentage}>
                        <span className={styles.percentageValue}>{compatibilityPercentage}%</span>
                        <span className={styles.percentageLabel}>Compatibility</span>
                    </div>
                )}

                {/* Bio */}
                {profileData?.bio && (
                    <p className={styles.bio}>{profileData.bio}</p>
                )}

                {/* Shared Interests */}
                {sharedInterests.length > 0 && (
                    <div className={styles.sharedInterests}>
                        <div className={styles.sharedInterestsTitle}>Shared Interests:</div>
                        <div className={styles.interestsList}>
                            {sharedInterests.map((interest, i) => (
                                <span key={i} className={styles.interestTag}>{interest}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Compatibility Description */}
                {isLoading ? (
                    <div className={styles.loading}>Loading compatibility...</div>
                ) : compatibilityDescription ? (
                    <div className={styles.compatibilitySection}>
                        <div className={styles.compatibilityTitle}>Why You'd Connect:</div>
                        <div className={styles.compatibilityDescription}>{compatibilityDescription}</div>
                    </div>
                ) : null}

                {/* Connection info */}
                <div className={styles.connectionInfo}>
                    <span className={styles.connectionCount}>
                        {person.connections.length} connections
                    </span>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.messageButton}>
                        Message
                    </button>
                </div>
            </div>
        </div>
    );
}
