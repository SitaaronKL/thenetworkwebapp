'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from './SuggestionDetailModal.module.css';

interface SuggestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: {
    id: string;
    name: string;
    reason: string;
    avatar: string;
  } | null;
  onRequestSent?: () => void;
  onDismiss?: () => void;
}

type RequestStatus = 'none' | 'pending' | 'accepted' | 'checking';

export default function SuggestionDetailModal({ isOpen, onClose, person, onRequestSent, onDismiss }: SuggestionDetailModalProps) {
  const router = useRouter();
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('checking');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && person) {
      checkExistingConnection();
    } else {
      setRequestStatus('checking');
    }
  }, [isOpen, person]);

  const checkExistingConnection = async () => {
    if (!person) return;
    
    setRequestStatus('checking');
    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRequestStatus('none');
        return;
      }

      // Check for existing friend requests
      const { data: existingRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${person.id},receiver_id.eq.${person.id}`);

      // Check for existing connections
      const { data: existingConnections } = await supabase
        .from('user_connections')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${person.id},receiver_id.eq.${person.id}`);

      // Check if already connected
      const isConnected = (existingConnections || []).some(conn =>
        ((conn.sender_id === user.id && conn.receiver_id === person.id) ||
         (conn.receiver_id === user.id && conn.sender_id === person.id)) &&
        conn.status === 'accepted'
      );

      if (isConnected) {
        setRequestStatus('accepted');
        return;
      }

      // Check if request already sent/received
      const foundRequest = (existingRequests || []).find(req =>
        ((req.sender_id === user.id && req.receiver_id === person.id) ||
         (req.receiver_id === user.id && req.sender_id === person.id))
      );

      if (foundRequest) {
        setRequestStatus(foundRequest.status === 'pending' ? 'pending' : 'accepted');
      } else {
        setRequestStatus('none');
      }
    } catch (error) {
      setRequestStatus('none');
    }
  };

  const handleSendRequest = async () => {
    if (!person || isSending || requestStatus !== 'none') return;

    setIsSending(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if request already exists (race condition protection)
      const { data: existing } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
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
          sender_id: user.id,
          receiver_id: person.id,
          status: 'pending'
        });

      if (error) {
      } else {
        setRequestStatus('pending');
        if (onRequestSent) {
          onRequestSent();
        }
        // Close the modal after a brief delay to show "Request Sent" state
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (error) {
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !person) return null;

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
        <div className={styles.header}>
          <div className={styles.personInfo}>
            <img src={person.avatar} alt={person.name} className={styles.avatar} />
            <h2 className={styles.name}>{person.name}</h2>
          </div>
          <button
            type="button"
            className={styles.viewProfileButton}
            onClick={async () => {
              if (!person) return;
              const supabase = createClient();
              const { data } = await supabase.rpc('get_profile_slug', { p_user_id: person.id });
              if (data) router.push(`/network-profile/${data}`);
            }}
          >
            View Profile
          </button>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.reasonTitle}>WHY YOU'D CONNECT:</div>
          <div className={styles.fullReason}>{person.reason}</div>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.primaryButton}`}
            onClick={handleSendRequest}
            disabled={isButtonDisabled}
          >
            {isSending ? 'Sending...' : getButtonText()}
          </button>
          <button
            className={`${styles.actionButton} ${styles.secondaryButton}`}
            onClick={() => {
              if (onDismiss) {
                onDismiss();
              }
              onClose();
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

