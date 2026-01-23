'use client';

import { useState, useEffect } from 'react';
import { NetworkPerson } from '@/types/network';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import styles from './ProfileModal.module.css';

interface ProfileModalProps {
    person: NetworkPerson;
    onClose: () => void;
    isEmbedded?: boolean;
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

// Shared network interface
interface SharedNetwork {
    name: string;
    type: string;
}

export default function ProfileModal({ person, onClose, isEmbedded = false }: ProfileModalProps) {
    const { user } = useAuth();
    const [compatibilityDescription, setCompatibilityDescription] = useState<string>('');
    const [compatibilityPercentage, setCompatibilityPercentage] = useState<number | null>(null);
    const [sharedInterests, setSharedInterests] = useState<string[]>([]);
    const [sharedNetworks, setSharedNetworks] = useState<SharedNetwork[]>([]);
    const [mutualFriendsCount, setMutualFriendsCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<any>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [requestStatus, setRequestStatus] = useState<RequestStatus>('checking');
    const [isSending, setIsSending] = useState(false);
    // Overlap score for discovery users
    const [overlapScore, setOverlapScore] = useState<number | null>(null);
    const [overlapLevel, setOverlapLevel] = useState<string | null>(null);

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

                // Handle discovery users (fake users) - calculate overlap score
                if (person.isDiscoveryNode) {
                    // Fetch discovery profile data
                    const { data: discoveryProfile } = await supabase
                        .from('discovery_profiles')
                        .select('*')
                        .eq('id', person.id)
                        .eq('is_active', true)
                        .single();

                    if (discoveryProfile) {
                        // Use pre-computed proximity score from database
                        const score = discoveryProfile.proximity_score || 0.5;
                        setOverlapScore(Math.round(score * 100));
                        setOverlapLevel(discoveryProfile.proximity_level || 'nearby');

                        // Format shared networks from discovery profile
                        const networks: SharedNetwork[] = [];
                        if (discoveryProfile.networks && Array.isArray(discoveryProfile.networks)) {
                            discoveryProfile.networks.forEach((net: string) => {
                                // Classify network type (simple heuristic)
                                let type = 'community';
                                const netLower = net.toLowerCase();
                                if (netLower.includes('college') || netLower.includes('university')) type = 'college';
                                else if (netLower.includes('high school') || netLower.includes('school')) type = 'high_school';
                                else if (netLower.includes('company') || netLower.includes('inc') || netLower.includes('corp')) type = 'company';
                                else if (netLower.includes('new york') || netLower.includes('nyc') || netLower.includes('city')) type = 'city';
                                else if (netLower.includes('thenetwork') || netLower.includes('startup')) type = 'startup';
                                
                                networks.push({ name: net, type });
                            });
                        }
                        if (discoveryProfile.college) {
                            networks.push({ name: discoveryProfile.college, type: 'college' });
                        }
                        if (discoveryProfile.high_school) {
                            networks.push({ name: discoveryProfile.high_school, type: 'high_school' });
                        }
                        if (discoveryProfile.company) {
                            networks.push({ name: discoveryProfile.company, type: 'company' });
                        }
                        setSharedNetworks(networks);

                        // Set profile data
                        setProfileData({
                            full_name: discoveryProfile.full_name,
                            avatar_url: discoveryProfile.avatar_url,
                            bio: discoveryProfile.bio,
                            networks: discoveryProfile.networks || [],
                            school: discoveryProfile.college || null,
                            company: discoveryProfile.company || null,
                        });

                        // Set description
                        if (discoveryProfile.why_you_might_meet) {
                            setCompatibilityDescription(discoveryProfile.why_you_might_meet);
                        }

                        // Discovery users are never connected
                        setIsConnected(false);
                        setRequestStatus('none');
                    }
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
                        .select('id, full_name, interests')
                        .eq('id', user.id)
                        .single();

                    // Load profile data with more fields
                    const { data: otherProfile } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url')
                        .eq('id', person.id)
                        .single();
                    
                    // Get college, network_handle, and networks from user_profile_extras
                    const { data: otherExtras } = await supabase
                        .from('user_profile_extras')
                        .select('college, network_handle, networks')
                        .eq('user_id', person.id)
                        .maybeSingle();
                    
                    if (otherProfile) {
                        setProfileData({
                            ...otherProfile,
                            school: otherExtras?.college || null,
                            networkHandle: otherExtras?.network_handle || null,
                            networks: otherExtras?.networks || [],
                            interests: [],
                            location: null
                        });
                        
                        // Calculate shared interests between users
                        // Note: interests column removed from profiles table
                        const otherInterests: string[] = [];
                        
                        // Generate AI description for connected users too
                        if (currentUserProfile) {
                            const userInterests = (currentUserProfile.interests || []) as string[];
                            // Find common interests
                            const shared = userInterests.filter(i => 
                                otherInterests.some(oi => oi.toLowerCase() === i.toLowerCase())
                            );
                            setSharedInterests(shared.length > 0 ? shared : otherInterests.slice(0, 5));

                            // Calculate network proximity score for connected users
                            try {
                                const { data: proximityData, error: proximityError } = await supabase.functions.invoke(
                                    'calculate-network-proximity',
                                    {
                                        body: {
                                            userAId: user.id,
                                            userBId: person.id,
                                        }
                                    }
                                );

                                if (!proximityError && proximityData) {
                                    setCompatibilityPercentage(proximityData.compatibilityPercentage);
                                    if (proximityData.sharedNetworks && Array.isArray(proximityData.sharedNetworks)) {
                                        setSharedNetworks(proximityData.sharedNetworks);
                                    }
                                    if (proximityData.mutualFriendsCount != null) {
                                        setMutualFriendsCount(proximityData.mutualFriendsCount);
                                    }
                                } else {
                                    // Fallback to old method
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
                                    }
                                }
                            } catch (error) {
                                console.error('Error calculating proximity for connected user:', error);
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
                                                bio: ''
                                            },
                                            candidateProfile: {
                                                interests: otherInterests,
                                                bio: ''
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
                    .select('id, full_name, interests')
                    .eq('id', user.id)
                    .single();

                // Get other person's profile
                const { data: otherProfile } = await supabase
                    .from('profiles')
                    .select('id, full_name, interests, avatar_url')
                    .eq('id', person.id)
                    .single();

                // Get college, network_handle, and networks from user_profile_extras
                const { data: otherExtras } = await supabase
                    .from('user_profile_extras')
                    .select('college, network_handle, networks')
                    .eq('user_id', person.id)
                    .maybeSingle();

                if (!currentUserProfile || !otherProfile) {
                    setIsLoading(false);
                    return;
                }

                setProfileData({
                    ...otherProfile,
                    school: otherExtras?.college || null,
                    networkHandle: otherExtras?.network_handle || null,
                    networks: otherExtras?.networks || []
                });

                // Calculate shared interests
                const userInterests = (currentUserProfile.interests || []) as string[];
                const otherInterests = (otherProfile.interests || []) as string[];
                const shared = userInterests.filter(i => otherInterests.includes(i));
                setSharedInterests(shared);

                // Calculate network proximity score (includes networks, mutuals, and interests)
                let similarity = 0;
                try {
                    const { data: proximityData, error: proximityError } = await supabase.functions.invoke(
                        'calculate-network-proximity',
                        {
                            body: {
                                userAId: user.id,
                                userBId: person.id,
                            }
                        }
                    );

                    if (!proximityError && proximityData) {
                        // Use the new proximity-based compatibility percentage
                        setCompatibilityPercentage(proximityData.compatibilityPercentage);
                        similarity = proximityData.overlap || 0;
                        
                        // Store shared networks for display
                        if (proximityData.sharedNetworks && Array.isArray(proximityData.sharedNetworks)) {
                            setSharedNetworks(proximityData.sharedNetworks);
                        }
                        
                        // Store mutual friends count
                        if (proximityData.mutualFriendsCount != null) {
                            setMutualFriendsCount(proximityData.mutualFriendsCount);
                        }
                    } else {
                        // Fallback to old DNA-based calculation if proximity calc fails
                        console.warn('Proximity calculation failed, falling back to DNA-based score');
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

                        if (matchData?.compatibility_percentage != null) {
                            setCompatibilityPercentage(matchData.compatibility_percentage);
                            similarity = matchData.compatibility_percentage / 100;
                        } else if (matchData?.similarity_score != null) {
                            similarity = matchData.similarity_score;
                            setCompatibilityPercentage(Math.round(similarity * 100));
                        } else {
                            // Calculate on-the-fly from DNA
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
                                    setCompatibilityPercentage(Math.round(similarity * 100));
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error calculating proximity:', error);
                    // Continue with default values
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
                                    bio: ''
                                },
                                candidateProfile: {
                                    interests: otherInterests,
                                    bio: ''
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
        if (person.isDiscoveryNode) return 'Discovery User';
        if (requestStatus === 'checking') return 'Checking...';
        if (requestStatus === 'pending') return 'Request Sent';
        if (requestStatus === 'accepted') return 'Connected';
        return 'Add Friend';
    };

    const isButtonDisabled = person.isDiscoveryNode || requestStatus !== 'none' || isSending;

    const modalContent = (
        <>
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
                    {/* Show overlap score for discovery users */}
                    {person.isDiscoveryNode && overlapScore !== null && (
                        <div className={styles.overlapScoreBadge}>
                            {overlapScore}% <span>OVERLAP</span>
                            {overlapLevel && (
                                <div className={styles.overlapLevel}>
                                    {overlapLevel === 'very_close' && 'Very Close'}
                                    {overlapLevel === 'close' && 'Close'}
                                    {overlapLevel === 'nearby' && 'Nearby'}
                                    {overlapLevel === 'distant' && 'Distant'}
                                    {overlapLevel === 'far' && 'Far'}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Show compatibility for regular users */}
                    {!person.isDiscoveryNode && compatibilityPercentage !== null && (
                        <div className={styles.compatibilityBadge}>
                            {compatibilityPercentage}% <span>{isConnected ? 'COMPATIBLE' : 'COMPATIBLE'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* School, Network Handle & Networks */}
            {(profileData?.school || profileData?.networkHandle || (profileData?.networks && profileData.networks.length > 0)) && (
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
                    {profileData?.networkHandle && (
                        <span className={styles.detailItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            @{profileData.networkHandle}
                        </span>
                    )}
                    {profileData?.networks && profileData.networks.length > 0 && (
                        <span className={styles.detailItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {profileData.networks.join(', ')}
                        </span>
                    )}
                </div>
            )}

            {/* Bio */}
            {profileData?.bio && (
                <p className={styles.bio}>{profileData.bio}</p>
            )}

            {/* Shared Networks - Show prominently if present */}
            {sharedNetworks.length > 0 && (
                <div className={styles.sharedNetworksSection}>
                    <div className={styles.sharedNetworksTitle}>SHARED NETWORKS</div>
                    <div className={styles.sharedNetworksList}>
                        {sharedNetworks.map((network, i) => (
                            <span key={i} className={`${styles.networkTag} ${styles[`network_${network.type}`] || ''}`}>
                                {network.type === 'college' && '🎓 '}
                                {network.type === 'high_school' && '🏫 '}
                                {network.type === 'company' && '💼 '}
                                {network.type === 'city' && '📍 '}
                                {network.type === 'community' && '👥 '}
                                {network.name}
                            </span>
                        ))}
                    </div>
                    {mutualFriendsCount > 0 && (
                        <div className={styles.mutualFriends}>
                            👫 {mutualFriendsCount} mutual friend{mutualFriendsCount > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}

            {/* Why You're Connected / Why You'd Connect */}
            {isLoading ? (
                <div className={styles.loading}>Loading...</div>
            ) : compatibilityDescription ? (
                <div className={styles.compatibilitySection}>
                    <div className={styles.compatibilityTitle}>
                        {sharedNetworks.length > 0 ? 'WHY YOU SHOULD CONNECT' : 'WHY YOU\'RE CONNECTED'}
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
        </>
    );

    // Embedded mode: just return the content without overlay
    if (isEmbedded) {
        return <div className={styles.embeddedModal}>{modalContent}</div>;
    }

    // Normal modal mode with overlay
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className={styles.closeButton} onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
                {modalContent}
            </div>
        </div>
    );
}
