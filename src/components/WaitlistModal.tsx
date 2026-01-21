'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './WaitlistModal.module.css';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function WaitlistModal({ isOpen, onClose, theme = 'dark' }: WaitlistModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check if email already exists on waitlist
      const { data: existingEntries, error: checkError } = await supabase
        .from('waitlist')
        .select('email')
        .eq('email', normalizedEmail);

      if (checkError) {
        throw checkError;
      }

      if (existingEntries && existingEntries.length > 0) {
        setError('This email is already on the waitlist!');
        setIsSubmitting(false);
        return;
      }
      
      // Insert into waitlist table
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          school: school.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      // Reset form and show success state
      setName('');
      setEmail('');
      setSchool('');
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToDemo = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
      setIsFadingOut(false);
      router.push('/consent?slideIn=true');
    }, 400);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${isFadingOut ? styles.fadeToBlack : ''}`} onClick={handleClose}>
      <div 
        className={`${styles.modal} ${isFadingOut ? styles.fadeOutModal : ''}`} 
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

        {isSubmitted ? (
          // Success State
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className={styles.title}>You&apos;re on the waitlist!</h2>
            <p className={styles.subtitle}>
              We&apos;ll notify you when it&apos;s your turn to join.
            </p>
            
            <div className={styles.demoPrompt}>
              <p className={styles.demoText}>
                Would you like to try the network beta?
              </p>
              <div className={styles.demoButtons}>
                <button
                  onClick={handleContinueToDemo}
                  className={styles.submitButton}
                  style={{
                    backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                  }}
                >
                  Yes, show me the beta
                </button>
                <button
                  onClick={handleClose}
                  className={styles.secondaryButton}
                  style={{
                    backgroundColor: 'transparent',
                    color: theme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                    border: `1px solid ${theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'}`,
                  }}
                >
                  Maybe later
                </button>
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

            <button
              onClick={handleContinueToDemo}
              className={styles.demoLink}
              style={{
                color: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Want to try the beta directly?
            </button>
          </>
        )}
      </div>
    </div>
  );
}
