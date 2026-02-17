'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const BG_BLACK = '#000000';
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_CYAN = '#22d3ee';

const MATCH_REVEAL_DATE = new Date('2026-02-27T12:00:00-05:00');

type RsvpAttendee = {
  id: string;
  name: string;
  avatar_url: string | null;
  source: 'network' | 'waitlist';
  rsvped_at: string | null;
};

type RsvpResponse = {
  attendees?: RsvpAttendee[];
  totalGoing?: number;
  error?: string;
};

type MatchCard = {
  matchId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  currentObsession: string | null;
  compatibilityDescription: string;
};

type MatchResponse = {
  status?: 'pending' | 'ready' | 'unavailable';
  revealAt?: string;
  match?: MatchCard;
  error?: string;
};

type MatchLoadState = 'idle' | 'loading' | 'pending' | 'ready' | 'unavailable' | 'error';

function getTimeLeft(target: Date) {
  const now = new Date().getTime();
  const diff = Math.max(0, target.getTime() - now);

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  return timeLeft;
}

function CountdownUnit({
  value,
  label,
  isSeconds,
}: {
  value: number;
  label: string;
  isSeconds?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 md:p-4 text-center min-w-[4.8rem]">
      <p
        className={`font-black tabular-nums text-2xl md:text-3xl ${isSeconds ? 'text-cyan-300' : 'text-white'}`}
      >
        {String(value).padStart(2, '0')}
      </p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 mt-1">{label}</p>
    </div>
  );
}

export default function PartyDashboard() {
  const countdown = useCountdown(MATCH_REVEAL_DATE);
  const [attendees, setAttendees] = useState<RsvpAttendee[]>([]);
  const [isRsvpLoading, setIsRsvpLoading] = useState(true);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchLoadState>('idle');
  const [matchCard, setMatchCard] = useState<MatchCard | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const isRevealLive = countdown.total <= 0;

  const loadAttendees = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsRsvpLoading(true);
    }

    const response = await fetch('/api/friend-party/rsvps', { method: 'GET' });
    const data = (await response.json()) as RsvpResponse;

    if (!response.ok) {
      setRsvpError(data.error || 'Failed to load RSVP list.');
      if (showLoading) {
        setIsRsvpLoading(false);
      }
      return;
    }

    setAttendees(data.attendees || []);
    setRsvpError(null);
    if (showLoading) {
      setIsRsvpLoading(false);
    }
  }, []);

  const loadMatch = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setMatchState('loading');
    }

    const response = await fetch('/api/friend-party/match', { method: 'GET' });
    const data = (await response.json()) as MatchResponse;

    if (!response.ok) {
      setMatchError(data.error || 'Failed to load your match card.');
      setMatchState('error');
      return;
    }

    if (data.status === 'ready' && data.match) {
      setMatchCard(data.match);
      setMatchError(null);
      setMatchState('ready');
      return;
    }

    if (data.status === 'unavailable') {
      setMatchCard(null);
      setMatchError(null);
      setMatchState('unavailable');
      return;
    }

    setMatchCard(null);
    setMatchError(null);
    setMatchState('pending');
  }, []);

  useEffect(() => {
    const kickoffId = window.setTimeout(() => {
      void loadAttendees(true);
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadAttendees(false);
    }, 30_000);

    return () => {
      window.clearTimeout(kickoffId);
      window.clearInterval(intervalId);
    };
  }, [loadAttendees]);

  useEffect(() => {
    const kickoffId = window.setTimeout(() => {
      void loadMatch(true);
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadMatch(false);
    }, 20_000);

    return () => {
      window.clearTimeout(kickoffId);
      window.clearInterval(intervalId);
    };
  }, [loadMatch]);

  useEffect(() => {
    if (isRevealLive) {
      return;
    }

    const millisUntilReveal = Math.max(0, MATCH_REVEAL_DATE.getTime() - Date.now());
    const revealFetchId = window.setTimeout(() => {
      void loadMatch(false);
    }, millisUntilReveal + 50);

    return () => {
      window.clearTimeout(revealFetchId);
    };
  }, [isRevealLive, loadMatch, matchState]);

  const formatRsvpDate = (dateValue: string | null) => {
    if (!dateValue) return '';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: BG_BLACK }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(100rem 36rem at 10% 0%, rgba(168,85,247,0.16), transparent 55%),
            radial-gradient(80rem 30rem at 90% 100%, rgba(34,211,238,0.12), transparent 60%)
          `,
        }}
      />

      <main
        className="relative z-10 max-w-2xl mx-auto px-6 py-8 md:py-12 space-y-6"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <header className="flex items-center justify-between gap-3">
          <Link href="/friend-party" className="opacity-70 hover:opacity-100 transition-opacity">
            <img
              src={THE_NETWORK_SVG}
              alt="The Network"
              className="h-6 w-auto object-contain"
              style={{ filter: 'invert(1) brightness(2)' }}
            />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/friend-party/profile"
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs md:text-sm font-medium transition-colors"
            >
              Add more details to your profile
            </Link>
            <Link
              href="/friend-party/enrich"
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs md:text-sm font-medium transition-colors"
            >
              Enrich your data
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Party Pass Active</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight">You&apos;re in. Match drops soon.</h1>
          <p className="text-sm md:text-base text-white/65 leading-relaxed">
            Your match reveal goes live on February 27 at 12:00 PM ET. Use this page to track countdown and who is in.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-4">Countdown</p>
          <div className="flex flex-wrap gap-2.5">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hours" />
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <CountdownUnit value={countdown.seconds} label="Secs" isSeconds />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">RSVP Roster</p>
              <button
                type="button"
                onClick={() => {
                  void loadAttendees(true);
                }}
                className="text-xs text-white/65 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>
            <p className="text-sm text-white/75">
              {attendees.length} {attendees.length === 1 ? 'person' : 'people'} going
            </p>

            {isRsvpLoading ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-white/55">Loading RSVP list...</p>
              </div>
            ) : rsvpError ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-4">
                <p className="text-sm text-rose-200">{rsvpError}</p>
              </div>
            ) : attendees.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-white/55">No RSVPs yet. Be the first person in.</p>
              </div>
            ) : (
              <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2">
                {attendees.map((attendee, index) => (
                  <div
                    key={`${attendee.id}-${index}`}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {attendee.avatar_url ? (
                        <img
                          src={attendee.avatar_url}
                          alt={`${attendee.name} profile`}
                          className="w-8 h-8 rounded-full border border-white/20 object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full border border-white/15 bg-white/[0.04] inline-flex items-center justify-center text-xs font-semibold text-white/75 shrink-0">
                          {attendee.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-white/88 truncate">{attendee.name}</p>
                        <p className="text-[11px] text-white/45">
                          {attendee.source === 'waitlist' ? 'Waitlist RSVP' : 'Network RSVP'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-white/45 shrink-0">{formatRsvpDate(attendee.rsvped_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Your Match</p>

            {!isRevealLive && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
                <p className="text-sm text-white/80">Match card unlocks when the countdown hits 0.</p>
                <p className="text-xs text-white/55">
                  We are already computing compatibility in the background. Add more signal anytime to improve quality.
                </p>
              </div>
            )}

            {isRevealLive && (matchState === 'idle' || matchState === 'loading') && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-white/55">Loading your match card...</p>
              </div>
            )}

            {isRevealLive && matchState === 'pending' && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-white/65">Finalizing your match right now. Refresh in a moment.</p>
              </div>
            )}

            {isRevealLive && matchState === 'unavailable' && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-white/65">No confirmed match yet. We&apos;ll update this card automatically.</p>
              </div>
            )}

            {isRevealLive && matchState === 'error' && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 space-y-3">
                <p className="text-sm text-rose-200">{matchError || 'Failed to load your match card.'}</p>
                <button
                  type="button"
                  onClick={() => {
                    void loadMatch(true);
                  }}
                  className="text-xs text-rose-100 underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}

            {isRevealLive && matchState === 'ready' && matchCard && (
              <div className="rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-4 space-y-4">
                <div className="flex items-center gap-3 min-w-0">
                  {matchCard.avatarUrl ? (
                    <img
                      src={matchCard.avatarUrl}
                      alt={`${matchCard.name} profile`}
                      className="w-12 h-12 rounded-full border border-white/20 object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 inline-flex items-center justify-center text-lg font-bold shrink-0">
                      {matchCard.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-white truncate">{matchCard.name}</p>
                    <p className="text-xs text-white/55">
                      {typeof matchCard.age === 'number' ? `${matchCard.age} years old` : 'Age not shared'}
                    </p>
                  </div>
                </div>

                {matchCard.currentObsession && (
                  <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/45 mb-1.5">Current Obsession</p>
                    <p className="text-sm text-white/82 leading-relaxed">{matchCard.currentObsession}</p>
                  </div>
                )}

                <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/45 mb-1.5">Compatibility Note</p>
                  <p className="text-sm text-white/78 leading-relaxed">{matchCard.compatibilityDescription}</p>
                </div>
              </div>
            )}

            <Link
              href="/friend-party/enrich"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 55%, ${ACCENT_CYAN} 100%)`,
              }}
            >
              Add more signal
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
