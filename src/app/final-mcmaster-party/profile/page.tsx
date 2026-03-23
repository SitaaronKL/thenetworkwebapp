'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ensureFriendPartyAttendance } from '@/lib/friend-party-attendance';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg';
const BG_BLACK = '#000000';
const ACCENT_PINK = '#ff2d75';
const ACCENT_PURPLE = '#a855f7';
const ACCENT_CYAN = '#22d3ee';

const LOOKING_FOR_OPTIONS = [
  'Friends',
  'Study buddies',
  'Co-founders',
  'Mentors',
  'Collaborators',
  'Networking',
  'Dating',
  'Communities',
  'IRL activities',
];

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
];

type PassionItem = {
  id: string;
  title: string;
  url: string;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0);
}

function normalizeHandleForInput(value: unknown) {
  return asString(value).replace(/^@/, '').replace(/\.thenetwork$/i, '').trim();
}

function toDateInputValue(value: unknown) {
  const raw = asString(value).trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function computeAgeFromBirthday(value: string) {
  if (!value) return null;
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  if (age < 0) return null;
  return age;
}

function resolveAvatarUrl(rawPath: unknown) {
  const value = asString(rawPath).trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/profile-images/${value}`;
}

function parseInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNullableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const fromString = Number.parseInt(asString(value), 10);
  return Number.isNaN(fromString) ? null : fromString;
}

function uniqueItems(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

function parsePassions(value: unknown): PassionItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const title = asString(row.title).trim();
      const url = asString(row.url).trim();
      if (!title || !url) return null;
      return {
        id: asString(row.id).trim() || `row-${index}`,
        title,
        url,
      };
    })
    .filter((entry): entry is PassionItem => Boolean(entry));
}

function extractMissingColumn(message: string) {
  const patterns = [
    /column "([a-zA-Z0-9_]+)"/i,
    /column ([a-zA-Z0-9_]+) of relation/i,
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

async function upsertExtrasWithFallback(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
) {
  const mutablePayload: Record<string, unknown> = { ...payload };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabase.from('user_profile_extras').upsert(mutablePayload, { onConflict: 'user_id' });
    if (!error) return null;

    const missingColumn = extractMissingColumn(error.message || '');
    if (!missingColumn || !(missingColumn in mutablePayload)) {
      return error;
    }

    delete mutablePayload[missingColumn];
  }

  return { message: 'Could not save profile extras due to schema mismatch.' } as { message: string };
}

async function updateProfileWithFallback(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>
) {
  const mutablePayload: Record<string, unknown> = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('profiles').update(mutablePayload).eq('id', userId);
    if (!error) return null;

    const missingColumn = extractMissingColumn(error.message || '');
    if (!missingColumn || !(missingColumn in mutablePayload)) {
      return error;
    }

    delete mutablePayload[missingColumn];
  }

  return { message: 'Could not save profile due to schema mismatch.' } as { message: string };
}

const INPUT_CLASS =
  'mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-400/60';

export default function FriendPartyProfilePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [networkHandle, setNetworkHandle] = useState('');
  const [workingOn, setWorkingOn] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [hometown, setHometown] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [college, setCollege] = useState('');
  const [classYear, setClassYear] = useState('');
  const [highSchool, setHighSchool] = useState('');
  const [highSchoolGraduationYear, setHighSchoolGraduationYear] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [networkDraft, setNetworkDraft] = useState('');

  const [passions, setPassions] = useState<PassionItem[]>([]);
  const [passionTitleDraft, setPassionTitleDraft] = useState('');
  const [passionUrlDraft, setPassionUrlDraft] = useState('');
  const [storedAge, setStoredAge] = useState<number | null>(null);

  const computedAge = useMemo(() => computeAgeFromBirthday(birthday), [birthday]);
  const effectiveAge = birthday ? computedAge : storedAge;

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/friend-party');
        return;
      }

      if (!isActive) return;
      setUserId(user.id);

      await ensureFriendPartyAttendance('link');

      const [profileResult, extrasResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle<Record<string, unknown>>(),
        supabase
          .from('user_profile_extras')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle<Record<string, unknown>>(),
      ]);

      if (!isActive) return;

      const profile = profileResult.data;
      const extras = extrasResult.data;

      const metadataName = asString(user.user_metadata?.full_name || user.user_metadata?.name).trim();
      const profileName = asString(profile?.full_name).trim();
      setFullName(profileName || metadataName);
      setAvatarUrl(resolveAvatarUrl(profile?.avatar_url));

      const profileLocation = asString(profile?.location).trim();

      setNetworkHandle(normalizeHandleForInput(extras?.network_handle));
      setWorkingOn(asString(extras?.working_on));
      setBirthday(toDateInputValue(extras?.birthday));
      setStoredAge(parseNullableNumber(extras?.age));
      setGender(asString(extras?.gender).toLowerCase());
      setHometown(asString(extras?.hometown));
      setCurrentLocation(asString(extras?.current_location) || profileLocation);
      setContactEmail(asString(extras?.contact_email));
      setContactPhone(asString(extras?.contact_phone));
      setLinkedinUrl(asString(extras?.linkedin_url));
      setInstagramUrl(asString(extras?.instagram_url));
      setSchoolEmail(asString(extras?.school_email));
      setCollege(asString(extras?.college));
      setClassYear(asString(extras?.class_year));
      setHighSchool(asString(extras?.high_school));
      setHighSchoolGraduationYear(asString(extras?.high_school_graduation_year));
      setCompany(asString(extras?.company));
      setJobDescription(asString(extras?.job_description));

      setLookingFor(uniqueItems(asStringArray(extras?.looking_for)));
      setNetworks(uniqueItems(asStringArray(extras?.networks)));
      setPassions(parsePassions(extras?.passions));

      setIsLoading(false);
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  const toggleLookingFor = (value: string) => {
    setLookingFor((current) => {
      if (current.includes(value)) {
        return current.filter((entry) => entry !== value);
      }
      return [...current, value];
    });
  };

  const addNetwork = () => {
    const normalized = networkDraft.trim();
    if (!normalized) return;

    setNetworks((current) => {
      if (current.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
        return current;
      }
      if (current.length >= 8) {
        return current;
      }
      return [...current, normalized];
    });
    setNetworkDraft('');
  };

  const removeNetwork = (value: string) => {
    setNetworks((current) => current.filter((entry) => entry !== value));
  };

  const addPassion = () => {
    const title = passionTitleDraft.trim();
    const url = passionUrlDraft.trim();
    if (!title || !url) return;

    if (passions.length >= 5) return;

    const nextPassion: PassionItem = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      title,
      url,
    };

    setPassions((current) => [...current, nextPassion]);
    setPassionTitleDraft('');
    setPassionUrlDraft('');
  };

  const removePassion = (id: string) => {
    setPassions((current) => current.filter((entry) => entry.id !== id));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      setIsSaving(false);
      return;
    }

    if (birthday && computedAge === null) {
      setErrorMessage('Please enter a valid birthday.');
      setIsSaving(false);
      return;
    }

    if (effectiveAge !== null && (effectiveAge < 13 || effectiveAge > 120)) {
      setErrorMessage('Age must be between 13 and 120.');
      setIsSaving(false);
      return;
    }

    const supabase = createClient();
    const nowIso = new Date().toISOString();

    const normalizedHandle = networkHandle.replace(/^@/, '').replace(/\.thenetwork$/i, '').trim();
    const fullHandle = normalizedHandle ? `${normalizedHandle}.thenetwork` : null;

    const normalizedNetworks = uniqueItems(networks).slice(0, 8);
    const normalizedLookingFor = uniqueItems(lookingFor);
    const normalizedPassions = passions
      .map((passion) => ({
        id: passion.id,
        user_id: userId,
        title: passion.title.trim(),
        url: passion.url.trim(),
      }))
      .filter((passion) => passion.title.length > 0 && passion.url.length > 0)
      .slice(0, 5);

    const ageToPersist = birthday ? computedAge : storedAge;

    const profileError = await updateProfileWithFallback(supabase, userId, {
      full_name: fullName.trim(),
      location: currentLocation.trim() || null,
      updated_at: nowIso,
    });

    if (profileError) {
      setErrorMessage(`Could not save profile: ${profileError.message}`);
      setIsSaving(false);
      return;
    }

    const extrasPayload: Record<string, unknown> = {
      user_id: userId,
      network_handle: fullHandle,
      gender: gender || null,
      birthday: birthday || null,
      age: ageToPersist,
      hometown: hometown.trim() || null,
      current_location: currentLocation.trim() || null,
      working_on: workingOn.trim() || null,
      looking_for: normalizedLookingFor.length > 0 ? normalizedLookingFor : null,
      networks: normalizedNetworks,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      school_email: schoolEmail.trim() || null,
      college: college.trim() || null,
      class_year: parseInteger(classYear),
      high_school: highSchool.trim() || null,
      high_school_graduation_year: parseInteger(highSchoolGraduationYear),
      company: company.trim() || null,
      job_description: jobDescription.trim() || null,
      passions: normalizedPassions,
      updated_at: nowIso,
    };

    const extrasError = await upsertExtrasWithFallback(supabase, extrasPayload);
    if (extrasError) {
      setErrorMessage(`Could not save profile extras: ${extrasError.message}`);
      setIsSaving(false);
      return;
    }

    await ensureFriendPartyAttendance('link');
    setSuccessMessage('Profile details saved.');
    setIsSaving(false);
  };

  if (isLoading) {
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

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8 md:py-12 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/friend-party/dashboard" className="opacity-70 hover:opacity-100 transition-opacity">
            <img
              src={THE_NETWORK_SVG}
              alt="The Network"
              className="h-6 w-auto object-contain"
              style={{ filter: 'invert(1) brightness(2)' }}
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/friend-party/dashboard"
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs md:text-sm font-medium transition-colors"
            >
              Back to dashboard
            </Link>
            <Link
              href="/friend-party/enrich"
              className="px-3 py-2 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-xs md:text-sm font-medium transition-colors"
            >
              Enrich your data
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-2">Profile Details</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight">Add more details to your profile</h1>
          <p className="text-sm md:text-base text-white/65 mt-3 max-w-3xl leading-relaxed">
            This mirrors the mobile profile fields so your match and intro quality are consistent across web and app.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-14 h-14 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <span className="w-14 h-14 rounded-full border border-white/15 bg-white/[0.04] inline-flex items-center justify-center text-lg font-bold text-white/85">
                {fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : 'U'}
              </span>
            )}
            <div>
              <p className="text-white/90 font-semibold">{fullName || 'Your profile'}</p>
              <p className="text-xs text-white/45">Connected to `profiles` + `user_profile_extras`</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-5">
            <h2 className="text-sm uppercase tracking-[0.14em] text-white/50">Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Full Name</span>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Your full name"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Handle</span>
                <div className="mt-2 flex items-center rounded-xl border border-white/10 bg-black/40 px-3.5 py-3">
                  <span className="text-sm text-white/45 mr-1">@</span>
                  <input
                    type="text"
                    value={networkHandle}
                    onChange={(event) => setNetworkHandle(event.target.value)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
                    placeholder="yourname"
                  />
                  <span className="text-sm text-white/35 ml-1">.thenetwork</span>
                </div>
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">
                Bio / What you&apos;re working on
              </span>
              <textarea
                value={workingOn}
                onChange={(event) => setWorkingOn(event.target.value)}
                rows={3}
                className={`${INPUT_CLASS} resize-y`}
                placeholder="What are you currently focused on?"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Birthday</span>
                <input
                  type="date"
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                  className={`${INPUT_CLASS} [color-scheme:dark]`}
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Age</span>
                <div className={`${INPUT_CLASS} text-white/80`}>
                  {effectiveAge === null ? 'Not set' : String(effectiveAge)}
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Gender</span>
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className={INPUT_CLASS}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value || 'none'} value={option.value} className="bg-black text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-5">
            <h2 className="text-sm uppercase tracking-[0.14em] text-white/50">Location + Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Hometown</span>
                <input
                  type="text"
                  value={hometown}
                  onChange={(event) => setHometown(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="City, country"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">
                  Current Location
                </span>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(event) => setCurrentLocation(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="City, region"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">College</span>
                <input
                  type="text"
                  value={college}
                  onChange={(event) => setCollege(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="University name"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Class Year</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={classYear}
                  onChange={(event) => setClassYear(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="2027"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">
                  High School
                </span>
                <input
                  type="text"
                  value={highSchool}
                  onChange={(event) => setHighSchool(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="High school name"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">
                  High School Graduation Year
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={highSchoolGraduationYear}
                  onChange={(event) => setHighSchoolGraduationYear(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="2023"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Company</span>
                <input
                  type="text"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Current company"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Job Title</span>
                <input
                  type="text"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Role / title"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-5">
            <h2 className="text-sm uppercase tracking-[0.14em] text-white/50">Contact + Social</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Contact Email</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="you@email.com"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Phone</span>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="+1 ..."
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">LinkedIn URL</span>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(event) => setLinkedinUrl(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="https://linkedin.com/in/..."
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Instagram URL</span>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="https://instagram.com/..."
                />
              </label>
            </div>

            <label className="block max-w-md">
              <span className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">School Email</span>
              <input
                type="email"
                value={schoolEmail}
                onChange={(event) => setSchoolEmail(event.target.value)}
                className={INPUT_CLASS}
                placeholder="you@school.edu"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-5">
            <h2 className="text-sm uppercase tracking-[0.14em] text-white/50">Networks + Intent</h2>

            <div>
              <p className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Networks ({networks.length}/8)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {networks.map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => removeNetwork(network)}
                    className="px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] text-xs text-white/85 hover:bg-white/[0.08] transition-colors"
                    title="Remove"
                  >
                    {network} ×
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={networkDraft}
                  onChange={(event) => setNetworkDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addNetwork();
                    }
                  }}
                  className={`${INPUT_CLASS} mt-0`}
                  placeholder="Add a network (school, company, community)"
                />
                <button
                  type="button"
                  onClick={addNetwork}
                  className="px-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-white/55 uppercase tracking-[0.16em] font-semibold">Looking For</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LOOKING_FOR_OPTIONS.map((option) => {
                  const selected = lookingFor.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleLookingFor(option)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                        selected
                          ? 'border-fuchsia-300/60 bg-fuchsia-400/15 text-white'
                          : 'border-white/15 bg-white/[0.03] text-white/75 hover:bg-white/[0.08]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 space-y-5">
            <h2 className="text-sm uppercase tracking-[0.14em] text-white/50">Links ({passions.length}/5)</h2>
            {passions.length > 0 && (
              <div className="space-y-2">
                {passions.map((passion) => (
                  <div
                    key={passion.id}
                    className="rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/88 truncate">{passion.title}</p>
                      <p className="text-xs text-white/45 truncate">{passion.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePassion(passion.id)}
                      className="text-xs text-white/55 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {passions.length < 5 && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_auto] gap-2">
                <input
                  type="text"
                  value={passionTitleDraft}
                  onChange={(event) => setPassionTitleDraft(event.target.value)}
                  className={`${INPUT_CLASS} mt-0`}
                  placeholder="Title (e.g. Portfolio)"
                />
                <input
                  type="url"
                  value={passionUrlDraft}
                  onChange={(event) => setPassionUrlDraft(event.target.value)}
                  className={`${INPUT_CLASS} mt-0`}
                  placeholder="URL"
                />
                <button
                  type="button"
                  onClick={addPassion}
                  className="px-4 rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </section>

          {errorMessage && (
            <p className="text-sm text-rose-300 rounded-xl border border-rose-400/20 bg-rose-500/5 px-4 py-3">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-sm text-emerald-200 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] transition-all disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_PINK} 0%, ${ACCENT_PURPLE} 55%, ${ACCENT_CYAN} 100%)`,
            }}
          >
            {isSaving ? 'Saving profile...' : 'Save profile details'}
          </button>
        </form>
      </main>
    </div>
  );
}
