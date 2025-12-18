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

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<NetworkPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);

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

        // Process Pending
        if (pending && pending.length > 0) {
          const senderIds = pending.map(p => p.sender_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', senderIds);

          const requestsWithProfile = pending.map(p => {
            const profile = profiles?.find(pr => pr.id === p.sender_id);
            return { ...p, profile: profile || {} };
          });
          setRequests(requestsWithProfile);
        } else {
          setRequests([]);
        }

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
        currentProfile?.star_color || '#8E5BFF'
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
          });

          // Update current user's connections
          loadedPeople[0].connections.push(profile.id);
          index++;
        }
      }

      setPeople(loadedPeople);
      setIsLoadingNetwork(false);
    };

    const createCurrentUserNode = (id: string, name: string, color: string): NetworkPerson => ({
      id,
      name,
      starColor: color,
      x: 400,
      y: 500,
      stars: 5,
      connections: [],
    });

    loadNetworkData();
  }, [user]);

  // Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);


  // Accept Handler
  const handleAccept = async (request: any) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (error) throw error;

      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== request.id));

      // Reload for safety to show new graph
      window.location.reload();
    } catch (e) {
      console.error('Error accepting:', e);
      alert('Failed to accept request');
    }
  };


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
    <>
      <Menu />

      {/* Requests Notification */}
      <button
        className={styles.requestsBtn}
        onClick={() => setShowRequests(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 100,
          background: requests.length > 0 ? '#ff0050' : '#f0f0f0',
          color: requests.length > 0 ? 'white' : '#333',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '20px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
        }}
      >
        Requests {requests.length > 0 ? `(${requests.length})` : ''}
      </button>

      {/* Requests Modal */}
      {showRequests && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowRequests(false)}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'black' }}>Pending Requests</h2>
            {requests.length === 0 ? (
              <p style={{ color: 'black' }}>No more requests.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {requests.map(req => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: req.profile?.star_color || '#eee',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold'
                      }}>
                        {req.profile?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'black' }}>{req.profile?.full_name || 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Wants to connect</div>
                      </div>
                    </div>
                    <button onClick={() => handleAccept(req)} style={{
                      background: 'black', color: 'white', border: 'none',
                      padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                    }}>
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowRequests(false)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#f5f5f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'black' }}>Close</button>
          </div>
        </div>
      )}

      <NetworkGalaxy
        people={people}
        currentUserId={user.id}
        onPersonClick={(person) => setSelectedPerson(person)}
      />

      {/* Profile Modal */}
      {selectedPerson && (
        <ProfileModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </>
  );
}
