'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/NFe9vnxN';
const DEEP_LINK_SCHEME = 'thenetwork://';

interface ProfileInfo {
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[] | null;
}

export default function ProfileDeepLinkPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [triedDeepLink, setTriedDeepLink] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // 1. Try to open the app via deep link
    const deepLink = `${DEEP_LINK_SCHEME}profile/${userId}`;
    
    // Use a hidden iframe to attempt the deep link without navigating away
    const timeout = setTimeout(() => {
      // If we're still here after 1.5s, the app didn't open → show the landing page
      setTriedDeepLink(true);
    }, 1500);

    // Try window.location for the deep link
    window.location.href = deepLink;

    return () => clearTimeout(timeout);
  }, [userId]);

  // 2. Fetch profile info for the landing page
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, bio, interests')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          // Build public avatar URL if needed
          let avatarUrl = data.avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            const { data: urlData } = supabase.storage
              .from('profile-images')
              .getPublicUrl(avatarUrl);
            avatarUrl = urlData?.publicUrl ?? null;
          }
          setProfile({
            full_name: data.full_name || 'TheNetwork User',
            avatar_url: avatarUrl,
            bio: data.bio,
            interests: data.interests,
          });
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Show loading while deep link redirect is being attempted
  if (!triedDeepLink) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Opening TheNetwork...</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || 'Someone';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <img
          src="/favicon.png"
          alt="TheNetwork"
          style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 16 }}
        />

        {/* Profile Info */}
        {loading ? (
          <div style={styles.spinner} />
        ) : (
          <>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                style={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div style={styles.avatarFallback}>
                <span style={{ fontSize: 28, fontWeight: 600, color: '#fff' }}>
                  {initials}
                </span>
              </div>
            )}

            <h1 style={styles.name}>{displayName}</h1>

            {profile?.bio && (
              <p style={styles.bio}>{profile.bio}</p>
            )}

            {profile?.interests && profile.interests.length > 0 && (
              <div style={styles.interests}>
                {profile.interests.slice(0, 6).map((interest, i) => (
                  <span key={i} style={styles.interestChip}>
                    {interest}
                  </span>
                ))}
                {profile.interests.length > 6 && (
                  <span style={styles.interestChip}>
                    +{profile.interests.length - 6} more
                  </span>
                )}
              </div>
            )}
          </>
        )}

        <p style={styles.subtitle}>
          {displayName} invited you to connect on TheNetwork
        </p>

        {/* Open in App button (try deep link again) */}
        <button
          onClick={() => {
            window.location.href = `${DEEP_LINK_SCHEME}profile/${userId}`;
          }}
          style={styles.primaryButton}
        >
          Open in App
        </button>

        {/* Download on TestFlight */}
        <a
          href={TESTFLIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.secondaryButton}
        >
          Download on TestFlight
        </a>

        <p style={styles.footerText}>
          TheNetwork — The shortest path to the right people
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#000000',
    padding: 20,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    padding: '40px 24px',
    borderRadius: 24,
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid rgba(255,255,255,0.15)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '2px solid rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    border: '2px solid rgba(255,255,255,0.2)',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 4px 0',
    textAlign: 'center' as const,
  },
  bio: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    margin: '4px 0 12px 0',
    textAlign: 'center' as const,
    lineHeight: 1.4,
  },
  interests: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  interestChip: {
    padding: '4px 10px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: 500,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    margin: '16px 0 24px 0',
    textAlign: 'center' as const,
  },
  primaryButton: {
    width: '100%',
    padding: '14px 0',
    borderRadius: 12,
    border: 'none',
    background: '#fff',
    color: '#000',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 12,
  },
  secondaryButton: {
    display: 'block',
    width: '100%',
    padding: '14px 0',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 24,
  },
};
