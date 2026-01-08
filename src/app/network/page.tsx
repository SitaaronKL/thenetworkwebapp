'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, addDays, isAfter, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
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
import InviteIcon from '@/components/icons/InviteIcon';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import SearchUserModal from '@/components/SearchUserModal';
import SuggestionDetailModal from '@/components/SuggestionDetailModal';
import AriaMessage from '@/components/AriaMessage';
import InviteModal from '@/components/InviteModal';

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

  // Weekly Drop State
  const [mondayDrop, setMondayDrop] = useState<any | null>(null);
  const [isLoadingMondayDrop, setIsLoadingMondayDrop] = useState(false);
  const [activeTab, setActiveTab] = useState<'philosophy' | 'drop'>('philosophy');
  const [isEligibleForMondayDrop, setIsEligibleForMondayDrop] = useState(false);

  // Debug State
  // const [showDebugMenu, setShowDebugMenu] = useState(false);
  // const [debugForceEligible, setDebugForceEligible] = useState(false);
  const debugForceEligible = false; // Hardcoded to false

  // Friend Requests Modal State
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // Search User Modal State
  const [showSearchUser, setShowSearchUser] = useState(false);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);

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
        // Try friend_requests table as fallback
        const { data: friendRequests, error: frError } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (frError) {
          setPeople([createCurrentUserNode(user.id, 'You', '#8E5BFF')]);
          setIsLoadingNetwork(false);
          return;
        }

        await processConnections(supabase, friendRequests || [], user.id);
        return;
      }

      await processConnections(supabase, connections || [], user.id);
    } catch (e) {
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
        // Auth error when loading interactions
      }

      let interactedIds = new Set<string>();
      try {
        // Try querying with explicit error handling
        const query = supabase
          .from('suggestion_interactions')
          .select('suggested_user_id')
          .eq('user_id', user.id);

        const { data: interactions, error: interactionsError } = await query;

        if (interactionsError) {
          interactedIds = new Set<string>();
        } else {
          interactedIds = new Set<string>((interactions || []).map(i => i.suggested_user_id));
        }
      } catch (err) {
        // Continue with empty set if exception occurs
        interactedIds = new Set<string>();
      }

      setInteractedSuggestionIds(interactedIds);

      // Show Weekly Drop if user has > 4 connections OR has interacted with 3+ suggestions
      if (connectionCount > 4 || interactedIds.size >= 3 || debugForceEligible) {
        console.log('🚀 Loading Weekly Drop Path... debug:', debugForceEligible);
        setIsEligibleForMondayDrop(true);
        setShouldShowMessage(false);
        setSuggestions([]);
        // Don't set setIsLoadingSuggestions(false) yet, loadMondayDrop will handle its own loading state
        loadMondayDrop(connectionCount);
        setIsLoadingSuggestions(false);
        return;
      }

      setIsEligibleForMondayDrop(false);

      // 2. Get user's profile and DNA v2
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, interests, bio')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
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
                      return null; // Don't show suggestion if we can't generate reason
                    }

                    if (reasonData?.reason) {
                      reason = reasonData.reason;
                    } else if (reasonData?.error) {
                      return null; // Don't show suggestion if error
                    } else {
                      return null; // Don't show suggestion if no reason
                    }
                  }
                } catch (error) {
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
                return null; // Don't show suggestion if we can't generate reason
              }

              if (reasonData?.reason) {
                reason = reasonData.reason;
              } else if (reasonData?.error) {
                return null; // Don't show suggestion if error
              } else {
                return null; // Don't show suggestion if no reason
              }
            }
          } catch (error) {
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
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user]);

  // Function to load Weekly Drop
  const loadMondayDrop = useCallback(async (connectionCount?: number) => {
    if (!user) return;

    setIsLoadingMondayDrop(true);
    const supabase = createClient();

    try {
      // 1. Determine current week's Monday
      const now = new Date();
      let monday = startOfWeek(now, { weekStartsOn: 1 });

      // If today is Monday but before 8am, the active drop is still from last week
      const monday8am = setMilliseconds(setSeconds(setMinutes(setHours(monday, 0), 0), 0), 0);
      monday8am.setHours(8);

      if (isAfter(monday8am, now)) {
        monday = addDays(monday, -7);
      }

      const weekStartDate = format(monday, 'yyyy-MM-dd');
      console.log('📅 Weekly Drop: Week Start Date:', weekStartDate);

      // 2. Check if a drop already exists for this week
      const { data: existingDrop, error: fetchError } = await supabase
        .from('weekly_drops')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      console.log('📍 Weekly Drop: DB Query Params:', { user_id: user.id, week_start_date: weekStartDate });
      if (fetchError) console.error('❌ Weekly Drop: Fetch error details:', fetchError);
      console.log('📍 Weekly Drop: DB Result:', existingDrop);

      if (existingDrop) {
        console.log('✅ Weekly Drop: Found existing drop:', existingDrop.status, existingDrop.candidate_user_id);

        // If we already connected or skipped, we're DONE for the week. STOP SELECTION.
        if (existingDrop.status !== 'shown' && existingDrop.status !== 'no_match') {
          setMondayDrop(existingDrop);
          setIsLoadingMondayDrop(false);
          return;
        }

        // If there's a candidate, fetch their full profile details separately to avoid join syntax issues
        if (existingDrop.candidate_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, interests, bio')
            .eq('id', existingDrop.candidate_user_id)
            .single();

          if (profile) {
            // Fetch user profile for reason generation
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('interests, bio')
              .eq('id', user.id)
              .single();

            let reason = '';
            if (userProfile) {
              const { data: reasonData } = await supabase.functions.invoke('generate-suggestion-reason', {
                body: {
                  userAId: user.id,
                  userBId: profile.id,
                  userProfile,
                  candidateProfile: { interests: profile.interests || [], bio: profile.bio || '' },
                  similarity: existingDrop.similarity_score || 0.8
                }
              });
              reason = reasonData?.reason || '';
            }

            setMondayDrop({
              ...existingDrop,
              candidate: {
                id: profile.id,
                name: profile.full_name?.split(' ')[0] || 'User',
                avatar: getAvatarUrl(profile.avatar_url) || '/assets/onboarding/tn_logo_black.png',
                bio: profile.bio,
                interests: profile.interests,
                reason
              }
            });
          } else {
            setMondayDrop(existingDrop);
          }
        } else {
          setMondayDrop(existingDrop);
        }
        setIsLoadingMondayDrop(false);
        return;
      }

      // 3. Selection Algorithm (if no drop exists)
      const { data: userDnaV2 } = await supabase
        .from('digital_dna_v2')
        .select('composite_vector')
        .eq('user_id', user.id)
        .single();

      console.log('🧬 Weekly Drop: DNA v2:', userDnaV2 ? 'Found' : 'Missing');

      if (!userDnaV2?.composite_vector) {
        console.log('⚠️ Weekly Drop: No composite vector, recording no_match');
        await supabase.from('weekly_drops').insert({
          user_id: user.id,
          week_start_date: weekStartDate,
          status: 'no_match'
        });
        setMondayDrop({ status: 'no_match' });
        setIsLoadingMondayDrop(false);
        return;
      }

      console.log('🔍 Weekly Drop: Running match_profiles_v2 with threshold:', debugForceEligible ? 0.35 : 0.75);
      const { data: matchedProfiles, error: matchError } = await supabase.rpc('match_profiles_v2', {
        query_embedding: userDnaV2.composite_vector,
        match_threshold: debugForceEligible ? 0.35 : 0.75, // Lower threshold for testing/debug
        match_count: 50,
        ignore_user_id: user.id
      });

      if (matchError) console.error('❌ Weekly Drop: RPC Error:', matchError);
      console.log('📊 Weekly Drop: Matched profiles count:', matchedProfiles?.length || 0);

      if (matchError || !matchedProfiles || matchedProfiles.length === 0) {
        console.log('⚠️ Weekly Drop: No profiles matched, recording no_match');
        await supabase.from('weekly_drops').insert({
          user_id: user.id,
          week_start_date: weekStartDate,
          status: 'no_match'
        });
        setMondayDrop({ status: 'no_match' });
        setIsLoadingMondayDrop(false);
        return;
      }

      // Filter connected/history
      const { data: connections } = await supabase
        .from('user_connections')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const { data: history } = await supabase
        .from('weekly_drops')
        .select('candidate_user_id')
        .eq('user_id', user.id)
        .not('candidate_user_id', 'is', null);

      const { data: friendRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const excludeIds = new Set([
        user.id,
        ...(connections || []).flatMap(c => [c.sender_id, c.receiver_id]),
        ...(friendRequests || []).flatMap(f => [f.sender_id, f.receiver_id]),
        ...(history || []).map(h => h.candidate_user_id)
      ]);

      const candidates = matchedProfiles.filter((m: any) => !excludeIds.has(m.id));
      console.log('🎯 Weekly Drop: Filtered candidates count:', candidates.length);

      if (candidates.length === 0) {
        console.log('⚠️ Weekly Drop: All matches were already connected or seen, recording no_match');
        await supabase.from('weekly_drops').insert({
          user_id: user.id,
          week_start_date: weekStartDate,
          status: 'no_match'
        });
        setMondayDrop({ status: 'no_match' });
        setIsLoadingMondayDrop(false);
        return;
      }

      const selected = candidates[0];
      console.log('✨ Weekly Drop: Selected candidate:', selected.id, 'Similarity:', selected.similarity);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, interests, bio')
        .eq('id', selected.id)
        .single();

      if (!profile) {
        setMondayDrop({ status: 'no_match' });
        setIsLoadingMondayDrop(false);
        return;
      }

      // Generate reason
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('interests, bio')
        .eq('id', user.id)
        .single();

      let reason = '';
      if (userProfile) {
        const { data: reasonData } = await supabase.functions.invoke('generate-suggestion-reason', {
          body: {
            userAId: user.id,
            userBId: profile.id,
            userProfile,
            candidateProfile: { interests: profile.interests || [], bio: profile.bio || '' },
            similarity: selected.similarity
          }
        });
        reason = reasonData?.reason || '';
      }

      const { data: newDrop, error: insertError } = await supabase
        .from('weekly_drops')
        .upsert({
          user_id: user.id,
          week_start_date: weekStartDate,
          candidate_user_id: profile.id,
          similarity_score: selected.similarity,
          status: 'shown',
          shown_at: new Date().toISOString()
        }, { onConflict: 'user_id,week_start_date' })
        .select()
        .single();

      if (insertError) console.error('❌ Weekly Drop: Upsert error:', insertError);

      setMondayDrop({
        ...newDrop,
        candidate: {
          id: profile.id,
          name: profile.full_name?.split(' ')[0] || 'User',
          avatar: getAvatarUrl(profile.avatar_url) || '/assets/onboarding/tn_logo_black.png',
          bio: profile.bio,
          interests: profile.interests,
          reason
        }
      });
    } catch (error) {
      console.error('Error in loadMondayDrop:', error);
    } finally {
      setIsLoadingMondayDrop(false);
    }
  }, [user]);

  // Function to handle Weekly Drop interaction
  const handleMondayDropInteraction = async (type: 'connected' | 'skipped' | 'hidden') => {
    if (!user || !mondayDrop || !mondayDrop.id) return;

    const supabase = createClient();
    try {
      await supabase
        .from('weekly_drops')
        .update({
          status: type,
          interacted_at: new Date().toISOString()
        })
        .eq('id', mondayDrop.id);

      setMondayDrop((prev: any) => ({ ...prev, status: type }));

      // If connected, also refresh network
      if (type === 'connected') {
        loadNetworkData();
      }
    } catch (error) {
      console.error('Error updating Weekly Drop status:', error);
    }
  };

  // Re-run suggestions loading when force eligibility changes
  useEffect(() => {
    if (debugForceEligible) {
      loadAriaSuggestions();
    }
  }, [debugForceEligible, loadAriaSuggestions]);

  /* Debug Handlers
  const handleDebugReset = async () => {
    if (!user) return;
    const supabase = createClient();
    const now = new Date();
    let monday = startOfWeek(now, { weekStartsOn: 1 });
    const monday8am = setMilliseconds(setSeconds(setMinutes(setHours(monday, 0), 0), 0), 0);
    monday8am.setHours(8);
    if (isAfter(monday8am, now)) monday = addDays(monday, -7);
    const weekStartDate = format(monday, 'yyyy-MM-dd');

    await supabase
      .from('weekly_drops')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate);

    setMondayDrop(null);
    loadAriaSuggestions();
  };

  const handleDebugNoMatch = async () => {
    if (!user) return;
    const supabase = createClient();
    const now = new Date();
    let monday = startOfWeek(now, { weekStartsOn: 1 });
    const monday8am = setMilliseconds(setSeconds(setMinutes(setHours(monday, 0), 0), 0), 0);
    monday8am.setHours(8);
    if (isAfter(monday8am, now)) monday = addDays(monday, -7);
    const weekStartDate = format(monday, 'yyyy-MM-dd');

    await supabase
      .from('weekly_drops')
      .upsert({
        user_id: user.id,
        week_start_date: weekStartDate,
        status: 'no_match'
      }, { onConflict: 'user_id,week_start_date' });

    setMondayDrop({ status: 'no_match' });
  };

  const handleSimulateMonday = async () => {
    if (!user) return;

    setIsLoadingMondayDrop(true);
    setMondayDrop(null);
    setDebugForceEligible(true);

    // 1. Delete current week's drop from DB
    const supabase = createClient();
    const now = new Date();
    let monday = startOfWeek(now, { weekStartsOn: 1 });
    const monday8am = setMilliseconds(setSeconds(setMinutes(setHours(monday, 0), 0), 0), 0);
    monday8am.setHours(8);
    if (isAfter(monday8am, now)) monday = addDays(monday, -7);
    const weekStartDate = format(monday, 'yyyy-MM-dd');

    await supabase
      .from('weekly_drops')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate);

    // 2. Small delay to ensure the "Curating" state is seen
    await new Promise(r => setTimeout(r, 1500));

    // 3. Trigger fresh selection
    loadAriaSuggestions();
  };
  */

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
        setPendingRequestCount(0);
        return;
      }

      setPendingRequestCount(friendRequests?.length || 0);
    } catch (error) {
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

        <h2 className={styles.sectionTitle}>
          {isEligibleForMondayDrop
            ? (activeTab === 'drop' ? 'Your Weekly Drop' : 'Network Philosophy')
            : "Ari's Suggestions"}
        </h2>

        <div className={styles.actionIcons}>
          <div className={styles.iconButtonWrapper} onClick={() => setShowFriendRequests(true)}>
            <div className={styles.iconButton} style={{ position: 'relative' }}>
              <div className={styles.iconContainer}>
                <AddUserIcon />
              </div>
              {pendingRequestCount > 0 && (
                <span className={styles.notificationBadge}>{pendingRequestCount}</span>
              )}
            </div>
            <span className={styles.iconLabel}>Friend Requests</span>
          </div>
          <div className={styles.iconButtonWrapper} onClick={() => setShowSearchUser(true)}>
            <div className={styles.iconButton}>
              <div className={styles.iconContainer}>
                <SearchIcon />
              </div>
            </div>
            <span className={styles.iconLabel}>Search Users</span>
          </div>
          <div className={styles.iconButtonWrapper} onClick={() => setShowInviteModal(true)}>
            <div className={styles.iconButton}>
              <div className={styles.iconContainer}>
                <InviteIcon />
              </div>
            </div>
            <span className={styles.iconLabel}>Invite Friends</span>
          </div>
        </div>

        <div className={styles.suggestionList}>
          {isEligibleForMondayDrop && !isLoadingMondayDrop && !isLoadingSuggestions && (
            <div className={styles.tabContainer}>
              <button
                className={`${styles.tabButton} ${activeTab === 'philosophy' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('philosophy')}
              >
                Philosophy
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'drop' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('drop')}
              >
                Weekly Drop
              </button>
            </div>
          )}

          {isLoadingSuggestions || isLoadingMondayDrop ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 0, 0, 0.6)' }}>
              {isLoadingMondayDrop ? 'Curating your Weekly Drop...' : 'Loading suggestions...'}
            </div>
          ) : isEligibleForMondayDrop ? (
            activeTab === 'philosophy' ? (
              <AriaMessage />
            ) : mondayDrop?.status === 'shown' && mondayDrop.candidate ? (
              <div key={mondayDrop.candidate.id} className={styles.suggestionCard}>
                <img src={mondayDrop.candidate.avatar} alt={mondayDrop.candidate.name} className={styles.cardAvatar} />
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>{mondayDrop.candidate.name}</div>
                  <div className={styles.cardReason}>
                    {mondayDrop.candidate.reason || "One high-fit person this week."}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      className={styles.readMoreButton}
                      style={{ backgroundColor: '#000', color: '#fff', padding: '6px 16px', borderRadius: '20px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSuggestion(mondayDrop.candidate);
                      }}
                    >
                      View Profile
                    </button>
                    <button
                      className={styles.readMoreButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMondayDropInteraction('skipped');
                      }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ) : mondayDrop?.status === 'no_match' ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 0, 0, 0.6)' }}>
                <p style={{ fontWeight: 500 }}>None this week — we're keeping quality high.</p>
                <p style={{ fontSize: '0.85em', marginTop: '12px', opacity: 0.8 }}>Check back next week.</p>
              </div>
            ) : mondayDrop?.status === 'connected' || mondayDrop?.status === 'skipped' ? (
              <div className={styles.statusMessageCard}>
                <h3 className={styles.statusMessageTitle}>
                  {mondayDrop.status === 'connected' ? 'Request sent!' : 'Drop skipped.'}
                </h3>
                <p className={styles.statusMessageSub}>See you next week! ✨</p>
              </div>
            ) : (
              // Fallback for unexpected states while in dropdown tab
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(0, 0, 0, 0.6)' }}>
                <p style={{ fontWeight: 500 }}>Looking for your next drop...</p>
              </div>
            )
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

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
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

            // Handle Weekly Drop connection
            if (isEligibleForMondayDrop && mondayDrop?.candidate?.id === suggestionId) {
              await handleMondayDropInteraction('connected');
              setSelectedSuggestion(null);
              return;
            }

            // Immediately remove the suggestion from the list (before async operations)
            const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId);
            setSuggestions(updatedSuggestions);

            // Update interacted IDs and check total count
            const newInteractedIds = new Set([...interactedSuggestionIds, suggestionId]);
            setInteractedSuggestionIds(newInteractedIds);

            // If user has interacted with 3 total suggestions, transition to Weekly Drop UI immediately
            if (newInteractedIds.size >= 3) {
              setIsEligibleForMondayDrop(true);
              setShouldShowMessage(false);
              setSuggestions([]);
              setActiveTab('philosophy');
              loadMondayDrop();
            } else if (updatedSuggestions.length === 0) {
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
                  return;
                }
                if (!currentUser) {
                  return;
                }

                const { data: insertData, error: insertError } = await supabase
                  .from('suggestion_interactions')
                  .upsert({
                    user_id: currentUser.id,
                    suggested_user_id: suggestionId,
                    interaction_type: 'connected'
                  }, { onConflict: 'user_id,suggested_user_id' })
                  .select();

                if (insertError) {
                  // Error inserting suggestion interaction
                } else {
                  // Verify the insert worked by querying it back
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('suggestion_interactions')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .eq('suggested_user_id', suggestionId)
                    .single();

                  if (verifyError) {
                    // Could not verify inserted interaction
                  }
                }
              } catch (err) {
                // Error tracking interaction
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

            // Handle Weekly Drop skip
            if (isEligibleForMondayDrop && mondayDrop?.candidate?.id === suggestionId) {
              await handleMondayDropInteraction('skipped');
              setSelectedSuggestion(null);
              return;
            }

            // Immediately remove the suggestion from the list (before async operations)
            const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId);
            setSuggestions(updatedSuggestions);

            // Update interacted IDs and check total count
            const newInteractedIds = new Set([...interactedSuggestionIds, suggestionId]);
            setInteractedSuggestionIds(newInteractedIds);

            // If user has interacted with 3 total suggestions, transition to Weekly Drop UI immediately
            if (newInteractedIds.size >= 3) {
              setIsEligibleForMondayDrop(true);
              setShouldShowMessage(false);
              setSuggestions([]);
              setActiveTab('philosophy');
              loadMondayDrop();
            } else if (updatedSuggestions.length === 0) {
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
                  return;
                }
                if (!currentUser) {
                  return;
                }

                const { data: insertData, error: insertError } = await supabase
                  .from('suggestion_interactions')
                  .upsert({
                    user_id: currentUser.id,
                    suggested_user_id: suggestionId,
                    interaction_type: 'skipped'
                  }, { onConflict: 'user_id,suggested_user_id' })
                  .select();

                if (insertError) {
                  // Error inserting suggestion interaction
                } else {
                  // Verify the insert worked by querying it back
                  const { data: verifyData, error: verifyError } = await supabase
                    .from('suggestion_interactions')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .eq('suggested_user_id', suggestionId)
                    .single();

                  if (verifyError) {
                    // Could not verify inserted interaction
                  }
                }
              } catch (err) {
                // Error tracking interaction
              }
            })();
          }
        }}
      />

      {/* Debug Menu
      <div className={styles.debugContainer}>
        <button
          className={styles.debugTrigger}
          onClick={() => setShowDebugMenu(!showDebugMenu)}
          title="Debug Weekly Drop"
        >
          ⚙️
        </button>
        {showDebugMenu && (
          <div className={styles.debugMenu}>
            <div className={styles.debugTitle}>Weekly Drop Debug</div>
            <button
              className={styles.debugAction}
              onClick={() => {
                handleSimulateMonday();
                setShowDebugMenu(false);
              }}
              style={{ backgroundColor: '#000', color: '#fff' }}
            >
              🚀 Simulate New Monday
            </button>
            <button
              className={styles.debugAction}
              onClick={() => {
                setDebugForceEligible(!debugForceEligible);
                setShowDebugMenu(false);
              }}
            >
              {debugForceEligible ? '🟢 Forced Eligible' : '⚪️ Not Forced'}
            </button>
            <button
              className={styles.debugAction}
              onClick={() => {
                handleDebugReset();
                setShowDebugMenu(false);
              }}
            >
              🔄 Clear DB Record Only
            </button>
            <button
              className={styles.debugAction}
              onClick={() => {
                handleDebugNoMatch();
                setShowDebugMenu(false);
              }}
            >
              🚫 Force "No Match"
            </button>
          </div>
        )}
      </div>
      */}
    </div>
  );
}
