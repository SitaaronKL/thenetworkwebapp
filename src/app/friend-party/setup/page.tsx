'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { YouTubeService } from '@/services/youtube';
import { ensureFriendPartyAttendance } from '@/lib/friend-party-attendance';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const BG_BLACK = '#000000';
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_CYAN = '#22d3ee';
const MCMASTER_SCHOOL = 'McMaster University';

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

function extractInstagramHandle(value: string | null | undefined) {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/$/, '');
}

function calculateAge(birthday: string) {
  const dob = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

function normalizeInstagramUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const handle = trimmed.replace(/^@/, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

export default function ProfileSetup() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    networks: MCMASTER_SCHOOL,
    birthday: '',
    work: '',
    instagram: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
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
        .select('age, working_on, instagram_url, networks')
        .eq('user_id', user.id)
        .maybeSingle();

      if (isFriendPartyProfileComplete(extras)) {
        router.replace('/friend-party/enrich');
        return;
      }

      const normalizedNetworks = normalizeNetworksWithMcMaster(extras?.networks);

      setFormData({
        networks: normalizedNetworks.join(', '),
        birthday: '',
        work: extras?.working_on || '',
        instagram: extractInstagramHandle(extras?.instagram_url),
      });

      setUserId(user.id);
      setIsCheckingAuth(false);

      await ensureFriendPartyAttendance('link');

      YouTubeService.syncYouTubeData(user.id).catch(() => {
        // Non-blocking by design.
      });

      fetch('/api/background-profile-enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
        body: JSON.stringify({
          user_id: user.id,
          trigger_source: 'FRIEND_PARTY_SETUP',
        }),
      }).catch(() => {
        // Non-blocking by design.
      });
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    const age = calculateAge(formData.birthday);
    if (age === null || age < 13 || age > 120) {
      setErrorMessage('Please provide a valid birth date.');
      setIsSaving(false);
      return;
    }

    const networks = formData.networks
      .split(',')
      .map((network) => network.trim())
      .filter((network) => network.length > 0);

    const normalizedNetworks = normalizeNetworksWithMcMaster(networks);
    const supabase = createClient();

    const { data: mcmasterSchool } = await supabase
      .from('schools')
      .select('id, name')
      .ilike('name', 'McMaster%')
      .limit(1)
      .maybeSingle();

    const { error: extrasError } = await supabase.from('user_profile_extras').upsert(
      {
        user_id: userId,
        age,
        networks: normalizedNetworks,
        college: MCMASTER_SCHOOL,
        working_on: formData.work.trim(),
        instagram_url: normalizeInstagramUrl(formData.instagram),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (extrasError) {
      setErrorMessage('Could not save your profile. Please try again.');
      setIsSaving(false);
      return;
    }

    const profileUpdate: Record<string, unknown> = {
      school: MCMASTER_SCHOOL,
    };

    if (mcmasterSchool?.id) {
      profileUpdate.school_id = mcmasterSchool.id;
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (profileUpdateError && mcmasterSchool?.id) {
      await supabase.from('profiles').update({ school: MCMASTER_SCHOOL }).eq('id', userId);
    }

    await ensureFriendPartyAttendance('link');
    router.push('/friend-party/enrich');
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
            radial-gradient(90rem 30rem at 10% 0%, rgba(168,85,247,0.16), transparent 55%),
            radial-gradient(70rem 28rem at 90% 100%, rgba(34,211,238,0.12), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))
          `,
        }}
      />

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-8 md:py-12" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <header className="flex items-center justify-between mb-8">
          <Link href="/friend-party" className="opacity-70 hover:opacity-100 transition-opacity">
            <img
              src={THE_NETWORK_SVG}
              alt="The Network"
              className="h-6 w-auto object-contain"
              style={{ filter: 'invert(1) brightness(2)' }}
            />
          </Link>
          <span className="text-[11px] px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.03] text-white/70">
            {MCMASTER_SCHOOL}
          </span>
        </header>

        <section className="mb-6">
          <p className="text-white/50 text-xs uppercase tracking-[0.18em] mb-3">Step 1 of 2</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">
            Set up your party profile
          </h1>
          <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-xl">
            Quick details so we can place you in the right context and produce better matches. This takes around
            two minutes.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Networks</span>
                <input
                  required
                  type="text"
                  placeholder="McMaster University, Toronto"
                  value={formData.networks}
                  onChange={(event) => setFormData({ ...formData, networks: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-400/60"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Date of Birth</span>
                <input
                  required
                  type="date"
                  value={formData.birthday}
                  onChange={(event) => setFormData({ ...formData, birthday: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400/60 [color-scheme:dark]"
                />
                <span className="mt-1.5 block text-[11px] text-white/35">Used for age band matching only.</span>
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Current Obsession</span>
              <input
                required
                type="text"
                placeholder="What are you currently into?"
                value={formData.work}
                onChange={(event) => setFormData({ ...formData, work: event.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400/60"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-3">
            <label className="block">
              <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">
                Instagram (Optional)
              </span>
              <div className="mt-2 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 text-sm">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={formData.instagram}
                  onChange={(event) => setFormData({ ...formData, instagram: event.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-3.5 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400/60"
                />
              </div>
            </label>
            <p className="text-[12px] text-white/45 leading-relaxed">
              You can skip this and continue. You&apos;ll get a dedicated enrichment step next where you can add deeper
              signals.
            </p>
          </section>

          {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 55%, ${ACCENT_CYAN} 100%)`,
            }}
          >
            {isSaving ? 'Saving Profile...' : 'Continue to Data Enrichment'}
          </button>
        </form>
      </main>
    </div>
  );
}
