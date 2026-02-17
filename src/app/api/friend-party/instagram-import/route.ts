import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const MAX_PAYLOAD_CHARS = 2_000_000;
const MAX_TEXT_SAMPLES = 5000;

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'your', 'you', 'are',
  'was', 'were', 'been', 'will', 'would', 'should', 'could', 'about', 'into', 'when',
  'where', 'while', 'what', 'which', 'there', 'their', 'them', 'they', 'then', 'than',
  'just', 'like', 'really', 'very', 'more', 'some', 'such', 'only', 'also', 'over',
  'under', 'after', 'before', 'again', 'each', 'both', 'through', 'because', 'being',
  'make', 'made', 'does', 'did', 'has', 'had', 'our', 'out', 'not', 'but', 'its',
  'it', 'is', 'to', 'of', 'in', 'on', 'at', 'as', 'an', 'a', 'or', 'be', 'by'
]);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

type LatestImport = {
  id: string;
  source: 'instagram_json';
  status: 'processed';
  payload_meta: {
    file_name: string | null;
    payload_chars: number;
    imported_at: string;
  };
  extracted_signals: ReturnType<typeof extractSignals>;
  created_at: string;
  processed_at: string;
  error_text: null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getLatestImportFromMetadata(metadata: unknown): LatestImport | null {
  const metadataObj = asObject(metadata);
  const enrichmentObj = asObject(metadataObj.enrichment);
  const instagramObj = asObject(enrichmentObj.instagram);
  const latestImportRaw = instagramObj.latest_import;

  if (!latestImportRaw || typeof latestImportRaw !== 'object' || Array.isArray(latestImportRaw)) {
    return null;
  }

  const latestImport = asObject(latestImportRaw);
  const payloadMeta = asObject(latestImport.payload_meta);
  const id = typeof latestImport.id === 'string' ? latestImport.id : '';
  if (!id) return null;

  return {
    id,
    source: 'instagram_json',
    status: 'processed',
    payload_meta: {
      file_name: typeof payloadMeta.file_name === 'string' ? payloadMeta.file_name : null,
      payload_chars: typeof payloadMeta.payload_chars === 'number' ? payloadMeta.payload_chars : 0,
      imported_at: typeof payloadMeta.imported_at === 'string' ? payloadMeta.imported_at : '',
    },
    extracted_signals: asObject(latestImport.extracted_signals) as ReturnType<typeof extractSignals>,
    created_at: typeof latestImport.created_at === 'string' ? latestImport.created_at : '',
    processed_at: typeof latestImport.processed_at === 'string' ? latestImport.processed_at : '',
    error_text: null,
  };
}

function collectStrings(value: unknown, output: string[]) {
  if (output.length >= MAX_TEXT_SAMPLES) return;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) output.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (output.length >= MAX_TEXT_SAMPLES) break;
      collectStrings(item, output);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (output.length >= MAX_TEXT_SAMPLES) break;
      collectStrings(nested, output);
    }
  }
}

function estimateRecordCount(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== 'object') return 0;

  const candidates = ['items', 'posts', 'media', 'data'];
  for (const key of candidates) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value.length;
  }

  return Object.keys(payload as Record<string, unknown>).length;
}

function takeTopEntries(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function extractSignals(payload: JsonValue) {
  const textSamples: string[] = [];
  collectStrings(payload, textSamples);

  const hashtagCounts = new Map<string, number>();
  const mentionCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();

  const hashtagRegex = /#([a-zA-Z0-9_]{2,40})/g;
  const mentionRegex = /@([a-zA-Z0-9._]{2,40})/g;
  const tokenRegex = /[a-zA-Z][a-zA-Z0-9_]{2,40}/g;

  for (const sample of textSamples) {
    const lower = sample.toLowerCase();

    const hashtags = lower.matchAll(hashtagRegex);
    for (const match of hashtags) {
      const tag = match[1];
      hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
    }

    const mentions = lower.matchAll(mentionRegex);
    for (const match of mentions) {
      const handle = match[1];
      mentionCounts.set(handle, (mentionCounts.get(handle) || 0) + 1);
    }

    const tokens = lower.matchAll(tokenRegex);
    for (const match of tokens) {
      const token = match[0];
      if (STOP_WORDS.has(token)) continue;
      keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1);
    }
  }

  return {
    estimated_records: estimateRecordCount(payload),
    sample_count: textSamples.length,
    top_hashtags: takeTopEntries(hashtagCounts, 25),
    top_mentions: takeTopEntries(mentionCounts, 25),
    top_keywords: takeTopEntries(keywordCounts, 40),
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [{ data: profile }, { data: subs }, { data: likes }] = await Promise.all([
      supabase
        .from('profiles')
        .select('metadata')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('youtube_subscriptions')
        .select('channel_id')
        .eq('user_id', session.user.id)
        .limit(1),
      supabase
        .from('youtube_liked_videos')
        .select('video_id')
        .eq('user_id', session.user.id)
        .limit(1),
    ]);

    const hasYouTubeData = (subs?.length ?? 0) > 0 || (likes?.length ?? 0) > 0;
    const latestImport = getLatestImportFromMetadata(profile?.metadata);

    return NextResponse.json({
      hasYouTubeData,
      latestImport,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load Instagram import status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const fileName = typeof body.file_name === 'string' ? body.file_name.trim() : null;
    const rawPayload = body.payload_json;

    if (rawPayload === undefined) {
      return NextResponse.json({ error: 'payload_json is required' }, { status: 400 });
    }

    let parsedPayload: JsonValue;
    if (typeof rawPayload === 'string') {
      try {
        parsedPayload = JSON.parse(rawPayload) as JsonValue;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    } else {
      parsedPayload = rawPayload as JsonValue;
    }

    const serializedPayload = JSON.stringify(parsedPayload);
    if (!serializedPayload || serializedPayload.length === 0) {
      return NextResponse.json({ error: 'Empty JSON payload' }, { status: 400 });
    }

    if (serializedPayload.length > MAX_PAYLOAD_CHARS) {
      return NextResponse.json(
        { error: 'Payload is too large. Please upload a smaller JSON export.' },
        { status: 413 }
      );
    }

    const extractedSignals = extractSignals(parsedPayload);
    const nowIso = new Date().toISOString();
    const importRow: LatestImport = {
      id: crypto.randomUUID(),
      source: 'instagram_json',
      status: 'processed',
      payload_meta: {
        file_name: fileName,
        payload_chars: serializedPayload.length,
        imported_at: nowIso,
      },
      extracted_signals: extractedSignals,
      created_at: nowIso,
      processed_at: nowIso,
      error_text: null,
    };

    const { data: profileRow, error: profileSelectError } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileSelectError) {
      return NextResponse.json(
        { error: profileSelectError.message || 'Failed to load profile metadata' },
        { status: 500 }
      );
    }

    const existingMetadata = asObject(profileRow?.metadata);
    const existingEnrichment = asObject(existingMetadata.enrichment);
    const existingInstagram = asObject(existingEnrichment.instagram);

    const updatedMetadata: JsonObject = {
      ...(existingMetadata as JsonObject),
      enrichment: {
        ...(existingEnrichment as JsonObject),
        instagram: {
          ...(existingInstagram as JsonObject),
          latest_import: {
            ...importRow,
            payload_json: parsedPayload,
          } as JsonObject,
          last_imported_at: nowIso,
        } as JsonObject,
      } as JsonObject,
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ metadata: updatedMetadata })
      .eq('id', session.user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to save Instagram import to profile metadata' },
        { status: 500 }
      );
    }

    supabase.functions.invoke('compute_dna_v2', {
      body: {
        user_id: session.user.id,
        trigger_source: 'FRIEND_PARTY_INSTAGRAM_IMPORT',
      },
    }).catch(() => {
      // Non-blocking. Import success should not depend on DNA recompute.
    });

    return NextResponse.json({
      success: true,
      latestImport: importRow,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import Instagram JSON';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
