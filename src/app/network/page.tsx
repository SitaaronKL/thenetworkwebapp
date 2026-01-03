'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu';
import ProfileModal from '@/components/ProfileModal';
import dynamic from 'next/dynamic';
const NetworkGalaxy = dynamic(() => import('@/components/NetworkGalaxy'), { ssr: false });
import { useAuth } from '@/contexts/AuthContext';
import { NetworkPerson } from '@/types/network';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

interface Connection {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  star_color: string;
  bio?: string;
  interests?: string[];
}

import AddUserIcon from '@/components/icons/AddUserIcon';
import SearchIcon from '@/components/icons/SearchIcon';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import SearchUserModal from '@/components/SearchUserModal';
import SuggestionDetailModal from '@/components/SuggestionDetailModal';
import AriaMessage from '@/components/AriaMessage';

// Helper to resolve avatar URL
const getAvatarUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
};

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<NetworkPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);

  // Ari's Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [interactedSuggestionIds, setInteractedSuggestionIds] = useState<Set<string>>(new Set());
  const [shouldShowMessage, setShouldShowMessage] = useState(false);

  // Friend Requests Modal State
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  
  // Search User Modal State
  const [showSearchUser, setShowSearchUser] = useState(false);
  
  // Suggestion Detail Modal State
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);

  // Mobile suggestions panel state
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);

  // Helper function to create current user node
  const createCurrentUserNode = (id: string, name: string, color: string, avatarUrl?: string): NetworkPerson => ({
    id,
    name,
    starColor: color,
    x: 400,
    y: 500,
    stars: 5,
    connections: [],
    imageUrl: avatarUrl
  });

  // Helper function to process connections and build network
    const processConnections = async (
      supabase: ReturnType<typeof createClient>,
      connections: Connection[],
      userId: string
    ) => {
      const loadedPeople: NetworkPerson[] = [];

      // Get current user's profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Add current user at center
      loadedPeople.push(createCurrentUserNode(
        userId,
        currentProfile?.full_name?.split(' ')[0] || 'You',
        currentProfile?.star_color || '#8E5BFF',
        getAvatarUrl(currentProfile?.avatar_url)
      ));

      // Get unique friend IDs
      const friendIds = [...new Set(connections.map(conn =>
        conn.sender_id === userId ? conn.receiver_id : conn.sender_id
      ))];

      // Fetch friend profiles
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', friendIds);

        // Position friends in a spiral pattern around center
        let index = 1;
        for (const profile of (profiles || [])) {
          const angle = (index * 2.4) + Math.random() * 0.5;
          const radius = 120 + (index * 30) + Math.random() * 50;
          const x = 400 + Math.cos(angle) * radius;
          const y = 500 + Math.sin(angle) * radius;

          loadedPeople.push({
            id: profile.id,
            name: profile.full_name?.split(' ')[0] || 'Friend',
            starColor: profile.star_color || '#8E5BFF',
            x,
            y,
            stars: 4, // Default stars
            connections: [userId],
            bio: profile.bio,
            imageUrl: getAvatarUrl(profile.avatar_url)
          });

          // Update current user's connections
          loadedPeople[0].connections.push(profile.id);
          index++;
        }
      }

      setPeople(loadedPeople);
      setIsLoadingNetwork(false);
    };

  // Function to load network data
  const loadNetworkData = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingNetwork(true);
    const supabase = createClient();

    try {
      // 1. Fetch ACCEPTED connections (user_connections table)
      const { data: connections, error: connError } = await supabase
        .from('user_connections')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      // 2. Fetch PENDING requests (incoming)
      const { data: pending } = await supabase
        .from('user_connections')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (connError) {
        console.error('Error fetching connections:', connError);
        // Try friend_requests table as fallback
        const { data: friendRequests, error: frError } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (frError) {
          console.error('Error fetching friend requests:', frError);
          setPeople([createCurrentUserNode(user.id, 'You', '#8E5BFF')]);
          setIsLoadingNetwork(false);
          return;
        }

        await processConnections(supabase, friendRequests || [], user.id);
        return;
      }

      await processConnections(supabase, connections || [], user.id);
    } catch (e) {
      console.error('Error loading network:', e);
      setPeople([createCurrentUserNode(user.id, 'You', '#8E5BFF')]);
      setIsLoadingNetwork(false);
    }
  }, [user]);

  // Auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Function to load Ari's suggestions based on similarity
  const loadAriaSuggestions = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingSuggestions(true);
    const supabase = createClient();

    try {
      // 1. Count user's connections
      const { count: connectionCount1, error: connError } = await supabase
        .from('user_connections')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      // Fallback to friend_requests if user_connections fails
      let connectionCount = 0;
      if (connError) {
        const { count } = await supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted');
        connectionCount = count || 0;
      } else {
        connectionCount = connectionCount1 || 0;
      }

      // Check for interacted suggestions
      // First verify the user is authenticated
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error when loading interactions:', authError);
      }
      
      let interactedIds = new Set<string>();
      try {
        // Verify auth.uid() matches user.id
        console.log('Checking suggestion interactions:', {
          user_id_from_auth: user.id,
          auth_uid: authUser?.id,
          match: user.id === authUser?.id
        });
        
        // Try querying with explicit error handling
        const query = supabase
          .from('suggestion_interactions')
          .select('suggested_user_id')
          .eq('user_id', user.id);
        
        const { data: interactions, error: interactionsError } = await query;

        if (interactionsError) {
          // Only log real errors, ignore empty objects or expected "not found" issues
          if (Object.keys(interactionsError).length > 0 || interactionsError.message) {
             console.warn('Suggestion interactions fetch issue (non-critical):', interactionsError.message || interactionsError);
          }
          interactedIds = new Set<string>();
        } else {
          interactedIds = new Set<string>((interactions || []).map(i => i.suggested_user_id));
          if (interactions && interactions.length > 0) {
            console.log('Found interacted suggestions:', Array.from(interactedIds));
          } else {
            console.log('No interacted suggestions found for user:', user.id);
          }
        }
      } catch (err) {
        console.error('Exception loading suggestion interactions:', err);
        // Continue with empty set if exception occurs
        interactedIds = new Set<string>();
      }
      
      setInteractedSuggestionIds(interactedIds);

      // Only show suggestions if user has 4 or fewer connections AND hasn't interacted with all suggestions
      if (connectionCount > 4) {
        setShouldShowMessage(true);
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // If user has already interacted with 3 or more suggestions, show the message
      // This ensures once all 3 initial suggestions are handled, no new ones appear
      if (interactedIds.size >= 3) {
        setShouldShowMessage(true);
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // 2. Get user's profile and DNA v2
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, interests, bio')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Error fetching user profile:', profileError);
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // Get user's DNA v2 (composite vector)
      const { data: userDnaV2 } = await supabase
        .from('digital_dna_v2')
        .select('composite_vector')
        .eq('user_id', user.id)
        .single();

      // 3. If user has no DNA v2, fallback to DNA v1, then interest-based matching
      let useDnaV1 = false;
      let userDnaV1: any = null;
      
      if (!userDnaV2 || !userDnaV2.composite_vector) {
        // Try DNA v1 as fallback
        const { data: dnaV1 } = await supabase
          .from('digital_dna_v1')
          .select('interest_vector')
          .eq('user_id', user.id)
          .single();

        if (dnaV1 && dnaV1.interest_vector) {
          useDnaV1 = true;
          userDnaV1 = dnaV1;
        } else {
          // Fallback: find users with similar interests (not in network)
          if (userProfile.interests && userProfile.interests.length > 0) {
            // Get connected user IDs first
            const { data: existingConnections } = await supabase
              .from('user_connections')
              .select('sender_id, receiver_id')
              .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
              .eq('status', 'accepted');

            const { data: acceptedFriendRequests } = await supabase
              .from('friend_requests')
              .select('sender_id, receiver_id')
              .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
              .eq('status', 'accepted');

            // Also get PENDING friend requests to exclude from suggestions
            const { data: pendingFriendRequests } = await supabase
              .from('friend_requests')
              .select('sender_id, receiver_id')
              .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
              .eq('status', 'pending');

            const connectedUserIds = new Set<string>();
            if (existingConnections) {
              existingConnections.forEach((conn: any) => {
                if (conn.sender_id === user.id) {
                  connectedUserIds.add(conn.receiver_id);
                } else {
                  connectedUserIds.add(conn.sender_id);
                }
              });
            }
            if (acceptedFriendRequests) {
              acceptedFriendRequests.forEach((req: any) => {
                if (req.sender_id === user.id) {
                  connectedUserIds.add(req.receiver_id);
                } else {
                  connectedUserIds.add(req.sender_id);
                }
              });
            }
            // Add users with pending friend requests
            if (pendingFriendRequests) {
              pendingFriendRequests.forEach((req: any) => {
                if (req.sender_id === user.id) {
                  connectedUserIds.add(req.receiver_id);
                } else {
                  connectedUserIds.add(req.sender_id);
                }
              });
            }

            const { data: similarProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, interests, bio')
              .neq('id', user.id)
              .overlaps('interests', userProfile.interests)
              .limit(10);

            // Filter out users already in network
            // Only show remaining slots (3 minus interactions)
            const remainingSlots = Math.max(0, 3 - interactedIds.size);
            const notInNetworkProfiles = (similarProfiles || []).filter((p: any) => !connectedUserIds.has(p.id) && !interactedIds.has(p.id)).slice(0, remainingSlots);

            if (notInNetworkProfiles && notInNetworkProfiles.length > 0) {
              const formattedPromises = notInNetworkProfiles.map(async (profile: any) => {
                let reason = '';
                try {
                  // Normalize IDs (user_a_id < user_b_id) for cache lookup
                  const userAId = user.id < profile.id ? user.id : profile.id;
                  const userBId = user.id < profile.id ? profile.id : user.id;

                  // Check cache first
                  const { data: cached } = await supabase
                    .from('user_compatibility_descriptions')
                    .select('description')
                    .eq('user_a_id', userAId)
                    .eq('user_b_id', userBId)
                    .maybeSingle();

                  if (cached && cached.description) {
                    reason = cached.description;
                  } else {
                    // No cache found, call edge function to generate and store
                    const { data: reasonData, error: reasonError } = await supabase.functions.invoke(
                      'generate-suggestion-reason',
                      {
                        body: {
                          userAId: user.id,
                          userBId: profile.id,
                          userProfile: {
                            interests: userProfile.interests || [],
                            bio: userProfile.bio || ''
                          },
                          candidateProfile: {
                            interests: profile.interests || [],
                            bio: profile.bio || ''
                          },
                          similarity: 0.6 // Default similarity for interest-based matches
                        }
                      }
                    );

                    if (reasonError) {
                      console.error('Error generating reason:', {
                        message: reasonError.message,
                        context: reasonError.context,
                        status: reasonError.status,
                        details: reasonError
                      });
                      return null; // Don't show suggestion if we can't generate reason
                    }

                    if (reasonData?.reason) {
                      reason = reasonData.reason;
                    } else if (reasonData?.error) {
                      console.error('Edge function returned error:', reasonData.error);
                      return null; // Don't show suggestion if error
                    } else {
                      console.error('No reason returned from edge function. Response:', reasonData);
                      return null; // Don't show suggestion if no reason
                    }
                  }
                } catch (error) {
                  console.error('Error generating reason:', error);
                  return null; // Don't show suggestion on error
                }
                
                return {
                  id: profile.id,
                  name: profile.full_name?.split(' ')[0] || 'User',
                  reason,
                  avatar: getAvatarUrl(profile.avatar_url) || '/assets/onboarding/tn_logo_black.png'
                };
              });
              
              const formatted = await Promise.all(formattedPromises);
              setSuggestions(formatted);
              setIsLoadingSuggestions(false);
              return;
            }
          }
          setSuggestions([]);
          setIsLoadingSuggestions(false);
          return;
        }
      }

      // 4. Get list of users already in network (to exclude them)
      const { data: existingConnections } = await supabase
        .from('user_connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      // Also check friend_requests for accepted connections
      const { data: acceptedFriendRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      // Also check for PENDING friend requests (sent by current user)
      // These users should not appear in suggestions since a request was already sent
      const { data: pendingFriendRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'pending');

      // Combine all connected user IDs AND pending request user IDs
      const connectedUserIds = new Set<string>();
      if (existingConnections) {
        existingConnections.forEach((conn: any) => {
          if (conn.sender_id === user.id) {
            connectedUserIds.add(conn.receiver_id);
          } else {
            connectedUserIds.add(conn.sender_id);
          }
        });
      }
      if (acceptedFriendRequests) {
        acceptedFriendRequests.forEach((req: any) => {
          if (req.sender_id === user.id) {
            connectedUserIds.add(req.receiver_id);
          } else {
            connectedUserIds.add(req.sender_id);
          }
        });
      }
      // Add users with pending friend requests (both sent and received)
      if (pendingFriendRequests) {
        pendingFriendRequests.forEach((req: any) => {
          if (req.sender_id === user.id) {
            connectedUserIds.add(req.receiver_id);
          } else {
            connectedUserIds.add(req.sender_id);
          }
        });
      }

      // 5. Use match_profiles RPC to find similar users using embeddings
      // Prefer DNA v2 (composite_vector) for deeper matching, fallback to DNA v1 (interest_vector)
      const { data: matchedProfiles, error: matchError } = useDnaV1
        ? await supabase.rpc('match_profiles', {
            query_embedding: userDnaV1.interest_vector,
            match_threshold: 0.3,
            match_count: 20,
            ignore_user_id: user.id
          })
        : (userDnaV2?.composite_vector)
          ? await supabase.rpc('match_profiles_v2', {
              query_embedding: userDnaV2.composite_vector,
              match_threshold: 0.3, // Minimum similarity threshold (0.3 = 30% similarity)
              match_count: 20, // Get more candidates to filter out network connections
              ignore_user_id: user.id
            })
          : { data: null, error: { message: 'No DNA v2 available' } };

      if (matchError || !matchedProfiles || matchedProfiles.length === 0) {
        console.error('Error matching profiles:', matchError);
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // 6. Filter out users already in network
      const notInNetworkMatches = matchedProfiles.filter((m: any) => !connectedUserIds.has(m.id));

      if (notInNetworkMatches.length === 0) {
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // 7. Get full profile data for top matches (only those not in network)
      const topMatchIds = notInNetworkMatches.slice(0, 10).map((m: any) => m.id);
      const { data: fullProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, interests, bio')
        .in('id', topMatchIds);

      if (!fullProfiles || fullProfiles.length === 0) {
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // 8. Format suggestions with compelling reasons (only from not-in-network matches)
      // Only fetch remaining slots (3 minus interactions already made)
      const remainingSuggestionCount = Math.max(0, 3 - interactedIds.size);
      const topNotInNetworkMatches = notInNetworkMatches.slice(0, remainingSuggestionCount);
      const formattedSuggestionsPromises = topNotInNetworkMatches
        .map(async (match: any) => {
          const profile = fullProfiles.find((p: any) => p.id === match.id);
          if (!profile) return null;

          // Check cache first, then use edge function if needed
          let reason = '';
          try {
            // Normalize IDs (user_a_id < user_b_id) for cache lookup
            const userAId = user.id < profile.id ? user.id : profile.id;
            const userBId = user.id < profile.id ? profile.id : user.id;

            // Check cache first
            const { data: cached } = await supabase
              .from('user_compatibility_descriptions')
              .select('description')
              .eq('user_a_id', userAId)
              .eq('user_b_id', userBId)
              .maybeSingle();

            if (cached && cached.description) {
              reason = cached.description;
            } else {
              // No cache found, call edge function to generate and store
              const { data: reasonData, error: reasonError } = await supabase.functions.invoke(
                'generate-suggestion-reason',
                {
                  body: {
                    userAId: user.id,
                    userBId: profile.id,
                    userProfile: {
                      interests: userProfile.interests || [],
                      bio: userProfile.bio || ''
                    },
                    candidateProfile: {
                      interests: profile.interests || [],
                      bio: profile.bio || ''
                    },
                    similarity: match.similarity || 0.6
                  }
                }
              );

              if (reasonError) {
                console.error('Error generating reason:', {
                  message: reasonError.message,
                  context: reasonError.context,
                  status: reasonError.status,
                  details: reasonError
                });
                return null; // Don't show suggestion if we can't generate reason
              }

              if (reasonData?.reason) {
                reason = reasonData.reason;
              } else if (reasonData?.error) {
                console.error('Edge function returned error:', reasonData.error);
                return null; // Don't show suggestion if error
              } else {
                console.error('No reason returned from edge function. Response:', reasonData);
                return null; // Don't show suggestion if no reason
              }
            }
          } catch (error) {
            console.error('Error generating reason:', error);
            return null; // Don't show suggestion on error
          }

          return {
            id: profile.id,
            name: profile.full_name?.split(' ')[0] || 'User',
            reason,
            avatar: getAvatarUrl(profile.avatar_url) || '/assets/onboarding/tn_logo_black.png',
            similarity: match.similarity
          };
        });

      // Calculate how many suggestions we should show (3 minus how many they've interacted with)
      const remainingSuggestionSlots = Math.max(0, 3 - interactedIds.size);
      
      const formattedSuggestions = (await Promise.all(formattedSuggestionsPromises))
        .filter((s: any) => s !== null)
        .filter((s: any) => !interactedIds.has(s.id)) // Filter out already interacted suggestions
        .slice(0, remainingSuggestionSlots); // Only show remaining slots (3 minus interactions)

      // If all suggestions have been interacted with, show message
      if (formattedSuggestions.length === 0) {
        setShouldShowMessage(true);
        setSuggestions([]);
      } else {
        setShouldShowMessage(false);
        setSuggestions(formattedSuggestions);
      }
    } catch (error) {
      console.error('Error loading Ari suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user]);

  // Function to check for pending friend requests
  const checkPendingFriendRequests = useCallback(async () => {
    if (!user) return;
    
    const supabase = createClient();
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch pending friend requests where current user is the receiver
      const { data: friendRequests, error } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('receiver_id', authUser.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error checking friend requests:', error);
        setPendingRequestCount(0);
        return;
      }

      setPendingRequestCount(friendRequests?.length || 0);
    } catch (error) {
      console.error('Error checking friend requests:', error);
      setPendingRequestCount(0);
    }
  }, [user]);

  // Load REAL network data from Supabase
  useEffect(() => {
    loadNetworkData();
    loadAriaSuggestions();
    checkPendingFriendRequests();
  }, [loadNetworkData, loadAriaSuggestions, checkPendingFriendRequests]);

  // Refresh friend request count when modal opens
  useEffect(() => {
    if (showFriendRequests) {
      checkPendingFriendRequests();
    }
  }, [showFriendRequests, checkPendingFriendRequests]);

  if (loading || isLoadingNetwork) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Menu />

      {/* Network Graph Background */}
      <div className={styles.graphContainer}>
        <NetworkGalaxy
          people={people}
          currentUserId={user.id}
          onPersonClick={(person) => {
            // Prevent clicking on own profile
            if (person.id !== user?.id) {
              setSelectedPerson(person);
            }
          }}
        />
      </div>

      {/* Mobile button to open suggestions */}
      <button 
        className={styles.mobileSuggestionsButton}
        onClick={() => setShowMobileSuggestions(true)}
        aria-label="Open suggestions"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </button>

      {/* Ari's Suggestions Overlay */}
      <div className={`${styles.suggestionsPanel} ${showMobileSuggestions ? styles.mobileOpen : ''}`}>
        {/* Mobile close button */}
        <button 
          className={styles.mobileCloseButton}
          onClick={() => setShowMobileSuggestions(false)}
          aria-label="Close suggestions"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className={styles.panelTitle}>Ari's Suggestions</h2>

        <div className={styles.actionIcons}>
          <div className={styles.iconButton} onClick={() => setShowFriendRequests(true)} style={{ position: 'relative' }}>
            <AddUserIcon />
            {pendingRequestCount > 0 && (
              <span className={styles.notificationBadge}>{pendingRequestCount}</span>
            )}
          </div>
          <div className={styles.iconButton} onClick={() => setShowSearchUser(true)}>
            <SearchIcon />
          </div>
        </div>

        <div className={styles.suggestionList}>
          {isLoadingSuggestions ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 0, 0, 0.6)' }}>
              Loading suggestions...
            </div>
          ) : shouldShowMessage ? (
            <AriaMessage />
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 0, 0, 0.6)' }}>
              No suggestions available
            </div>
          ) : (
            suggestions.map((person) => {
              // Check if reason is long enough to need truncation
              const hasMore = person.reason.length > 120 || person.reason.split('.').length > 2;
              
              return (
            <div key={person.id} className={styles.suggestionCard}>
              <img src={person.avatar} alt={person.name} className={styles.cardAvatar} />
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{person.name}</div>
                    <div className={styles.cardReason}>
                      {person.reason}
                    </div>
                    {hasMore && (
                      <button 
                        className={styles.readMoreButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSuggestion(person);
                        }}
                      >
                        Read more
                      </button>
                    )}
              </div>
            </div>
              );
            })
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}

      {/* Friend Requests Modal */}
      <FriendRequestsModal
        isOpen={showFriendRequests}
        onClose={() => {
          setShowFriendRequests(false);
          checkPendingFriendRequests(); // Refresh count when modal closes
        }}
        onRequestAccepted={() => {
          loadNetworkData();
          checkPendingFriendRequests(); // Refresh count when request is accepted
        }}
      />

      {/* Search User Modal */}
      <SearchUserModal
        isOpen={showSearchUser}
        onClose={() => setShowSearchUser(false)}
        onRequestSent={() => {
          // Refresh friend request count in case user sent a request to someone who might send one back
          checkPendingFriendRequests();
        }}
      />

      {/* Suggestion Detail Modal */}
      <SuggestionDetailModal
        isOpen={selectedSuggestion !== null}
        onClose={() => {
          setSelectedSuggestion(null);
        }}
        person={selectedSuggestion}
        onRequestSent={async () => {
          // Track interaction when user sends a request
          if (selectedSuggestion) {
            const suggestionId = selectedSuggestion.id;
            
            // Immediately remove the suggestion from the list (before async operations)
            const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId);
            setSuggestions(updatedSuggestions);
            
            // Update interacted IDs and check total count
            const newInteractedIds = new Set([...interactedSuggestionIds, suggestionId]);
            setInteractedSuggestionIds(newInteractedIds);
            
            // If user has interacted with 3 total suggestions OR all current suggestions are gone, show the message
            if (newInteractedIds.size >= 3 || updatedSuggestions.length === 0) {
              setShouldShowMessage(true);
              setSuggestions([]); // Clear any remaining suggestions
            }
            
            // Close the modal immediately
            setSelectedSuggestion(null);
            
            // Track in database (non-blocking, fire-and-forget)
            (async () => {
              try {
                const supabase = createClient();
                const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
                if (authError) {
                  console.error('Error getting user for interaction tracking:', authError);
                  return;
                }
                if (!currentUser) {
                  console.error('No current user found for interaction tracking');
                  return;
                }
                
                console.log('Attempting to insert suggestion interaction:', {
                  user_id: currentUser.id,
                  suggested_user_id: suggestionId,
                  interaction_type: 'connected'
                });
                
                const { data: insertData, error: insertError } = await supabase
                  .from('suggestion_interactions')
                  .upsert({
                    user_id: currentUser.id,
                    suggested_user_id: suggestionId,
                    interaction_type: 'connected'
                  }, { onConflict: 'user_id,suggested_user_id' })
                  .select();
                
                if (insertError) {
                  console.error('Error inserting suggestion interaction:', {
                    error: insertError,
                    errorString: JSON.stringify(insertError),
                    message: insertError.message,
                    details: insertError.details,
                    hint: insertError.hint,
                    code: insertError.code
                  });
                } else {
                  console.log('Successfully tracked suggestion interaction:', insertData);
                  
                  // Verify the insert worked by querying it back
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('suggestion_interactions')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .eq('suggested_user_id', suggestionId)
                    .single();
                  
                  if (verifyError) {
                    console.error('Warning: Could not verify inserted interaction:', verifyError);
                  } else {
                    console.log('Verified: Interaction exists in database:', verifyData);
                  }
                }
              } catch (err) {
                console.error('Error tracking interaction:', err);
              }
            })();
            
            // Refresh network data to show new connections
            loadNetworkData();
          }
        }}
        onDismiss={async () => {
          // Track interaction when user dismisses
          if (selectedSuggestion) {
            const suggestionId = selectedSuggestion.id;
            
            // Immediately remove the suggestion from the list (before async operations)
            const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId);
            setSuggestions(updatedSuggestions);
            
            // Update interacted IDs and check total count
            const newInteractedIds = new Set([...interactedSuggestionIds, suggestionId]);
            setInteractedSuggestionIds(newInteractedIds);
            
            // If user has interacted with 3 total suggestions OR all current suggestions are gone, show the message
            if (newInteractedIds.size >= 3 || updatedSuggestions.length === 0) {
              setShouldShowMessage(true);
              setSuggestions([]); // Clear any remaining suggestions
            }
            
            // Close the modal immediately
            setSelectedSuggestion(null);
            
            // Track in database (non-blocking, fire-and-forget)
            (async () => {
              try {
                const supabase = createClient();
                const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
                if (authError) {
                  console.error('Error getting user for interaction tracking:', authError);
                  return;
                }
                if (!currentUser) {
                  console.error('No current user found for interaction tracking');
                  return;
                }
                
                console.log('Attempting to insert suggestion interaction:', {
                  user_id: currentUser.id,
                  suggested_user_id: suggestionId,
                  interaction_type: 'skipped'
                });
                
                const { data: insertData, error: insertError } = await supabase
                  .from('suggestion_interactions')
                  .upsert({
                    user_id: currentUser.id,
                    suggested_user_id: suggestionId,
                    interaction_type: 'skipped'
                  }, { onConflict: 'user_id,suggested_user_id' })
                  .select();
                
                if (insertError) {
                  console.error('Error inserting suggestion interaction:', {
                    error: insertError,
                    errorString: JSON.stringify(insertError),
                    message: insertError.message,
                    details: insertError.details,
                    hint: insertError.hint,
                    code: insertError.code
                  });
                } else {
                  console.log('Successfully tracked suggestion interaction:', insertData);
                  
                  // Verify the insert worked by querying it back
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('suggestion_interactions')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .eq('suggested_user_id', suggestionId)
                    .single();
                  
                  if (verifyError) {
                    console.error('Warning: Could not verify inserted interaction:', verifyError);
                  } else {
                    console.log('Verified: Interaction exists in database:', verifyData);
                  }
                }
              } catch (err) {
                console.error('Error tracking interaction:', err);
              }
            })();
          }
        }}
      />
    </div>
  );
}
