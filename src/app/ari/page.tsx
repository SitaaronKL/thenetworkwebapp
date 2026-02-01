'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

const STORAGE_KEY = 'ari_flow';

type Hearing = {
  social_reality: string;
  what_you_dont_want: string;
  not_yet_clear: string;
};

type StoredState = {
  step: number;
  currentReality: string;
  futureGoal: string;
  hearing?: Hearing;
};

const defaultState: StoredState = {
  step: 1,
  currentReality: '',
  futureGoal: '',
};

function loadState(): StoredState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as StoredState;
    return {
      step: parsed.step ?? 1,
      currentReality: parsed.currentReality ?? '',
      futureGoal: parsed.futureGoal ?? '',
      hearing: parsed.hearing,
    };
  } catch {
    return defaultState;
  }
}

function saveState(s: StoredState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// Placeholder strings for "Okay, out of these" (chat will replace later)
const PLACEHOLDER_STRINGS = [
  'More real-life hangouts with people who get me',
  'A smaller circle I actually talk to regularly',
  'Trying new things with people who share my interests',
];

export default function AriPage() {
  const [state, setState] = useState<StoredState>(defaultState);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  const persist = useCallback((next: Partial<StoredState>) => {
    setState((prev) => {
      const merged = { ...prev, ...next };
      saveState(merged);
      return merged;
    });
  }, []);

  // Voice: Web Speech API
  const supportsVoice = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!supportsVoice) return;
    const Recognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!Recognition) return;

    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let full = '';
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    setError('');
  }, [supportsVoice]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    if (transcript.trim()) setCurrentText(transcript.trim());
  }, [transcript]);

  const currentText = state.step === 1 ? state.currentReality : state.futureGoal;
  const setCurrentText = (text: string) => {
    if (state.step === 1) persist({ currentReality: text });
    else persist({ futureGoal: text });
  };

  const handleDoneQuestion1 = useCallback(() => {
    const value = (transcript || currentText).trim();
    if (!value) {
      setError('Say or type something before continuing.');
      return;
    }
    persist({ currentReality: value, step: 2 });
    setTranscript('');
    setError('');
  }, [transcript, currentText, persist]);

  const handleDoneQuestion2 = useCallback(async () => {
    const value = (transcript || currentText).trim();
    if (!value) {
      setError('Say or type something before continuing.');
      return;
    }
    persist({ futureGoal: value });
    setTranscript('');
    setError('');
    setIsSubmitting(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: fnError } = await supabase.functions.invoke('ari-social-reality', {
        body: {
          current_reality: state.currentReality,
          future_goal: value,
        },
      });

      if (fnError) {
        setError('Something went wrong. Try again.');
        setIsSubmitting(false);
        return;
      }
      const hearing: Hearing = {
        social_reality: data?.social_reality ?? 'Your current social reality.',
        what_you_dont_want: data?.what_you_dont_want ?? 'What you don\'t want to be.',
        not_yet_clear: data?.not_yet_clear ?? 'What\'s not yet clear.',
      };
      persist({ step: 3, hearing });
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [transcript, currentText, state.currentReality, persist]);

  const handleContinueAfterHearing = useCallback(() => {
    persist({ step: 4 });
  }, [persist]);

  const handleReset = useCallback(() => {
    const fresh = defaultState;
    saveState(fresh);
    setState(fresh);
    setTranscript('');
    setError('');
  }, []);

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.backLink}>
          ← Back
        </Link>
        {(state.step > 1 || state.currentReality || state.futureGoal) && (
          <button type="button" onClick={handleReset} className={styles.resetLink}>
            Start over
          </button>
        )}
      </nav>

      <main className={styles.main}>
        {/* Step 1: Current social reality */}
        {state.step === 1 && (
          <div className={styles.card}>
            <p className={styles.greeting}>Hey I am Ari.</p>
            <p className={styles.question}>What&apos;s your current social reality?</p>
            <div className={styles.inputBlock}>
              {supportsVoice && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={styles.micButton}
                  aria-label={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? (
                    <span className={styles.micPulse}>●</span>
                  ) : (
                    <MicIcon />
                  )}
                </button>
              )}
              <textarea
                className={styles.textarea}
                placeholder={supportsVoice ? 'Or type here…' : 'Type your answer…'}
                value={transcript || currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                rows={4}
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="button" onClick={handleDoneQuestion1} className={styles.primaryButton}>
              Done
            </button>
          </div>
        )}

        {/* Step 2: Where you want to be in 3–6 months */}
        {state.step === 2 && (
          <div className={styles.card}>
            <p className={styles.greeting}>Got it.</p>
            <p className={styles.question}>
              In the next 3–6 months, where do you want to be in your social life?
            </p>
            <div className={styles.inputBlock}>
              {supportsVoice && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={styles.micButton}
                  aria-label={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? (
                    <span className={styles.micPulse}>●</span>
                  ) : (
                    <MicIcon />
                  )}
                </button>
              )}
              <textarea
                className={styles.textarea}
                placeholder={supportsVoice ? 'Or type here…' : 'Type your answer…'}
                value={transcript || currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                rows={4}
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button
              type="button"
              onClick={handleDoneQuestion2}
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Thinking…' : 'Done'}
            </button>
          </div>
        )}

        {/* Step 3: Here's what I'm hearing */}
        {state.step === 3 && state.hearing && (
          <div className={styles.card}>
            <h2 className={styles.hearingTitle}>Here&apos;s what I&apos;m hearing</h2>
            <section className={styles.section}>
              <h3 className={styles.sectionLabel}>This is your social reality</h3>
              <p className={styles.sectionBody}>{state.hearing.social_reality}</p>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionLabel}>This is what you don&apos;t want to be</h3>
              <p className={styles.sectionBody}>{state.hearing.what_you_dont_want}</p>
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionLabel}>Not yet clear</h3>
              <p className={styles.sectionBody}>{state.hearing.not_yet_clear}</p>
            </section>
            <button type="button" onClick={handleContinueAfterHearing} className={styles.primaryButton}>
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Okay, out of these (placeholders for chat) */}
        {state.step === 4 && (
          <div className={styles.card}>
            <p className={styles.greeting}>Okay, out of these</p>
            <ul className={styles.placeholderList}>
              {PLACEHOLDER_STRINGS.map((s, i) => (
                <li key={i} className={styles.placeholderItem}>
                  {s}
                </li>
              ))}
            </ul>
            <p className={styles.placeholderNote}>(Chat interface will go here)</p>
          </div>
        )}
      </main>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
