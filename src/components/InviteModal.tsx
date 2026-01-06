'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getReferralStats, ReferralStats } from '@/services/referral';
import styles from './InviteModal.module.css';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    } else {
      setCopied(false);
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setUser(currentUser);
    const referralStats = await getReferralStats(currentUser.id);
    setStats(referralStats);
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!stats?.inviteLink) return;

    try {
      await navigator.clipboard.writeText(stats.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareLink = async () => {
    if (!stats?.inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join The Network',
          text: 'Check out The Network - a platform to connect with like-minded people!',
          url: stats.inviteLink
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to copy
      copyToClipboard();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h2 className={styles.title}>Invite Friends</h2>
          <p className={styles.subtitle}>Grow your network and connect with amazing people</p>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading your invite link...</p>
          </div>
        ) : stats ? (
          <>
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statNumber}>{stats.acceptedInvites}</div>
                  <div className={styles.statLabel}>Friends Joined</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                  </svg>
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statNumber}>{stats.totalInvites}</div>
                  <div className={styles.statLabel}>Total Invites</div>
                </div>
              </div>
            </div>

            <div className={styles.linkSection}>
              <label className={styles.label}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Your Invite Link
              </label>
              <div className={styles.linkContainer}>
                <div className={styles.linkInputWrapper}>
                  <input
                    type="text"
                    value={stats.inviteLink}
                    readOnly
                    className={styles.linkInput}
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button onClick={shareLink} className={styles.shareButton}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Link
              </button>
            </div>

            <div className={styles.footer}>
              <div className={styles.footerIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <p className={styles.description}>
                Share your link with friends. When they join, you'll be <strong>automatically connected</strong>!
              </p>
            </div>
          </>
        ) : (
          <div className={styles.error}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Failed to load invite information</p>
          </div>
        )}
      </div>
    </div>
  );
}
