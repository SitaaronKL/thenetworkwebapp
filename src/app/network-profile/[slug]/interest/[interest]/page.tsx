'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import parentStyles from '../../../page.module.css';
import styles from './page.module.css';

const getAvatarUrl = (path?: string | null) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return undefined;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${path}`;
};

interface ProfileInfo {
    id: string;
    full_name: string;
    avatar_url?: string | null;
}

interface Post {
    id: string;
    user_id: string;
    interest: string;
    body: string;
    created_at: string;
}

export default function InterestFeedPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const slug = (params?.slug as string) || '';
    const interestParam = (params?.interest as string) || '';

    const [resolveStatus, setResolveStatus] = useState<'idle' | 'resolving' | 'ok' | 'not_found'>('idle');
    const [profileUserId, setProfileUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileInfo | null>(null);
    const [sharedNetwork, setSharedNetwork] = useState<boolean | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [composerBody, setComposerBody] = useState('');
    const [posting, setPosting] = useState(false);

    const interest = decodeURIComponent(interestParam);
    const isOwnProfile = !!user && profileUserId === user.id;

    // Resolve slug -> user_id
    useEffect(() => {
        if (!slug) return;
        if (slug === 'me') {
            if (user) {
                setProfileUserId(user.id);
                setResolveStatus('ok');
            }
            return;
        }
        setResolveStatus('resolving');
        const supabase = createClient();
        supabase.rpc('resolve_profile_slug', { p_slug: slug }).then(({ data, error }) => {
            if (error) {
                setResolveStatus('not_found');
                return;
            }
            if (data) {
                setProfileUserId(data);
                setResolveStatus('ok');
            } else {
                setResolveStatus('not_found');
            }
        });
    }, [slug, user]);

    // Auth redirect
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const fetchProfile = useCallback(async (uid: string) => {
        const supabase = createClient();
        const { data: p } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', uid)
            .single();
        if (p) setProfile(p);
    }, []);

    const fetchPosts = useCallback(async (uid: string) => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('interest_feed_posts')
            .select('id, user_id, interest, body, created_at')
            .eq('user_id', uid)
            .eq('interest', interest)
            .order('created_at', { ascending: false });
        if (!error) setPosts(data || []);
    }, [interest]);

    const checkSharedNetwork = useCallback(async (uid: string) => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('users_share_network', { p_other_user_id: uid });
        if (!error && typeof data === 'boolean') setSharedNetwork(data);
        else setSharedNetwork(false);
    }, []);

    // Load profile, shared-network check, and posts when we have profileUserId
    useEffect(() => {
        if (!profileUserId || resolveStatus !== 'ok') return;
        setLoading(true);
        const supabase = createClient();

        (async () => {
            await fetchProfile(profileUserId);
            // Only need to check shared network when viewing someone else
            if (profileUserId !== user?.id) {
                await checkSharedNetwork(profileUserId);
            } else {
                setSharedNetwork(true); // own profile: always “allowed”
            }
            await fetchPosts(profileUserId);
        })().finally(() => setLoading(false));
    }, [profileUserId, resolveStatus, user?.id, fetchProfile, fetchPosts, checkSharedNetwork]);

    const handlePost = async () => {
        if (!user || !profileUserId || profileUserId !== user.id || !composerBody.trim() || posting) return;
        setPosting(true);
        const supabase = createClient();
        const { error } = await supabase.from('interest_feed_posts').insert({
            user_id: user.id,
            interest,
            body: composerBody.trim(),
        });
        if (!error) {
            setComposerBody('');
            await fetchPosts(profileUserId);
        }
        setPosting(false);
    };

    if (authLoading || resolveStatus === 'resolving' || resolveStatus === 'idle') {
        return (
            <div className={parentStyles.wrapper}>
                <Menu />
                <div className={parentStyles.loadingContainer}>
                    <div className={parentStyles.loader} />
                </div>
            </div>
        );
    }

    if (resolveStatus === 'not_found' || !slug) {
        return (
            <div className={parentStyles.wrapper}>
                <Menu />
                <div className={parentStyles.loadingContainer}>
                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>Profile not found.</p>
                    <Link href="/network-profile/me" style={{ color: '#fff', marginTop: 16 }}>
                        Back to your profile
                    </Link>
                </div>
            </div>
        );
    }

    const profileUrl = `/network-profile/${slug}`;
    const canSeeFeed = sharedNetwork === true;
    const showComposer = isOwnProfile && canSeeFeed;

    return (
        <div className={parentStyles.wrapper}>
            <Menu />
            <div style={{ padding: '80px 24px 100px', maxWidth: 720, margin: '0 auto' }}>
                <Link href={profileUrl} className={styles.backLink}>
                    ← Back to profile
                </Link>

                <div className={styles.feedHeader}>
                    <h1 className={styles.feedTitle}>
                        {profile ? (
                            <>
                                {profile.full_name}&apos;s {interest} feed
                            </>
                        ) : (
                            <>{interest} feed</>
                        )}
                    </h1>
                </div>

                {loading ? (
                    <div className={parentStyles.loadingContainer} style={{ minHeight: 120 }}>
                        <div className={parentStyles.loader} />
                    </div>
                ) : !canSeeFeed ? (
                    <div className={styles.gateCard}>
                        <p className={styles.gateMessage}>
                            You and {profile?.full_name || 'this user'} aren’t in any shared networks yet, so you can’t see their {interest} feed.
                        </p>
                        <p className={styles.gateSub}>
                            Add overlapping networks (school, company, community, etc.) on your profiles to view each other’s interest feeds.
                        </p>
                    </div>
                ) : (
                    <div className={styles.feedContainer}>
                        {showComposer && (
                            <div className={styles.composer}>
                                <label className={styles.composerLabel}>Post a thought about {interest}</label>
                                <textarea
                                    className={styles.composerTextarea}
                                    placeholder="e.g. Has anyone watched Air Crash Investigation? I'm a pilot — if you're in NY, happy to take you for a ride."
                                    value={composerBody}
                                    onChange={(e) => setComposerBody(e.target.value)}
                                    maxLength={2000}
                                />
                                <button
                                    className={styles.postButton}
                                    onClick={handlePost}
                                    disabled={!composerBody.trim() || posting}
                                >
                                    {posting ? 'Posting…' : 'Post'}
                                </button>
                            </div>
                        )}

                        {posts.length === 0 ? (
                            <p className={styles.emptyFeed}>
                                {isOwnProfile
                                    ? `No posts yet. Share a thought about ${interest}!`
                                    : `No posts in this feed yet.`}
                            </p>
                        ) : (
                            <div className={styles.feedList}>
                                {posts.map((p) => (
                                    <article key={p.id} className={styles.feedPost}>
                                        <div className={styles.feedPostMeta}>
                                            {profile?.avatar_url ? (
                                                <img
                                                    src={getAvatarUrl(profile.avatar_url) || ''}
                                                    alt=""
                                                    className={styles.feedPostAvatar}
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className={styles.feedPostAvatarPlaceholder}>
                                                    {(profile?.full_name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <span className={styles.feedPostAuthor}>{profile?.full_name || 'Unknown'}</span>
                                                <span className={styles.feedPostTime}>
                                                    {' · '}
                                                    {new Date(p.created_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.feedPostBody}>{p.body}</div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
