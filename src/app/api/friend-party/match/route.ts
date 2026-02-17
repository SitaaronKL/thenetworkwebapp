import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { FRIEND_PARTY_SLUG } from '@/lib/friend-party-attendance';

const FRIEND_PARTY_MATCH_REVEAL_ISO = '2026-02-27T12:00:00-05:00';

type PartyRow = {
  id: string;
};

type PartyMatchRow = {
  id: string;
  user_id: string;
  matched_user_id: string;
  score: number | null;
  status: string;
  verification_code: string | null;
  match_reason: unknown;
  created_at: string;
};

type PartyRsvpRow = {
  user_id: string | null;
};

type UserMatchRow = {
  match_user_id: string;
  similarity_score: number | null;
  shared_interests: unknown;
};

type ReverseUserMatchRow = {
  user_id: string;
  similarity_score: number | null;
  shared_interests: unknown;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type ExtrasRow = {
  age: number | null;
  working_on: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getReasonText(matchReason: unknown): string {
  const reasonObject = asObject(matchReason);

  const explanation = reasonObject.explanation;
  if (typeof explanation === 'string' && explanation.trim().length > 0) {
    return explanation.trim();
  }

  return '';
}

function getSharedInterests(matchReason: unknown): string[] {
  const reasonObject = asObject(matchReason);
  const rawInterests = reasonObject.interests;

  if (!Array.isArray(rawInterests)) return [];

  return rawInterests
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)
    .slice(0, 4);
}

function resolveAvatarUrl(rawPath: string | null, supabaseUrl: string) {
  if (!rawPath) return null;
  if (rawPath.startsWith('http')) return rawPath;
  return `${supabaseUrl}/storage/v1/object/public/profile-images/${rawPath}`;
}

function buildReasonFromSignals(sharedInterests: string[], obsession: string | null): string {
  if (sharedInterests.length >= 2) {
    return `You both overlap heavily on ${sharedInterests.slice(0, 2).join(' and ')}. That usually means stronger first conversations and faster chemistry in person.`;
  }

  if (sharedInterests.length === 1) {
    return `You both show clear overlap in ${sharedInterests[0]}. This tends to produce easy conversation flow and meaningful connection at events.`;
  }

  if (obsession && obsession.trim().length > 0) {
    return 'You both have active, evolving interests right now. This match is based on high behavioral overlap and current momentum in what you care about.';
  }

  return 'You have high behavioral overlap across your digital signals, which is a strong predictor of in-person compatibility.';
}

function parseSharedInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'name' in entry) {
        const candidate = (entry as { name?: unknown }).name;
        return typeof candidate === 'string' ? candidate.trim() : '';
      }
      return '';
    })
    .filter((entry) => entry.length > 0)
    .slice(0, 6);
}

function isRevealTimeReached() {
  const revealAt = new Date(FRIEND_PARTY_MATCH_REVEAL_ISO);
  const now = new Date();
  return now.getTime() >= revealAt.getTime();
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const revealAtIso = new Date(FRIEND_PARTY_MATCH_REVEAL_ISO).toISOString();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 });
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: party, error: partyError } = await admin
      .from('parties')
      .select('id')
      .eq('slug', FRIEND_PARTY_SLUG)
      .limit(1)
      .maybeSingle<PartyRow>();

    if (partyError || !party?.id) {
      return NextResponse.json({ status: 'unavailable', revealAt: revealAtIso });
    }

    if (!isRevealTimeReached()) {
      return NextResponse.json({ status: 'pending', revealAt: revealAtIso });
    }

    const { data: existingMatches, error: existingMatchError } = await admin
      .from('party_matches')
      .select('id, user_id, matched_user_id, score, status, verification_code, match_reason, created_at')
      .eq('party_id', party.id)
      .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
      .in('status', ['pending', 'found', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingMatchError) {
      return NextResponse.json({ error: 'Failed to load match' }, { status: 500 });
    }

    let activeMatch = ((existingMatches ?? [])[0] ?? null) as PartyMatchRow | null;

    if (!activeMatch) {
      const { data: partyRsvps, error: partyRsvpError } = await admin
        .from('party_rsvps')
        .select('user_id')
        .eq('party_id', party.id)
        .eq('status', 'going');

      if (partyRsvpError) {
        return NextResponse.json({ error: 'Failed to load attendees for matching' }, { status: 500 });
      }

      const candidateIds = [...new Set(((partyRsvps ?? []) as PartyRsvpRow[])
        .map((entry) => entry.user_id)
        .filter((entry): entry is string => typeof entry === 'string' && entry !== userId))];

      if (candidateIds.length === 0) {
        return NextResponse.json({ status: 'unavailable', revealAt: revealAtIso });
      }

      let matchedUserId: string | null = null;
      let matchScore: number | null = null;
      let sharedInterests: string[] = [];

      const { data: forwardMatch } = await admin
        .from('user_matches')
        .select('match_user_id, similarity_score, shared_interests')
        .eq('user_id', userId)
        .in('match_user_id', candidateIds)
        .order('similarity_score', { ascending: false })
        .limit(1)
        .maybeSingle<UserMatchRow>();

      if (forwardMatch?.match_user_id) {
        matchedUserId = forwardMatch.match_user_id;
        matchScore = forwardMatch.similarity_score;
        sharedInterests = parseSharedInterests(forwardMatch.shared_interests);
      } else {
        const { data: reverseMatch } = await admin
          .from('user_matches')
          .select('user_id, similarity_score, shared_interests')
          .in('user_id', candidateIds)
          .eq('match_user_id', userId)
          .order('similarity_score', { ascending: false })
          .limit(1)
          .maybeSingle<ReverseUserMatchRow>();

        if (reverseMatch?.user_id) {
          matchedUserId = reverseMatch.user_id;
          matchScore = reverseMatch.similarity_score;
          sharedInterests = parseSharedInterests(reverseMatch.shared_interests);
        }
      }

      if (!matchedUserId) {
        matchedUserId = candidateIds[0];
      }

      const { data: matchedExtras } = await admin
        .from('user_profile_extras')
        .select('working_on')
        .eq('user_id', matchedUserId)
        .maybeSingle<{ working_on?: string | null }>();

      const fallbackReason = buildReasonFromSignals(sharedInterests, matchedExtras?.working_on ?? null);

      const { data: insertedMatch, error: insertMatchError } = await admin
        .from('party_matches')
        .insert({
          party_id: party.id,
          user_id: userId,
          matched_user_id: matchedUserId,
          score: matchScore,
          status: 'pending',
          match_reason: {
            explanation: fallbackReason,
            interests: sharedInterests,
          },
        })
        .select('id, user_id, matched_user_id, score, status, verification_code, match_reason, created_at')
        .single<PartyMatchRow>();

      if (insertMatchError) {
        const { data: retryMatches } = await admin
          .from('party_matches')
          .select('id, user_id, matched_user_id, score, status, verification_code, match_reason, created_at')
          .eq('party_id', party.id)
          .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
          .in('status', ['pending', 'found', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1);

        activeMatch = ((retryMatches ?? [])[0] ?? null) as PartyMatchRow | null;
      } else {
        activeMatch = insertedMatch as PartyMatchRow;
      }
    }

    if (!activeMatch) {
      return NextResponse.json({ status: 'unavailable', revealAt: revealAtIso });
    }

    const otherUserId = activeMatch.user_id === userId ? activeMatch.matched_user_id : activeMatch.user_id;

    const [{ data: profile }, { data: extras }] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .maybeSingle<ProfileRow>(),
      admin
        .from('user_profile_extras')
        .select('age, working_on')
        .eq('user_id', otherUserId)
        .maybeSingle<ExtrasRow>(),
    ]);

    if (!profile?.id) {
      return NextResponse.json({ status: 'unavailable', revealAt: revealAtIso });
    }

    const reasonFromMatch = getReasonText(activeMatch.match_reason);
    const interestsFromMatch = getSharedInterests(activeMatch.match_reason);
    const compatibilityDescription =
      reasonFromMatch || buildReasonFromSignals(interestsFromMatch, extras?.working_on ?? null);

    return NextResponse.json({
      status: 'ready',
      revealAt: revealAtIso,
      match: {
        matchId: activeMatch.id,
        userId: profile.id,
        name: profile.full_name || 'Matched User',
        avatarUrl: resolveAvatarUrl(profile.avatar_url, supabaseUrl),
        age: typeof extras?.age === 'number' ? extras.age : null,
        currentObsession: extras?.working_on || null,
        compatibilityDescription,
        score: typeof activeMatch.score === 'number' ? Math.round(activeMatch.score * 100) : null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load friend-party match' }, { status: 500 });
  }
}
