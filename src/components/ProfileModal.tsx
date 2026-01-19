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

type RequestStatus = 'none' | 'pending' | 'accepted' | 'checking';

export default function ProfileModal({ person, onClose }: ProfileModalProps) {
    const { user } = useAuth();
    const [compatibilityDescription, setCompatibilityDescription] = useState<string>('');
    const [compatibilityPercentage, setCompatibilityPercentage] = useState<number | null>(null);
    const [sharedInterests, setSharedInterests] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<any>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [requestStatus, setRequestStatus] = useState<RequestStatus>('checking');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!user || !person) return;
        
        const loadCompatibility = async () => {
            setIsLoading(true);
            const supabase = createClient();

            try {
                // First, check connection status
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    setIsLoading(false);
                    return;
                }

                // Check for existing friend requests between these two users
                const { data: existingRequests } = await supabase
                    .from('friend_requests')
                    .select('sender_id, receiver_id, status')
                    .or(`and(sender_id.eq.${authUser.id},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${authUser.id})`);

                // Check for existing connections between these two users
                const { data: existingConnections } = await supabase
                    .from('user_connections')
                    .select('sender_id, receiver_id, status')
                    .or(`and(sender_id.eq.${authUser.id},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${authUser.id})`);

                // Check if already connected
                const connected = (existingConnections || []).some(conn =>
                    ((conn.sender_id === authUser.id && conn.receiver_id === person.id) ||
                     (conn.receiver_id === authUser.id && conn.sender_id === person.id)) &&
                    conn.status === 'accepted'
                );

                // Also check friend_requests for accepted status
                const friendRequestAccepted = (existingRequests || []).some(req =>
                    ((req.sender_id === authUser.id && req.receiver_id === person.id) ||
                     (req.receiver_id === authUser.id && req.sender_id === person.id)) &&
                    req.status === 'accepted'
                );

                const isAlreadyConnected = connected || friendRequestAccepted;
                setIsConnected(isAlreadyConnected);

                // Set request status
                if (isAlreadyConnected) {
                    setRequestStatus('accepted');
                } else {
                    const foundRequest = (existingRequests || []).find(req =>
                        ((req.sender_id === authUser.id && req.receiver_id === person.id) ||
                         (req.receiver_id === authUser.id && req.sender_id === person.id))
                    );
                    if (foundRequest) {
                        setRequestStatus(foundRequest.status === 'pending' ? 'pending' : 'accepted');
                    } else {
                        setRequestStatus('none');
                    }
                }

                // Load profile data for connected users (still generate AI description)
                if (isAlreadyConnected) {
                    // Get current user's profile
                    const { data: currentUserProfile } = await supabase
                        .from('profiles')
                        .select('id, full_name, interests, bio')
                        .eq('id', user.id)
                        .single();

                    // Load profile data with more fields
                    const { data: otherProfile } = await supabase
                        .from('profiles')
                        .select('id, full_name, interests, bio, avatar_url, school, location')
                        .eq('id', person.id)
                        .single();
                    
                    if (otherProfile) {
                        setProfileData(otherProfile);
                        
                        // Calculate shared interests between users
                        const otherInterests = (otherProfile.interests || []) as string[];
                        
                        // Generate AI description for connected users too
                        if (currentUserProfile) {
                            const userInterests = (currentUserProfile.interests || []) as string[];
                            // Find common interests
                            const shared = userInterests.filter(i => 
                                otherInterests.some(oi => oi.toLowerCase() === i.toLowerCase())
                            );
                            setSharedInterests(shared.length > 0 ? shared : otherInterests.slice(0, 5));

                            // Get compatibility score for connected users - check both directions
                            const { data: matchData1 } = await supabase
                                .from('user_matches')
                                .select('compatibility_percentage, similarity_score')
                                .eq('user_id', user.id)
                                .eq('match_user_id', person.id)
                                .maybeSingle();

                            const { data: matchData2 } = await supabase
                                .from('user_matches')
                                .select('compatibility_percentage, similarity_score')
                                .eq('user_id', person.id)
                                .eq('match_user_id', user.id)
                                .maybeSingle();

                            const matchData = matchData1 || matchData2;

                            if (matchData?.compatibility_percentage != null) {
                                setCompatibilityPercentage(matchData.compatibility_percentage);
                            } else if (matchData?.similarity_score != null) {
                                setCompatibilityPercentage(Math.round(matchData.similarity_score * 100));
                            } else {
                                // Calculate on-the-fly from DNA as fallback
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
                                        const scaledSimilarity = scaleCompatibilityScore(rawSimilarity);
                                        setCompatibilityPercentage(Math.round(scaledSimilarity * 100));
                                    }
                                }
                            }
                            
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
                                            similarity: 0.5 // Default similarity for connected users
                                        }
                                    }
                                );

                                if (!reasonError && reasonData?.reason) {
                                    setCompatibilityDescription(reasonData.reason);
                                }
                            }
                        }
                    }
                    setIsLoading(false);
                    return;
                }

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
                // Check both directions since matches can be stored either way
                const { data: matchData1 } = await supabase
                    .from('user_matches')
                    .select('compatibility_percentage, similarity_score, shared_interests')
                    .eq('user_id', user.id)
                    .eq('match_user_id', person.id)
                    .maybeSingle();

                const { data: matchData2 } = await supabase
                    .from('user_matches')
                    .select('compatibility_percentage, similarity_score, shared_interests')
                    .eq('user_id', person.id)
                    .eq('match_user_id', user.id)
                    .maybeSingle();

                const matchData = matchData1 || matchData2;

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

    const handleSendRequest = async () => {
        if (!person || isSending || requestStatus !== 'none') return;

        setIsSending(true);
        const supabase = createClient();

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            // Check if request already exists (race condition protection)
            const { data: existing } = await supabase
                .from('friend_requests')
                .select('id, status')
                .eq('sender_id', authUser.id)
                .eq('receiver_id', person.id)
                .maybeSingle();

            if (existing) {
                setRequestStatus(existing.status === 'pending' ? 'pending' : 'accepted');
                setIsSending(false);
                return;
            }

            // Send friend request
            const { error } = await supabase
                .from('friend_requests')
                .insert({
                    sender_id: authUser.id,
                    receiver_id: person.id,
                    status: 'pending'
                });

            if (error) {
                console.error('Error sending friend request:', error);
            } else {
                setRequestStatus('pending');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
        } finally {
            setIsSending(false);
        }
    };

    const getButtonText = () => {
        if (requestStatus === 'checking') return 'Checking...';
        if (requestStatus === 'pending') return 'Request Sent';
        if (requestStatus === 'accepted') return 'Connected';
        return 'Add Friend';
    };

    const isButtonDisabled = requestStatus !== 'none' || isSending;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className={styles.closeButton} onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Header: Avatar + Name + Compatibility Badge */}
                <div className={styles.header}>
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
                    <div className={styles.headerInfo}>
                        <h2 className={styles.name}>{person.name}</h2>
                        {compatibilityPercentage !== null && (
                            <div className={styles.compatibilityBadge}>
                                {compatibilityPercentage}% <span>{isConnected ? 'compatible' : 'match'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* School & Location */}
                {(profileData?.school || profileData?.location) && (
                    <div className={styles.profileDetails}>
                        {profileData?.school && (
                            <span className={styles.detailItem}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                                </svg>
                                {profileData.school}
                            </span>
                        )}
                        {profileData?.location && (
                            <span className={styles.detailItem}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                {profileData.location}
                            </span>
                        )}
                    </div>
                )}

                {/* Bio */}
                {profileData?.bio && (
                    <p className={styles.bio}>{profileData.bio}</p>
                )}

                {/* Why You're Connected / Why You'd Connect */}
                {isLoading ? (
                    <div className={styles.loading}>Loading...</div>
                ) : compatibilityDescription ? (
                    <div className={styles.compatibilitySection}>
                        <div className={styles.compatibilityTitle}>
                            {isConnected ? "Why You're Connected" : "Why You'd Connect"}
                        </div>
                        <div className={styles.compatibilityDescription}>{compatibilityDescription}</div>
                    </div>
                ) : null}

                {/* Shared Interests - Show for everyone */}
                {sharedInterests.length > 0 && (
                    <div className={styles.sharedInterests}>
                        <div className={styles.sharedInterestsTitle}>Shared Interests</div>
                        <div className={styles.interestsList}>
                            {sharedInterests.map((interest, i) => (
                                <span key={i} className={styles.interestTag}>{interest}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add Friend Button - Only show if NOT connected */}
                {!isConnected && (
                    <div className={styles.actions}>
                        <button
                            className={styles.addFriendButton}
                            onClick={handleSendRequest}
                            disabled={isButtonDisabled}
                        >
                            {isSending ? 'Sending...' : getButtonText()}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
