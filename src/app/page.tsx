'use client';

import React, { useEffect, useState } from 'react';
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

  // Aria's Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([
    { id: '1', name: 'Tristan', reason: 'Also loves tech', avatar: '/assets/onboarding/tn_logo_black.png' },
    { id: '2', name: 'Dhruv', reason: 'You two both love Warframe!', avatar: '/assets/onboarding/tn_logo_black.png' },
    { id: '3', name: 'Ayen', reason: 'Big philosopher guy', avatar: '/assets/onboarding/tn_logo_black.png' },
  ]);

  // Auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/landing');
    }
  }, [user, loading, router]);

  // Load REAL network data from Supabase
  useEffect(() => {
    if (!user) return;

    const loadNetworkData = async () => {
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
    };

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

    loadNetworkData();
  }, [user?.id]);

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
          onPersonClick={(person) => setSelectedPerson(person)}
        />
      </div>

      {/* Aria's Suggestions Overlay */}
      <div className={styles.suggestionsPanel}>
        <h2 className={styles.panelTitle}>Aria's Suggestions</h2>

        <div className={styles.actionIcons}>
          <div className={styles.iconButton}>
            <AddUserIcon />
          </div>
          <div className={styles.iconButton}>
            <SearchIcon />
          </div>
        </div>

        <div className={styles.suggestionList}>
          {suggestions.map((person) => (
            <div key={person.id} className={styles.suggestionCard}>
              <img src={person.avatar} alt={person.name} className={styles.cardAvatar} />
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{person.name}</div>
                <div className={styles.cardReason}>{person.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Modal */}
      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}
