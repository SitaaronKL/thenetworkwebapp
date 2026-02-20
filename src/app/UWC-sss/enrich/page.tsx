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
const MCMASTER_STATEMENT_URL = '/mcmaster';
const INSTAGRAM_EXPORT_HELP_URL = 'https://help.instagram.com/181231772500920';
const INSTAGRAM_EXPORT_VIDEO_URL = 'https://www.youtube.com/watch?v=Ys2_HeT5Pqs';

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

function formatImportStatus(status: string) {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
      await supabase.from('user_profile_extras').upsert(
        {
          user_id: user.id,
          networks: normalizedNetworks,
          college: MCMASTER_SCHOOL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      await supabase.from('profiles').update({ school: MCMASTER_SCHOOL }).eq('id', user.id);

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
    <div className="min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: BG_BLACK }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(90rem 32rem at 10% 0%, rgba(255,45,117,0.15), transparent 50%),
            radial-gradient(80rem 32rem at 90% 100%, rgba(34,211,238,0.12), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
        }}
      />

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 md:py-12 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/friend-party" className="text-sm text-white/55 hover:text-white/90 transition-colors">
            ← Back to invite
          </Link>
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.03] text-white/70">
            {MCMASTER_SCHOOL}
          </span>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-5">
          <p className="text-white/50 text-xs uppercase tracking-[0.18em]">Step 2 of 2</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight max-w-3xl">
            Why The Network exists
          </h1>
          <p className="text-white/75 text-sm md:text-base leading-relaxed max-w-3xl">
            Big social platforms already know a lot about you, but they are incentivized to maximize attention, not
            meaningful connection. The Network exists to use that signal differently.
          </p>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            For McMaster students, that means introducing you to people on campus you&apos;d actually want to meet:
            people who can unlock opportunities, friendships, collaborations, and new relationships in your life.
          </p>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-3xl">
            We already use your YouTube signal. If you add Instagram export data, we get better context and can make
            intros with higher signal and less randomness.
          </p>
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] p-5 md:p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <p className="text-base md:text-[1.22rem] font-semibold text-white/90 leading-relaxed max-w-3xl">
                Built for you.
              </p>
              <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-3xl">
                Curious how The Network began? Read our origin story below.
              </p>
              <Link
                href={MCMASTER_STATEMENT_URL}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/85 hover:text-white hover:border-white/30 transition-colors"
              >
                Open
                <span className="transition-transform hover:translate-x-0.5">↗</span>
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/friend-party/dashboard"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 55%, ${ACCENT_CYAN} 100%)`,
              }}
            >
              Continue to party pass
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-2">Why This Helps</p>
            <p className="text-sm text-white/75 leading-relaxed">
              Better signal on music, style, creators, and communities gives better in-person introductions.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-2">How We Use It</p>
            <p className="text-sm text-white/75 leading-relaxed">
              Data is transformed into matching features only. We do not post to your account or change your feed.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-2">What You Get</p>
            <p className="text-sm text-white/75 leading-relaxed">
              Fewer random matches and more intros that can lead to real friendships, opportunities, and relationships.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-white/45 text-[11px] uppercase tracking-[0.16em] mb-2">YouTube Signal</p>
            <p className={`text-sm font-semibold ${hasYouTubeData ? 'text-emerald-300' : 'text-amber-300'}`}>
              {loadingStatus ? 'Checking...' : hasYouTubeData ? 'Connected and ready' : 'No YouTube data found yet'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-white/45 text-[11px] uppercase tracking-[0.16em] mb-2">Instagram Signal</p>
            <p className={`text-sm font-semibold ${latestImport ? 'text-cyan-300' : 'text-white/70'}`}>
              {loadingStatus ? 'Checking...' : latestImport ? `Latest: ${formatImportStatus(latestImport.status)}` : 'Not imported yet'}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Add Instagram Export (Optional)</h2>
            <p className="text-sm text-white/65 leading-relaxed">
              Export only the Instagram data you&apos;re comfortable sharing. We use this to improve introductions
              inside your McMaster network.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-white/70 leading-relaxed">
              <li>Open Instagram export and request your data in JSON format.</li>
              <li>Download the JSON file once Instagram emails it to you.</li>
              <li>Upload the JSON here or paste the contents below.</li>
            </ol>
            <p className="text-sm text-white/65 leading-relaxed">
              Need help exporting?{' '}
              <a
                href={INSTAGRAM_EXPORT_HELP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200"
              >
                Open official Instagram instructions ↗
              </a>
              {' · '}
              <a
                href={INSTAGRAM_EXPORT_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200"
              >
                Watch quick walkthrough ↗
              </a>
            </p>
          </div>

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
            {selectedFileName && <span className="text-white/50 text-xs">Selected: {selectedFileName}</span>}
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

          {!parsedPayload.empty && parsedPayload.error && <p className="text-rose-300 text-sm">{parsedPayload.error}</p>}

          {preview && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-white/45 text-[11px] uppercase tracking-[0.16em]">Top-level type</p>
                <p className="font-semibold text-white/90">{preview.topLevelType}</p>
              </div>
              <div>
                <p className="text-white/45 text-[11px] uppercase tracking-[0.16em]">Estimated records</p>
                <p className="font-semibold text-white/90">{preview.estimatedRecords}</p>
              </div>
              <div>
                <p className="text-white/45 text-[11px] uppercase tracking-[0.16em]">Payload size</p>
                <p className="font-semibold text-white/90">{preview.payloadChars.toLocaleString()} chars</p>
              </div>
            </div>
          )}

          {submitError && <p className="text-rose-300 text-sm">{submitError}</p>}
          {submitSuccess && <p className="text-emerald-300 text-sm">{submitSuccess}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleImport}
              className="px-5 py-3 rounded-lg text-sm font-bold uppercase tracking-[0.12em] disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PINK}, ${ACCENT_PURPLE})`,
              }}
            >
              {submitting ? 'Importing...' : 'Import Instagram Data'}
            </button>
            <button
              type="button"
              onClick={loadStatus}
              className="px-5 py-3 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-sm font-semibold transition-colors"
            >
              Refresh status
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
          <h2 className="text-lg font-bold">Latest Import Status</h2>
          {loadingStatus ? (
            <p className="text-white/50 text-sm">Loading status...</p>
          ) : latestImport ? (
            <>
              <p className="text-white/70 text-sm leading-relaxed">
                Status: <span className="font-semibold">{formatImportStatus(latestImport.status)}</span> · Imported on{' '}
                {new Date(latestImport.created_at).toLocaleString()}
              </p>
              {latestImport.payload_meta?.file_name && (
                <p className="text-white/50 text-xs">File: {latestImport.payload_meta.file_name}</p>
              )}
              {latestImport.extracted_signals && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-white/45 text-[11px] uppercase tracking-[0.16em]">Records</p>
                    <p className="font-semibold text-white/90">{latestImport.extracted_signals.estimated_records ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-white/45 text-[11px] uppercase tracking-[0.16em]">Top hashtag</p>
                    <p className="font-semibold text-white/90">
                      {latestImport.extracted_signals.top_hashtags?.[0]?.value
                        ? `#${latestImport.extracted_signals.top_hashtags[0].value}`
                        : 'None'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <p className="text-white/45 text-[11px] uppercase tracking-[0.16em]">Top keyword</p>
                    <p className="font-semibold text-white/90">
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
