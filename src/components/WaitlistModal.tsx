'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './WaitlistModal.module.css';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

interface WaitlistResult {
  id: string;
  invite_code: string;
  referral_count: number;
  is_early_tester: boolean;
  has_launch_party_ticket: boolean;
}

export default function WaitlistModal({ isOpen, onClose, theme = 'dark' }: WaitlistModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [interestedInBeta, setInterestedInBeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [campaignCode, setCampaignCode] = useState<string | null>(null);
  const [referredByCode, setReferredByCode] = useState<string | null>(null);
  const [waitlistResult, setWaitlistResult] = useState<WaitlistResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Load campaign code and referral code from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCampaignCode = localStorage.getItem('marketing_campaign_code');
      const storedReferralCode = localStorage.getItem('waitlist_referral_code');

      if (storedCampaignCode) {
        setCampaignCode(storedCampaignCode);
      }

      if (storedReferralCode) {
        setReferredByCode(storedReferralCode);
      }
    }
  }, []);

  // When modal opens and we have a persisted waitlist signup, fetch their entry to show the referral screen
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const storedEmail = localStorage.getItem('waitlist_signed_up_email');
    if (!storedEmail || waitlistResult) return;

    let cancelled = false;
    setIsLoadingExisting(true);

    const load = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_waitlist_entry_by_email', { p_email: storedEmail });
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          localStorage.removeItem('waitlist_signed_up_email');
          setIsLoadingExisting(false);
          return;
        }
        setWaitlistResult({
          id: data[0].id,
          invite_code: data[0].invite_code,
          referral_count: data[0].referral_count ?? 0,
          is_early_tester: data[0].is_early_tester ?? false,
          has_launch_party_ticket: data[0].has_launch_party_ticket ?? false,
        });
        setIsSubmitted(true);
      } catch {
        if (!cancelled) {
          localStorage.removeItem('waitlist_signed_up_email');
        }
      } finally {
        if (!cancelled) setIsLoadingExisting(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();

      // Check if email already exists on waitlist
      const { data: existingEntry, error: checkError } = await supabase
        .rpc('get_waitlist_entry_by_email', { p_email: normalizedEmail });

      if (checkError) {
        throw checkError;
      }

      if (existingEntry && existingEntry.length > 0) {
        // User already on waitlist - show their existing invite code
        setWaitlistResult({
          id: existingEntry[0].id,
          invite_code: existingEntry[0].invite_code,
          referral_count: existingEntry[0].referral_count,
          is_early_tester: existingEntry[0].is_early_tester,
          has_launch_party_ticket: existingEntry[0].has_launch_party_ticket,
        });
        setIsSubmitted(true);
        setIsSubmitting(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('waitlist_signed_up_email', normalizedEmail);
        }
        return;
      }

      // Get campaign_id if we have a campaign code
      let campaignId = null;
      if (campaignCode) {
        const { data: campaign } = await supabase
          .from('ab_marketing_campaigns')
          .select('id')
          .eq('campaign_code', campaignCode)
          .single();

        if (campaign) {
          campaignId = campaign.id;
        }
      }

      // Use the database function to create entry with invite code
      const { data: result, error: insertError } = await supabase
        .rpc('create_waitlist_entry', {
          p_name: name.trim(),
          p_email: normalizedEmail,
          p_school: school.trim() || null,
          p_campaign_code: campaignCode,
          p_campaign_id: campaignId,
          p_referred_by_code: referredByCode,
          p_interested_in_beta: interestedInBeta,
        });

      if (insertError) {
        throw insertError;
      }

      if (result && result.length > 0) {
        setWaitlistResult({
          id: result[0].id,
          invite_code: result[0].invite_code,
          referral_count: result[0].referral_count || 0,
          is_early_tester: result[0].is_early_tester || false,
          has_launch_party_ticket: result[0].has_launch_party_ticket || false,
        });
      }

      // Reset form and show success state
      setName('');
      setEmail('');
      setSchool('');
      setIsSubmitted(true);

      // Clear campaign and referral data from localStorage after successful signup
      if (typeof window !== 'undefined') {
        localStorage.removeItem('marketing_campaign_code');
        localStorage.removeItem('marketing_campaign_name');
        localStorage.removeItem('marketing_campaign_school');
        localStorage.removeItem('marketing_campaign_variant');
        localStorage.removeItem('marketing_campaign_timestamp');
        localStorage.removeItem('waitlist_referral_code');
        localStorage.setItem('waitlist_signed_up_email', normalizedEmail);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInviteLink = () => {
    if (!waitlistResult?.invite_code) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/r/${waitlistResult.invite_code}`;
    }
    return '';
  };

  const handleCopyLink = async () => {
    const link = getInviteLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  const referralCount = waitlistResult?.referral_count || 0;
  const isEarlyTester = waitlistResult?.is_early_tester || referralCount >= 3;
  const hasLaunchTicket = waitlistResult?.has_launch_party_ticket || referralCount >= 5;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme === 'dark' ? '#ffffff' : '#000000',
          color: theme === 'dark' ? '#000000' : '#ffffff',
        }}
      >
        <button
          className={styles.closeButton}
          onClick={handleClose}
          style={{
            color: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {isLoadingExisting ? (
          // Loading existing waitlist entry (returning user)
          <div className={styles.successState}>
            <div className={styles.loadingSpinner} />
            <h2 className={styles.titleSuccess}>You&apos;re on the waitlist!</h2>
            <p className={styles.subtitleCompact}>Loading your invite link...</p>
          </div>
        ) : (isSubmitted || waitlistResult) ? (
          // Success State with Invite Link
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className={styles.titleSuccess}>You&apos;re on the waitlist!</h2>
            <p className={styles.subtitleCompact}>
              We&apos;ll reach out when we have more updates. In the meantime, follow our <a
                href="https://www.instagram.com/join.thenetwork/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.instaLink}
              >Insta</a> to stay updated.
            </p>

            {/* Referral Section */}
            <div className={styles.referralSection}>
              <h3 className={styles.referralTitle}>Want to skip the line?</h3>
              <p className={styles.referralSubtitle}>
                Invite friends to unlock exclusive rewards
              </p>

              {/* Reward Tiers */}
              <div className={styles.rewardTiers}>
                <div className={`${styles.rewardTier} ${isEarlyTester ? styles.rewardUnlocked : ''}`}>
                  <div className={styles.rewardIcon}>
                    {isEarlyTester ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    ) : (
                      <span>{Math.min(referralCount, 3)}/3</span>
                    )}
                  </div>
                  <div className={styles.rewardInfo}>
                    <span className={styles.rewardLabel}>3 invites</span>
                    <span className={styles.rewardName}>Early Tester Access</span>
                  </div>
                </div>

                <div className={`${styles.rewardTier} ${hasLaunchTicket ? styles.rewardUnlocked : ''}`}>
                  <div className={styles.rewardIcon}>
                    {hasLaunchTicket ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    ) : (
                      <span>{Math.min(referralCount, 5)}/5</span>
                    )}
                  </div>
                  <div className={styles.rewardInfo}>
                    <span className={styles.rewardLabel}>5 invites</span>
                    <span className={styles.rewardName}>Free Launch Party Ticket</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min((referralCount / 5) * 100, 100)}%` }}
                  />
                  <div className={styles.progressMarker} style={{ left: '60%' }} />
                </div>
                <div className={styles.progressLabels}>
                  <span>{referralCount} invited</span>
                  <span>{Math.max(5 - referralCount, 0)} to go</span>
                </div>
              </div>

              {/* Invite Link */}
              <div className={styles.inviteLinkSection}>
                <p className={styles.inviteLinkLabel}>Your personal invite link</p>
                <div
                  className={styles.inviteLinkBox}
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <span className={styles.inviteLink}>{getInviteLink()}</span>
                  <button
                    onClick={handleCopyLink}
                    className={styles.copyButton}
                    style={{
                      backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Form State
          <>
            <h2 className={styles.title}>Join the Waitlist</h2>
            <p className={styles.subtitle}>
              Be among the first to experience TheNetwork
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={styles.input}
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    color: theme === 'dark' ? '#000000' : '#ffffff',
                  }}
                />
              </div>

              <div className={styles.inputGroup}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    color: theme === 'dark' ? '#000000' : '#ffffff',
                  }}
                />
              </div>

              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="School (optional)"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className={styles.input}
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    color: theme === 'dark' ? '#000000' : '#ffffff',
                  }}
                />
              </div>

              {/* Beta Tester Interest Checkbox */}
              <label
                className={styles.checkboxLabel}
                style={{
                  color: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <input
                  type="checkbox"
                  checked={interestedInBeta}
                  onChange={(e) => setInterestedInBeta(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>
                  I am interested in being a beta tester. Make note that involves being in contact with the founding team, giving feedback, and contributing to new feature development.
                </span>
              </label>

              {error && (
                <div className={styles.error} style={{ color: theme === 'dark' ? '#ef4444' : '#fca5a5' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitButton}
                style={{
                  backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  opacity: isSubmitting ? 0.6 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
