'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteLeaderboard, getUserLeaderboardStats, LeaderboardEntry } from '@/services/referral';
import { createClient } from '@/lib/supabase';
import Menu from '@/components/Menu';
import styles from './page.module.css';

type Period = 'all-time' | 'monthly' | 'weekly';

export default function InviteLeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<{ rank: number; inviteCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all-time');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user, period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const [leaderboardData, stats] = await Promise.all([
        getInviteLeaderboard(period),
        user ? getUserLeaderboardStats(user.id, period) : Promise.resolve(null)
      ]);
      setLeaderboard(leaderboardData);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return '/assets/onboarding/tn_logo_black.png';
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
  };

  if (authLoading || loading) {
    return (
      <>
        <Menu />
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Menu />
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>Invite Leaderboard</h1>

          {/* Period Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${period === 'all-time' ? styles.active : ''}`}
              onClick={() => setPeriod('all-time')}
            >
              All Time
            </button>
            <button
              className={`${styles.tab} ${period === 'monthly' ? styles.active : ''}`}
              onClick={() => setPeriod('monthly')}
            >
              This Month
            </button>
            <button
              className={`${styles.tab} ${period === 'weekly' ? styles.active : ''}`}
              onClick={() => setPeriod('weekly')}
            >
              This Week
            </button>
          </div>

          {/* User Stats */}
          {userStats && (
            <div className={styles.userStats}>
              <div className={styles.userStatItem}>
                <span className={styles.userStatLabel}>Your Rank</span>
                <span className={styles.userStatValue}>#{userStats.rank}</span>
              </div>
              <div className={styles.userStatItem}>
                <span className={styles.userStatLabel}>Friends Invited</span>
                <span className={styles.userStatValue}>{userStats.inviteCount}</span>
              </div>
            </div>
          )}

          {/* Leaderboard List */}
          <div className={styles.leaderboard}>
            {leaderboard.length === 0 ? (
              <div className={styles.empty}>No invites yet. Be the first!</div>
            ) : (
              leaderboard.map((entry, index) => {
                const isCurrentUser = user && entry.user_id === user.id;
                return (
                  <div
                    key={entry.user_id}
                    className={`${styles.leaderboardItem} ${isCurrentUser ? styles.currentUser : ''}`}
                  >
                    <div className={styles.rank}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>
                    <img
                      src={getAvatarUrl(entry.avatar_url)}
                      alt={entry.full_name}
                      className={styles.avatar}
                    />
                    <div className={styles.userInfo}>
                      <div className={styles.name}>
                        {entry.full_name}
                        {isCurrentUser && <span className={styles.youBadge}> (You)</span>}
                      </div>
                    </div>
                    <div className={styles.count}>{entry.invite_count}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

