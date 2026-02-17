import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

const MAX_POLL_ATTEMPTS = 16;
const POLL_INTERVAL_MS = 2500;

type ProfileRow = {
  interests?: string[] | null;
  personality_archetypes?: unknown[] | null;
  doppelgangers?: unknown[] | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

async function hasYouTubeData(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: subs }, { data: likes }] = await Promise.all([
    supabase.from('youtube_subscriptions').select('channel_id').eq('user_id', userId).limit(1),
    supabase.from('youtube_liked_videos').select('video_id').eq('user_id', userId).limit(1),
  ]);

  return (subs?.length ?? 0) > 0 || (likes?.length ?? 0) > 0;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedUserId = typeof body?.user_id === 'string' ? body.user_id : session.user.id;
    const triggerSource =
      typeof body?.trigger_source === 'string' && body.trigger_source.trim().length > 0
        ? body.trigger_source
        : 'AUTH_CALLBACK_BACKGROUND';

    // Only allow users to trigger enrichment for themselves.
    if (requestedUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('interests, personality_archetypes, doppelgangers')
      .eq('id', requestedUserId)
      .maybeSingle<ProfileRow>();

    const hasInterests = hasItems(profile?.interests);
    const hasArchetypes = hasItems(profile?.personality_archetypes);
    const hasDoppelgangers = hasItems(profile?.doppelgangers);

    // Nothing missing, skip expensive recompute.
    if (hasInterests && hasArchetypes && hasDoppelgangers) {
      return NextResponse.json({ success: true, skipped: true });
    }

    let youtubeReady = await hasYouTubeData(supabase, requestedUserId);
    let attempts = 0;

    while (!youtubeReady && attempts < MAX_POLL_ATTEMPTS) {
      attempts += 1;
      await sleep(POLL_INTERVAL_MS);
      youtubeReady = await hasYouTubeData(supabase, requestedUserId);
    }

    if (!youtubeReady) {
      return NextResponse.json({
        success: false,
        status: 'pending_youtube_data',
      }, { status: 202 });
    }

    let deriveInterestsTriggered = false;
    let computeDnaTriggered = false;
    let deriveError: string | null = null;
    let computeError: string | null = null;

    if (!hasInterests) {
      const { error } = await supabase.functions.invoke('derive_interests', {
        body: {
          user_id: requestedUserId,
          max_interests: 15,
        },
      });

      if (error) {
        deriveError = error.message;
      } else {
        deriveInterestsTriggered = true;
      }
    }

    if (!hasArchetypes || !hasDoppelgangers) {
      const { error } = await supabase.functions.invoke('compute_dna_v2', {
        body: {
          user_id: requestedUserId,
          trigger_source: triggerSource,
        },
      });

      if (error) {
        computeError = error.message;
      } else {
        computeDnaTriggered = true;
      }
    }

    return NextResponse.json({
      success: !deriveError && !computeError,
      deriveInterestsTriggered,
      computeDnaTriggered,
      deriveError,
      computeError,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Background enrichment failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
