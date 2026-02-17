'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ensureFriendPartyAttendance } from '@/lib/friend-party-attendance';

const BG_BLACK = '#000000';
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_CYAN = '#22d3ee';
const MCMASTER_SCHOOL = 'McMaster University';

type ValueCount = {
  value: string;
  count: number;
};

type ImportSignals = {
  estimated_records?: number;
  sample_count?: number;
  top_hashtags?: ValueCount[];
  top_mentions?: ValueCount[];
  top_keywords?: ValueCount[];
};

type LatestImport = {
  id: string;
  source: string;
  status: string;
  payload_meta?: {
    file_name?: string | null;
    payload_chars?: number;
    imported_at?: string;
  } | null;
  extracted_signals?: ImportSignals | null;
  created_at: string;
  processed_at?: string | null;
  error_text?: string | null;
};

type StatusResponse = {
  hasYouTubeData?: boolean;
  latestImport?: LatestImport | null;
  error?: string;
};

type ImportResponse = {
  success?: boolean;
  latestImport?: LatestImport;
  error?: string;
};

function normalizeNetworksWithMcMaster(networks: unknown): string[] {
  const existing = Array.isArray(networks)
    ? networks
        .map((network) => String(network || '').trim())
        .filter((network) => network.length > 0)
    : [];

  const withoutMcMaster = existing.filter(
    (network) => network.toLowerCase() !== MCMASTER_SCHOOL.toLowerCase()
  );

  return [MCMASTER_SCHOOL, ...withoutMcMaster];
}

function isFriendPartyProfileComplete(extras: {
  age?: number | null;
  working_on?: string | null;
} | null) {
  const hasValidAge = typeof extras?.age === 'number' && extras.age >= 13 && extras.age <= 120;
  const hasWorkingOn = typeof extras?.working_on === 'string' && extras.working_on.trim().length > 0;
  return hasValidAge && hasWorkingOn;
}

export default function FriendPartyEnrichPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [hasYouTubeData, setHasYouTubeData] = useState(false);
  const [latestImport, setLatestImport] = useState<LatestImport | null>(null);

  const [jsonInput, setJsonInput] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const parsedPayload = useMemo(() => {
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      return {
        valid: false,
        empty: true,
        error: null as string | null,
        payload: null as unknown,
      };
    }

    try {
      const payload = JSON.parse(trimmed);
      return {
        valid: true,
        empty: false,
        error: null as string | null,
        payload,
      };
    } catch {
      return {
        valid: false,
        empty: false,
        error: 'Invalid JSON format. Please paste a valid JSON export.',
        payload: null as unknown,
      };
    }
  }, [jsonInput]);

  const preview = useMemo(() => {
    if (!parsedPayload.valid || !parsedPayload.payload) return null;

    const payload = parsedPayload.payload;
    const topLevelType = Array.isArray(payload) ? 'array' : typeof payload;

    let estimatedRecords = 0;
    if (Array.isArray(payload)) {
      estimatedRecords = payload.length;
    } else if (payload && typeof payload === 'object') {
      const objectPayload = payload as Record<string, unknown>;
      const firstArray = ['items', 'posts', 'media', 'data']
        .map((key) => objectPayload[key])
        .find((value) => Array.isArray(value));

      if (Array.isArray(firstArray)) {
        estimatedRecords = firstArray.length;
      } else {
        estimatedRecords = Object.keys(objectPayload).length;
      }
    }

    return {
      topLevelType,
      estimatedRecords,
      payloadChars: JSON.stringify(payload).length,
    };
  }, [parsedPayload]);

  const loadStatus = async () => {
    setLoadingStatus(true);
    const response = await fetch('/api/friend-party/instagram-import', { method: 'GET' });
    const data = (await response.json()) as StatusResponse;

    if (!response.ok) {
      setLoadingStatus(false);
      return;
    }

    setHasYouTubeData(Boolean(data.hasYouTubeData));
    setLatestImport(data.latestImport || null);
    setLoadingStatus(false);
  };

  useEffect(() => {
    const checkAuthAndEligibility = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/friend-party');
        return;
      }

      const { data: extras } = await supabase
        .from('user_profile_extras')
        .select('age, working_on, networks')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isFriendPartyProfileComplete(extras)) {
        router.replace('/friend-party/setup');
        return;
      }

      const normalizedNetworks = normalizeNetworksWithMcMaster(extras?.networks);
      await supabase
        .from('user_profile_extras')
        .upsert({
          user_id: user.id,
          networks: normalizedNetworks,
          college: MCMASTER_SCHOOL,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      await supabase
        .from('profiles')
        .update({ school: MCMASTER_SCHOOL })
        .eq('id', user.id);

      await ensureFriendPartyAttendance('link');

      setIsCheckingAuth(false);
      await loadStatus();
    };

    checkAuthAndEligibility();
  }, [router]);

  const handleFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setSubmitError(null);
    setSubmitSuccess(null);

    const content = await file.text();
    setJsonInput(content);
  };

  const handleImport = async () => {
    if (!parsedPayload.valid || parsedPayload.empty || !parsedPayload.payload) {
      setSubmitError(parsedPayload.error || 'Please provide a valid Instagram JSON payload.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const response = await fetch('/api/friend-party/instagram-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload_json: parsedPayload.payload,
        file_name: selectedFileName,
      }),
    });

    const data = (await response.json()) as ImportResponse;

    if (!response.ok || !data.success) {
      setSubmitError(data.error || 'Failed to import Instagram JSON.');
      setSubmitting(false);
      return;
    }

    setLatestImport(data.latestImport || null);
    setSubmitSuccess('Instagram data imported. We are now using it to enrich your match graph.');
    setSubmitting(false);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG_BLACK }}>
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white px-6 py-8" style={{ backgroundColor: BG_BLACK }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />

      <main className="max-w-3xl mx-auto space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="flex items-center justify-between">
          <Link href="/friend-party" className="text-white/50 hover:text-white/90 text-sm transition-colors">
            ← Back to Invite
          </Link>
          <span className="text-xs px-3 py-1 rounded-full border border-white/15 bg-white/[0.03]">
            {MCMASTER_SCHOOL}
          </span>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-4">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 45%, ${ACCENT_CYAN} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Enrich Your Data
            </span>
          </h1>
          <p className="text-white/75 text-sm leading-relaxed">
            Most parties are noise. This one is designed for signal. The goal is simple: help you meet people who can unlock real
            opportunities, collaborations, and meaningful conversations.
          </p>
          <p className="text-white/55 text-sm leading-relaxed">
            We already use your YouTube signal. Add your Instagram JSON export to sharpen your party graph even more.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-white/40 text-[11px] uppercase tracking-wider mb-2">YouTube Signal</p>
            <p className={`font-semibold ${hasYouTubeData ? 'text-emerald-300' : 'text-amber-300'}`}>
              {loadingStatus ? 'Checking...' : hasYouTubeData ? 'Connected and usable' : 'No YouTube data found yet'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-white/40 text-[11px] uppercase tracking-wider mb-2">Party School Context</p>
            <p className="font-semibold text-cyan-300">Primary network locked to {MCMASTER_SCHOOL}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-sm transition-colors"
            >
              Upload Instagram JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFilePick}
            />
            {selectedFileName && (
              <span className="text-white/50 text-xs">Selected: {selectedFileName}</span>
            )}
          </div>

          <textarea
            value={jsonInput}
            onChange={(event) => {
              setJsonInput(event.target.value);
              setSubmitError(null);
              setSubmitSuccess(null);
            }}
            placeholder="Paste your Instagram export JSON here..."
            className="w-full min-h-[220px] rounded-xl bg-black/40 border border-white/10 p-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400/60"
          />

          {!parsedPayload.empty && parsedPayload.error && (
            <p className="text-red-400 text-sm">{parsedPayload.error}</p>
          )}

          {preview && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider">Top-level type</p>
                <p className="font-semibold">{preview.topLevelType}</p>
              </div>
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider">Estimated records</p>
                <p className="font-semibold">{preview.estimatedRecords}</p>
              </div>
              <div>
                <p className="text-white/40 text-[11px] uppercase tracking-wider">Payload size</p>
                <p className="font-semibold">{preview.payloadChars.toLocaleString()} chars</p>
              </div>
            </div>
          )}

          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
          {submitSuccess && <p className="text-emerald-300 text-sm">{submitSuccess}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleImport}
              className="px-5 py-3 rounded-lg font-bold text-sm uppercase tracking-[0.12em] disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE})`,
              }}
            >
              {submitting ? 'Importing...' : 'Import Instagram Data'}
            </button>
            <Link
              href="/friend-party/dashboard"
              className="px-5 py-3 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-sm font-semibold transition-colors"
            >
              Continue to Party Pass →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
          <h2 className="text-lg font-bold">Latest Import Status</h2>
          {loadingStatus ? (
            <p className="text-white/50 text-sm">Loading status...</p>
          ) : latestImport ? (
            <>
              <p className="text-white/70 text-sm">
                Status: <span className="font-semibold capitalize">{latestImport.status}</span> · Imported on{' '}
                {new Date(latestImport.created_at).toLocaleString()}
              </p>
              {latestImport.payload_meta?.file_name && (
                <p className="text-white/50 text-xs">File: {latestImport.payload_meta.file_name}</p>
              )}
              {latestImport.extracted_signals && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-white/40 text-[11px] uppercase tracking-wider">Records</p>
                    <p className="font-semibold">{latestImport.extracted_signals.estimated_records ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-white/40 text-[11px] uppercase tracking-wider">Top hashtag</p>
                    <p className="font-semibold">
                      {latestImport.extracted_signals.top_hashtags?.[0]?.value
                        ? `#${latestImport.extracted_signals.top_hashtags[0].value}`
                        : 'None'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-white/40 text-[11px] uppercase tracking-wider">Top keyword</p>
                    <p className="font-semibold">
                      {latestImport.extracted_signals.top_keywords?.[0]?.value || 'None'}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-white/50 text-sm">No Instagram import yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
