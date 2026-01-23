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
  bio?: string;
  interests?: string[];
}

import AddUserIcon from '@/components/icons/AddUserIcon';
import SearchIcon from '@/components/icons/SearchIcon';
import InviteIcon from '@/components/icons/InviteIcon';
import WeeklyDropIcon from '@/components/icons/WeeklyDropIcon';
import FriendRequestsModal from '@/components/FriendRequestsModal';
import SearchUserModal from '@/components/SearchUserModal';
import InviteModal from '@/components/InviteModal';

// Helper to resolve avatar URL
const getAvatarUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
};

// Embedded Panel Components
function FriendRequestsPanel({ onClose, onRequestAccepted }: { onClose: () => void; onRequestAccepted?: () => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: friendRequests } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (friendRequests && friendRequests.length > 0) {
      const senderIds = friendRequests.map(req => req.sender_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      setRequests(friendRequests.map(req => ({
        ...req,
        sender_profile: profiles?.find(p => p.id === req.sender_id)
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId: number, senderId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update friend request status to accepted
    await supabase.from('friend_requests').update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', requestId);

    // Create user_connection with current user as sender (required by RLS policy)
    // First check if connection already exists in either direction
    const { data: existingConns1 } = await supabase
      .from('user_connections')
      .select('id, status')
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id);

    const { data: existingConns2 } = await supabase
      .from('user_connections')
      .select('id, status')
      .eq('sender_id', user.id)
      .eq('receiver_id', senderId);

    const existingConns = [...(existingConns1 || []), ...(existingConns2 || [])];

    if (existingConns && existingConns.length > 0) {
      // Update existing connection to accepted
      await supabase
        .from('user_connections')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', existingConns[0].id);
    } else {
      // Create new connection with current user as sender (to pass RLS)
      await supabase.from('user_connections').insert({
        sender_id: user.id,
        receiver_id: senderId,
        status: 'accepted',
        created_at: new Date().toISOString()
      });
    }

    setRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessingIds(prev => { const next = new Set(prev); next.delete(requestId); return next; });
    onRequestAccepted?.();
  };

  const handleDecline = async (requestId: number) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    const supabase = createClient();
    await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
    setRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessingIds(prev => { const next = new Set(prev); next.delete(requestId); return next; });
  };

  return (
    <div>
      <div className={styles.embeddedPanelHeader}>
        <h3 className={styles.embeddedPanelTitle}>Friend Requests</h3>
        <button className={styles.embeddedPanelClose} onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className={styles.embeddedPanelBody}>
        {loading ? (
          <div className={styles.embeddedEmptyState}>Loading...</div>
        ) : requests.length === 0 ? (
          <div className={styles.embeddedEmptyState}>No pending friend requests</div>
        ) : (
          requests.map(req => (
            <div key={req.id} className={styles.embeddedListItem}>
              <div className={styles.embeddedListAvatar}>
                {req.sender_profile?.avatar_url ? (
                  <img src={getAvatarUrl(req.sender_profile.avatar_url)} alt="" />
                ) : (
                  req.sender_profile?.full_name?.[0] || '?'
                )}
              </div>
              <div className={styles.embeddedListInfo}>
                <div className={styles.embeddedListName}>{req.sender_profile?.full_name || 'Unknown'}</div>
              </div>
              <div className={styles.embeddedListActions}>
                <button
                  className={`${styles.embeddedListAction} ${styles.accept}`}
                  onClick={() => handleAccept(req.id, req.sender_id)}
                  disabled={processingIds.has(req.id)}
                >
                  Accept
                </button>
                <button
                  className={`${styles.embeddedListAction} ${styles.decline}`}
                  onClick={() => handleDecline(req.id)}
                  disabled={processingIds.has(req.id)}
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SearchUsersPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) { setResults([]); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const searchPattern = `%${searchQuery.trim()}%`;

    // Try or() query first
    const { data: orResults, error: orError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .neq('id', user.id)
      .ilike('full_name', searchPattern)
      .limit(10);

    if (orError) {
      // Fallback to simple name search
      const { data: nameResults } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user.id)
        .ilike('full_name', searchPattern)
        .limit(10);
      setResults(nameResults || []);
    } else {
      setResults(orResults || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const sendRequest = async (targetId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: targetId, status: 'pending' });
    setSentRequests(prev => new Set(prev).add(targetId));
  };

  return (
    <div>
      <div className={styles.embeddedPanelHeader}>
        <h3 className={styles.embeddedPanelTitle}>Search Users</h3>
        <button className={styles.embeddedPanelClose} onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className={styles.embeddedPanelBody}>
        <input
          type="text"
          className={styles.embeddedSearchInput}
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading ? (
          <div className={styles.embeddedEmptyState}>Searching...</div>
        ) : results.length === 0 && query ? (
          <div className={styles.embeddedEmptyState}>No users found</div>
        ) : (
          results.map(profile => (
            <div key={profile.id} className={styles.embeddedListItem}>
              <div className={styles.embeddedListAvatar}>
                {profile.avatar_url ? (
                  <img
                    src={getAvatarUrl(profile.avatar_url)}
                    alt=""
                    className="invert-media"
                  />
                ) : (
                  profile.full_name?.[0] || '?'
                )}
              </div>
              <div className={styles.embeddedListInfo}>
                <div className={styles.embeddedListName}>{profile.full_name}</div>
              </div>
              <button
                className={styles.embeddedListAction}
                onClick={() => sendRequest(profile.id)}
                disabled={sentRequests.has(profile.id)}
              >
                {sentRequests.has(profile.id) ? 'Sent' : 'Add'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WeeklyDropPanel({ onClose, mondayDrop, showCloseButton = true, onConnect, onSkip }: {
  onClose: () => void;
  mondayDrop: any;
  showCloseButton?: boolean;
  onConnect?: () => void;
  onSkip?: () => void;
}) {
  // If there's a candidate with status 'shown', display their profile
  if (mondayDrop?.status === 'shown' && mondayDrop?.candidate) {
    const candidate = mondayDrop.candidate;
    return (
      <div>
        <div className={styles.embeddedPanelHeader}>
          <h3 className={styles.embeddedPanelTitle}>Weekly Drop</h3>
          {showCloseButton && (
            <button className={styles.embeddedPanelClose} onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className={styles.embeddedPanelBody}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
            <img
              src={candidate.avatar}
              alt={candidate.name}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.1)'
              }}
            />
            <div style={{ textAlign: 'center' }} className={styles.weeklyDropTextContainer}>
              <div className={styles.weeklyDropName}>{candidate.name}</div>
              {candidate.reason && (
                <div className={styles.weeklyDropReason}>
                  {candidate.reason}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={onSkip}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: '1px solid rgba(0,0,0,0.2)',
                  background: 'transparent',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Skip
              </button>
              <button
                onClick={onConnect}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other statuses (should not show if our conditions are correct)
  return (
    <div>
      <div className={styles.embeddedPanelHeader}>
        <h3 className={styles.embeddedPanelTitle}>Weekly Drop</h3>
        {showCloseButton && (
          <button className={styles.embeddedPanelClose} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <div className={styles.embeddedPanelBody}>
        {mondayDrop?.status === 'skipped' || mondayDrop?.status === 'connected' ? (
          <div className={styles.embeddedEmptyState}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              {mondayDrop.status === 'connected' ? 'Request sent!' : 'Drop skipped.'}
            </div>
            <div>See you next week! ✨</div>
          </div>
        ) : mondayDrop?.status === 'no_match' ? (
          <div className={styles.embeddedEmptyState}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No match this week</div>
            <div>We&apos;ll find someone great next time!</div>
          </div>
        ) : (
          <div className={styles.embeddedEmptyState}>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Weekly Drop</div>
            <div>Check back Monday for your curated match!</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteFriendsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { getReferralStats } = await import('@/services/referral');
    const referralStats = await getReferralStats(user.id);
    setStats(referralStats);
    setLoading(false);
  };

  const copyLink = async () => {
    if (!stats?.inviteLink) return;
    await navigator.clipboard.writeText(stats.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className={styles.embeddedPanelHeader}>
        <h3 className={styles.embeddedPanelTitle}>Invite Friends</h3>
        <button className={styles.embeddedPanelClose} onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className={styles.embeddedPanelBody}>
        {loading ? (
          <div className={styles.embeddedEmptyState}>Loading...</div>
        ) : (
          <>
            <div className={styles.embeddedInviteLink}>
              <span className={styles.embeddedInviteLinkText}>{stats?.inviteLink || 'Loading...'}</span>
              <button
                className={`${styles.embeddedCopyButton} ${copied ? styles.copied : ''}`}
                onClick={copyLink}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className={styles.embeddedInviteStats}>
              <div className={styles.embeddedInviteStat}>
                <div className={styles.embeddedInviteStatValue}>{stats?.totalInvites || 0}</div>
                <div className={styles.embeddedInviteStatLabel}>Invited</div>
              </div>
              <div className={styles.embeddedInviteStat}>
                <div className={styles.embeddedInviteStatValue}>{stats?.acceptedInvites || 0}</div>
                <div className={styles.embeddedInviteStatLabel}>Joined</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<NetworkPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);

  // Ari's Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [interactedSuggestionIds, setInteractedSuggestionIds] = useState<Set<string>>(new Set());
  const [shouldShowMessage, setShouldShowMessage] = useState(false);

  // Weekly Drop State
  const [mondayDrop, setMondayDrop] = useState<any | null>(null);
  const [isLoadingMondayDrop, setIsLoadingMondayDrop] = useState(false);
  const [isEligibleForMondayDrop, setIsEligibleForMondayDrop] = useState(false);

  // Debug State
  // const [showDebugMenu, setShowDebugMenu] = useState(false);
  // const [debugForceEligible, setDebugForceEligible] = useState(false);
  const debugForceEligible = false; // Hardcoded to false

  // Expandable pill panel state
  const [expandedPanel, setExpandedPanel] = useState<'friendRequests' | 'searchUsers' | 'weeklyDrop' | 'inviteFriends' | 'suggestions' | 'profile' | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // Legacy modal states (kept for backwards compatibility, but we'll use expandedPanel)
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showSearchUser, setShowSearchUser] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);


  // Mobile suggestions panel state
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);

  // Network branching state
  const [expandedFriendId, setExpandedFriendId] = useState<string | null>(null);
  const [friendOfFriendData, setFriendOfFriendData] = useState<NetworkPerson[]>([]);
  const [mutualConnectionIds, setMutualConnectionIds] = useState<Set<string>>(new Set());
  const [isLoadingFriendNetwork, setIsLoadingFriendNetwork] = useState(false);

  // Discovery profiles state (floating circles - people in your networks but not connected)
  const [discoveryPeople, setDiscoveryPeople] = useState<NetworkPerson[]>([]);

  // Convert suggestions to NetworkPerson format for the graph
  const suggestionPeople: NetworkPerson[] = React.useMemo(() => {
    return suggestions.map(s => ({
      id: s.id,
      name: s.name,
      imageUrl: s.avatar,
      starColor: '#8E5BFF',
      x: 0, // Will be positioned by NetworkGalaxy
      y: 0,
      connections: [], // No visible connections
      bio: s.reason, // Use the suggestion reason as bio
      isSuggestionNode: true,
      similarity: s.similarity,
      suggestionReason: s.reason
    }));
  }, [suggestions]);

  const shouldShowDefaultSuggestions =
    !expandedPanel &&
    !isEligibleForMondayDrop &&
    connectionCount < 3 &&
    suggestions.length > 0;

  const openSuggestionProfile = (suggestion: any) => {
    const person: NetworkPerson = {
      id: suggestion.id,
      name: suggestion.name,
      imageUrl: suggestion.avatar,
      starColor: '#8E5BFF',
      x: 0,
      y: 0,
      connections: []
    };
    setSelectedPerson(person);
    setExpandedPanel('profile');
  };

  // Helper function to create current user node
  const createCurrentUserNode = (id: string, name: string, color: string, avatarUrl?: string): NetworkPerson => ({
    id,
    name,
    starColor: color,
    x: 400,
    y: 500,
    compatibilityPercentage: 100, // User is 100% compatible with themselves
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
      '#8E5BFF',
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

      // Fetch compatibility scores from user_matches table
      const { data: matches } = await supabase
        .from('user_matches')
        .select('match_user_id, compatibility_percentage')
        .eq('user_id', userId)
        .in('match_user_id', friendIds);

      // Create a map for quick lookup
      const compatibilityMap = new Map<string, number>();
      (matches || []).forEach((match: any) => {
        compatibilityMap.set(match.match_user_id, match.compatibility_percentage || 0);
      });

      // Position friends in a spiral pattern around center
      let index = 1;
      for (const profile of (profiles || [])) {
        const angle = (index * 2.4) + Math.random() * 0.5;
        const radius = 120 + (index * 30) + Math.random() * 50;
        const x = 400 + Math.cos(angle) * radius;
        const y = 500 + Math.sin(angle) * radius;

        // Get compatibility percentage from user_matches table
        const compatibilityPercentage = compatibilityMap.get(profile.id);

        loadedPeople.push({
          id: profile.id,
          name: profile.full_name?.split(' ')[0] || 'Friend',
          starColor: '#8E5BFF',
          x,
          y,
          compatibilityPercentage,
          connections: [userId],
          bio: undefined,
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

      if (connError || !connections || connections.length === 0) {
        // Try friend_requests table as fallback (some accepts only update friend_requests)
        const { data: friendRequests, error: frError } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted');

        if (frError || !friendRequests || friendRequests.length === 0) {
          setPeople([createCurrentUserNode(user.id, 'You', '#8E5BFF')]);
          setIsLoadingNetwork(false);
          return;
        }

        await processConnections(supabase, friendRequests, user.id);
        return;
      }

      await processConnections(supabase, connections, user.id);
    } catch (e) {
      setPeople([createCurrentUserNode(user.id, 'You', '#8E5BFF')]);
      setIsLoadingNetwork(false);
    }
  }, [user]);

  // Function to load a friend's network (their connections) for branching
  const loadFriendNetwork = useCallback(async (friendId: string) => {
    if (!user) return;

    // Clear old data IMMEDIATELY before setting new friend ID
    // This prevents the flash of old connections
    setFriendOfFriendData([]);
    setMutualConnectionIds(new Set());

    setIsLoadingFriendNetwork(true);
    setExpandedFriendId(friendId);
    const supabase = createClient();

    try {
      // Get the current user's friend IDs (my network)
      const myFriendIds = new Set(people.filter(p => p.id !== user.id).map(p => p.id));
      console.log('🔍 My network friend IDs:', Array.from(myFriendIds));

      // Use the secure database function to get friend's connections
      // This bypasses RLS while ensuring security (only works if we're actually friends)
      const { data: friendConnectionsRpc, error: rpcError } = await supabase
        .rpc('get_friend_connections', { target_friend_id: friendId });

      console.log('📡 Friend connections from RPC:', friendConnectionsRpc, 'Error:', rpcError);

      // Fallback to direct query if RPC fails (might be RLS restricted)
      let friendOfFriendIds = new Set<string>();

      if (rpcError || !friendConnectionsRpc) {
        console.log('⚠️ RPC failed, trying direct query (may be limited by RLS)');

        // Fetch friend's connections from user_connections
        const { data: friendConnections, error: connError } = await supabase
          .from('user_connections')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${friendId},receiver_id.eq.${friendId}`)
          .eq('status', 'accepted');

        console.log('📡 Friend connections from user_connections:', friendConnections, 'Error:', connError);

        // Also check friend_requests as fallback
        let allFriendConnections = friendConnections || [];
        if (connError || !friendConnections || friendConnections.length === 0) {
          const { data: friendRequests, error: frError } = await supabase
            .from('friend_requests')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${friendId},receiver_id.eq.${friendId}`)
            .eq('status', 'accepted');
          console.log('📡 Friend connections from friend_requests:', friendRequests, 'Error:', frError);
          allFriendConnections = friendRequests || [];
        }

        console.log('📊 Total friend connections found:', allFriendConnections.length, allFriendConnections);

        // Extract friend's connection IDs (excluding the friend themselves and the current user)
        allFriendConnections.forEach((conn: any) => {
          const connectedId = conn.sender_id === friendId ? conn.receiver_id : conn.sender_id;
          if (connectedId !== user.id && connectedId !== friendId) {
            friendOfFriendIds.add(connectedId);
          }
        });
      } else {
        // Use RPC results
        (friendConnectionsRpc || []).forEach((row: any) => {
          friendOfFriendIds.add(row.connected_user_id);
        });
      }

      console.log('👥 Friend of friend IDs (excluding user):', Array.from(friendOfFriendIds));

      // Identify mutual connections (people in both my network and friend's network)
      const mutuals = new Set<string>();
      friendOfFriendIds.forEach(id => {
        if (myFriendIds.has(id)) {
          mutuals.add(id);
          console.log('✅ Found mutual connection:', id);
        }
      });
      // The friend itself should also be highlighted (not greyed)
      mutuals.add(friendId);
      // Current user should never be greyed
      mutuals.add(user.id);
      console.log('🤝 Mutual connection IDs:', Array.from(mutuals));
      setMutualConnectionIds(mutuals);

      // Filter to only get friend-of-friends who are NOT already in my network (branch nodes)
      const branchNodeIds = Array.from(friendOfFriendIds).filter(id => !myFriendIds.has(id));
      console.log('🌿 Branch node IDs (friends outside my network):', branchNodeIds);

      if (branchNodeIds.length === 0) {
        // Friend has no connections outside of my network
        console.log('ℹ️ No branch nodes to show - friend has no connections outside your network');
        setFriendOfFriendData([]);
        setIsLoadingFriendNetwork(false);
        return;
      }

      // Fetch profiles for branch nodes
      const { data: branchProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', branchNodeIds);

      // Fetch extras for bio if needed
      const branchExtras = branchNodeIds.length > 0 ? await supabase
        .from('user_profile_extras')
        .select('user_id')
        .in('user_id', branchNodeIds) : { data: [] };

      if (!branchProfiles || branchProfiles.length === 0) {
        setFriendOfFriendData([]);
        setIsLoadingFriendNetwork(false);
        return;
      }

      // Find the friend's position in the current graph to position branch nodes around them
      const friendNode = people.find(p => p.id === friendId);
      const friendX = friendNode?.x || 400;
      const friendY = friendNode?.y || 500;

      // Find the user's position (center of the graph)
      const userNode = people.find(p => p.id === user.id);
      const userX = userNode?.x || 400;
      const userY = userNode?.y || 500;

      // Calculate direction FROM user TO friend (to push branches away from center)
      const directionAngle = Math.atan2(friendY - userY, friendX - userX);

      // Create NetworkPerson objects for branch nodes
      const branchPeople: NetworkPerson[] = branchProfiles.map((profile: any, index: number) => {
        // Position branch nodes in an arc AWAY from the user (opposite side of friend)
        const totalBranches = branchProfiles.length;
        const angleSpread = Math.PI * 0.7; // 126 degrees spread
        const startAngle = directionAngle - angleSpread / 2;
        const angle = totalBranches > 1
          ? startAngle + (index / (totalBranches - 1)) * angleSpread
          : directionAngle; // Single branch goes straight out
        const radius = 180; // Distance from the friend node

        // Calculate position relative to friend (away from user)
        const x = friendX + Math.cos(angle) * radius;
        const y = friendY + Math.sin(angle) * radius;

        return {
          id: profile.id,
          name: profile.full_name?.split(' ')[0] || 'User',
          starColor: '#8E5BFF',
          x,
          y,
          connections: [friendId], // Connected to the friend
          bio: undefined,
          imageUrl: getAvatarUrl(profile.avatar_url),
          isBranchNode: true,
          parentFriendId: friendId,
          isGreyedOut: false
        };
      });

      setFriendOfFriendData(branchPeople);
    } catch (error) {
      console.error('Error loading friend network:', error);
      setFriendOfFriendData([]);
      setMutualConnectionIds(new Set());
    } finally {
      setIsLoadingFriendNetwork(false);
    }
  }, [user, people]);

  // Function to load discovery profiles (people in your networks but not connected)
  const loadDiscoveryProfiles = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    try {
      // Fetch discovery profiles from the database
      const { data: profiles, error } = await supabase
        .from('discovery_profiles')
        .select('*')
        .eq('is_active', true)
        .order('proximity_score', { ascending: false });

      if (error) {
        console.error('Error loading discovery profiles:', error);
        setDiscoveryPeople([]);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setDiscoveryPeople([]);
        return;
      }

      // Convert discovery profiles to NetworkPerson format
      const discoveryNodes: NetworkPerson[] = profiles.map((profile: any) => ({
        id: profile.id,
        name: profile.full_name?.split(' ')[0] || 'User',
        imageUrl: profile.avatar_url,
        starColor: '#6366f1', // Indigo for discovery nodes
        x: 0, // Will be positioned by NetworkGalaxy based on proximity
        y: 0,
        connections: [], // No connections (no lines!)
        bio: profile.bio,
        isDiscoveryNode: true,
        proximityScore: profile.proximity_score || 0.5,
        proximityLevel: profile.proximity_level || 'nearby',
        sharedNetworks: profile.networks || [],
        whyYouMightMeet: profile.why_you_might_meet
      }));

      setDiscoveryPeople(discoveryNodes);
    } catch (error) {
      console.error('Error loading discovery profiles:', error);
      setDiscoveryPeople([]);
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
      setConnectionCount(connectionCount);

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
        .select('id, full_name')
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
          // Note: interests column removed from profiles table
          // Disabled: interests column no longer exists
          /*
          if (user) {
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
          }
          */

          /*
            // Note: interests column removed, cannot query by interests overlap
            if (user) {
              const { data: similarProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .neq('id', user.id)
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
                              interests: [],
                              bio: ''
                            },
                            candidateProfile: {
                              interests: [],
                              bio: ''
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
          */
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
        .select('id, full_name, avatar_url')
        .in('id', topMatchIds);

      if (!fullProfiles || fullProfiles.length === 0) {
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      // 8. Format suggestions with compelling reasons (only from not-in-network matches)
      // Only fetch remaining slots (3 minus interactions already made)
      const remainingSuggestionCount = connectionCount < 3
        ? Math.max(0, 3 - connectionCount)
        : Math.max(0, 3 - interactedIds.size);
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
                      interests: [],
                      bio: ''
                    },
                    candidateProfile: {
                      interests: [],
                      bio: ''
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
      const remainingSuggestionSlots = connectionCount < 3
        ? Math.max(0, 3 - connectionCount)
        : Math.max(0, 3 - interactedIds.size);

      const formattedSuggestions = (await Promise.all(formattedSuggestionsPromises))
        .filter((s: any) => s !== null)
        .filter((s: any) => !interactedIds.has(s.id)) // Filter out already interacted suggestions
        .slice(0, remainingSuggestionSlots); // Only show remaining slots (3 minus interactions)

      // If all suggestions have been interacted with, show message
      if (formattedSuggestions.length === 0) {
        setShouldShowMessage(connectionCount >= 3);
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
            .select('id, full_name, avatar_url, interests')
            .eq('id', existingDrop.candidate_user_id)
            .single();

          if (profile) {
            // Fetch user profile for reason generation
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('interests')
              .eq('id', user.id)
              .single();

            let reason = '';
            if (userProfile) {
              const { data: reasonData } = await supabase.functions.invoke('generate-suggestion-reason', {
                body: {
                  userAId: user.id,
                  userBId: profile.id,
                  userProfile,
                  candidateProfile: { interests: [], bio: '' },
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
                bio: undefined,
                interests: [],
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
        .select('id, full_name, avatar_url, interests')
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
        .select('interests')
        .eq('id', user.id)
        .single();

      let reason = '';
      if (userProfile) {
        const { data: reasonData } = await supabase.functions.invoke('generate-suggestion-reason', {
          body: {
            userAId: user.id,
            userBId: profile.id,
            userProfile,
            candidateProfile: { interests: profile.interests || [], bio: '' },
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
          bio: undefined,
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
    // loadDiscoveryProfiles(); // Load discovery nodes (floating circles)
  }, [loadNetworkData, loadAriaSuggestions, checkPendingFriendRequests, loadDiscoveryProfiles]);

  // Refresh friend request count when modal opens
  useEffect(() => {
    if (showFriendRequests) {
      checkPendingFriendRequests();
    }
  }, [showFriendRequests, checkPendingFriendRequests]);

  // Wait for both network AND suggestions to load before showing the graph
  // This prevents suggestions from popping in after the graph is visible
  if (loading || isLoadingNetwork || isLoadingSuggestions) {
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
            // Open profile modal for the clicked person
            if (person.id !== user?.id) {
              setSelectedPerson(person);
              setExpandedPanel('profile');
            }
          }}
          expandedFriendId={expandedFriendId}
          onFriendExpand={(friendId) => {
            if (friendId) {
              const person = people.find(p => p.id === friendId);

              // If clicking the same friend that's already expanded, just collapse
              if (expandedFriendId === friendId) {
                setExpandedFriendId(null);
                setFriendOfFriendData([]);
                setMutualConnectionIds(new Set());
              } else {
                // Expand this friend's network AND show their profile
                loadFriendNetwork(friendId);
                // Show profile in pill on first click
                if (person) {
                  setSelectedPerson(person);
                  setExpandedPanel('profile');
                }
              }
            } else {
              // Collapse the network
              setExpandedFriendId(null);
              setFriendOfFriendData([]);
              setMutualConnectionIds(new Set());
            }
          }}
          friendOfFriendData={friendOfFriendData}
          mutualConnectionIds={mutualConnectionIds}
          isLoadingFriendNetwork={isLoadingFriendNetwork}
          discoveryPeople={discoveryPeople}
          suggestionPeople={suggestionPeople}
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

        <div className={`${styles.actionIconsPill} ${(expandedPanel || (mondayDrop?.status === 'shown' && mondayDrop?.candidate)) ? styles.expanded : ''}`}>
          <div className={styles.actionIcons}>
            <div
              className={`${styles.iconButtonWrapper} ${expandedPanel === 'inviteFriends' ? styles.active : ''}`}
              onClick={() => setExpandedPanel(expandedPanel === 'inviteFriends' ? null : 'inviteFriends')}
            >
              <div className={styles.iconButton}>
                <div className={styles.iconContainer}>
                  <InviteIcon />
                </div>
              </div>
              <span className={styles.iconLabel}>Invite Friends</span>
            </div>
            <div
              className={`${styles.iconButtonWrapper} ${expandedPanel === 'searchUsers' ? styles.active : ''}`}
              onClick={() => setExpandedPanel(expandedPanel === 'searchUsers' ? null : 'searchUsers')}
            >
              <div className={styles.iconButton}>
                <div className={styles.iconContainer}>
                  <SearchIcon />
                </div>
              </div>
              <span className={styles.iconLabel}>Search Users</span>
            </div>
            <div
              className={`${styles.iconButtonWrapper} ${expandedPanel === 'friendRequests' ? styles.active : ''}`}
              onClick={() => setExpandedPanel(expandedPanel === 'friendRequests' ? null : 'friendRequests')}
            >
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
            {/* Weekly Drop button removed - card now shows automatically when no other panel is open */}
          </div>

          {/* Expanded Panel Content - shows when panel selected, weekly drop, or default suggestions */}
          {(expandedPanel || shouldShowDefaultSuggestions || (mondayDrop?.status === 'shown' && mondayDrop?.candidate)) && (
            <div className={styles.expandedContent}>
              {expandedPanel === 'friendRequests' && (
                <FriendRequestsPanel onClose={() => setExpandedPanel(null)} onRequestAccepted={loadNetworkData} />
              )}
              {expandedPanel === 'searchUsers' && (
                <SearchUsersPanel onClose={() => setExpandedPanel(null)} />
              )}
              {expandedPanel === 'inviteFriends' && (
                <InviteFriendsPanel onClose={() => setExpandedPanel(null)} />
              )}
              {expandedPanel === 'profile' && selectedPerson && (
                <div className={styles.profilePanelContent}>
                  <button
                    className={styles.embeddedPanelClose}
                    onClick={() => {
                      setExpandedPanel(null);
                      setSelectedPerson(null);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <ProfileModal
                    person={selectedPerson}
                    onClose={() => {
                      setExpandedPanel(null);
                      setSelectedPerson(null);
                    }}
                    isEmbedded={true}
                  />
                </div>
              )}
              {/* Weekly Drop shows by default ONLY when there's an actual match to show */}
              {!expandedPanel && mondayDrop?.status === 'shown' && mondayDrop?.candidate && (
                <WeeklyDropPanel
                  onClose={() => { }}
                  mondayDrop={mondayDrop}
                  showCloseButton={false}
                  onConnect={() => handleMondayDropInteraction('connected')}
                  onSkip={() => handleMondayDropInteraction('skipped')}
                />
              )}
              {!expandedPanel && shouldShowDefaultSuggestions && (
                <div className={styles.suggestionsDefault}>
                  <div className={styles.suggestionsHeader}>
                    The Network's Suggestions:
                  </div>
                  <div className={styles.suggestionList}>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        className={styles.suggestionCard}
                        onClick={() => openSuggestionProfile(suggestion)}
                        type="button"
                      >
                        <img
                          src={suggestion.avatar}
                          alt={suggestion.name}
                          className={`${styles.cardAvatar} invert-media`}
                        />
                        <div className={styles.cardInfo}>
                          <div className={styles.cardName}>{suggestion.name}</div>
                          <div className={styles.cardReason}>{suggestion.reason}</div>
                        </div>
                        <button
                          type="button"
                          className={styles.viewProfileButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            openSuggestionProfile(suggestion);
                          }}
                        >
                          View Profile
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Profile Modal - Only render when not in sidebar mode (mobile overlay) */}

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
