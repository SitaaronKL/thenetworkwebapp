import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { FRIEND_PARTY_SLUG } from '@/lib/friend-party-attendance';

type PartyRow = {
  id: string;
};

type PartyRsvpRow = {
  user_id: string | null;
  rsvped_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type WaitlistRow = {
  id: string;
  name: string | null;
  created_at: string | null;
};

type Attendee = {
  id: string;
  name: string;
  avatar_url: string | null;
  source: 'network' | 'waitlist';
  rsvped_at: string | null;
};

function nameOrFallback(value: string | null | undefined, fallback: string) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : fallback;
}

function timestamp(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function resolveAvatarUrl(rawPath: string | null, supabaseUrl: string) {
  if (!rawPath) return null;
  if (rawPath.startsWith('http')) return rawPath;
  return `${supabaseUrl}/storage/v1/object/public/profile-images/${rawPath}`;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ attendees: [], totalGoing: 0 });
    }

    const [partyRsvpResult, waitlistResult] = await Promise.all([
      admin
        .from('party_rsvps')
        .select('user_id, rsvped_at')
        .eq('party_id', party.id)
        .eq('status', 'going')
        .order('rsvped_at', { ascending: false }),
      admin
        .from('waitlist')
        .select('id, name, created_at')
        .or(`party_id.eq.${party.id},campaign_code.eq.${FRIEND_PARTY_SLUG}`)
        .order('created_at', { ascending: false }),
    ]);

    if (partyRsvpResult.error || waitlistResult.error) {
      return NextResponse.json({ error: 'Failed to load RSVPs' }, { status: 500 });
    }

    const partyRsvps = (partyRsvpResult.data ?? []) as PartyRsvpRow[];
    const waitlistRsvps = (waitlistResult.data ?? []) as WaitlistRow[];

    const uniqueUserIds = [...new Set(partyRsvps.map((row) => row.user_id).filter(Boolean))] as string[];

    const profilesById = new Map<string, ProfileRow>();
    if (uniqueUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', uniqueUserIds);

      if (profilesError) {
        return NextResponse.json({ error: 'Failed to load attendee profiles' }, { status: 500 });
      }

      (profiles ?? []).forEach((profile) => {
        profilesById.set(profile.id, profile as ProfileRow);
      });
    }

    const networkAttendees: Attendee[] = partyRsvps.map((row, index) => {
      const fallbackName = `Network Member ${index + 1}`;
      const profile = row.user_id ? profilesById.get(row.user_id) : null;

      return {
        id: `network-${row.user_id || index}`,
        name: nameOrFallback(profile?.full_name, fallbackName),
        avatar_url: resolveAvatarUrl(profile?.avatar_url ?? null, supabaseUrl),
        source: 'network',
        rsvped_at: row.rsvped_at,
      };
    });

    const waitlistAttendees: Attendee[] = waitlistRsvps.map((row, index) => ({
      id: `waitlist-${row.id}`,
      name: nameOrFallback(row.name, `Guest ${index + 1}`),
      avatar_url: null,
      source: 'waitlist',
      rsvped_at: row.created_at,
    }));

    const attendees = [...networkAttendees, ...waitlistAttendees]
      .sort((a, b) => timestamp(b.rsvped_at) - timestamp(a.rsvped_at));

    return NextResponse.json({
      attendees,
      totalGoing: attendees.length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load RSVP roster' }, { status: 500 });
  }
}
