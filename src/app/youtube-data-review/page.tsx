'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

interface Subscription {
    user_id: string;
    channel_id: string;
    title: string;
    thumbnail_url: string | null;
}

interface LikedVideo {
    user_id: string;
    video_id: string;
    title: string;
    channel_title: string;
    thumbnail_url: string | null;
    published_at: string | null;
}

export default function YouTubeDataReviewPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [likedVideos, setLikedVideos] = useState<LikedVideo[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showRawSamples, setShowRawSamples] = useState<{ subscriptions: boolean; videos: boolean }>({
        subscriptions: false,
        videos: false
    });
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [interests, setInterests] = useState<string[]>([]);
    const [hierarchicalInterests, setHierarchicalInterests] = useState<any[]>([]);
    const [loadingInterests, setLoadingInterests] = useState(true);

    // Check feature flag
    const reviewEnabled = process.env.NEXT_PUBLIC_YT_REVIEW_ENABLED === 'true';
    
    useEffect(() => {
        if (!reviewEnabled) {
            router.push('/network');
            return;
        }

        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router, reviewEnabled]);

    useEffect(() => {
        if (!user || !reviewEnabled) return;

        const loadYouTubeData = async () => {
            const supabase = createClient();
            
            try {
                // Load subscriptions
                const { data: subsData, error: subsError } = await supabase
                    .from('youtube_subscriptions')
                    .select('user_id, channel_id, title, thumbnail_url')
                    .eq('user_id', user.id)
                    .order('title', { ascending: true });

                if (subsError) {
                    console.error('Error loading subscriptions:', subsError);
                } else {
                    setSubscriptions(subsData || []);
                }

                // Load liked videos
                const { data: videosData, error: videosError } = await supabase
                    .from('youtube_liked_videos')
                    .select('user_id, video_id, title, channel_title, thumbnail_url, published_at')
                    .eq('user_id', user.id)
                    .order('published_at', { ascending: false })
                    .limit(100); // Limit to first 100 for display

                if (videosError) {
                    console.error('Error loading liked videos:', videosError);
                } else {
                    setLikedVideos(videosData || []);
                }

                // Get last sync time (check if there's a sync timestamp - you might need to add this to your schema)
                // For now, we'll use the most recent video's published_at as a proxy
                if (videosData && videosData.length > 0) {
                    const mostRecent = videosData[0]?.published_at;
                    if (mostRecent) {
                        setLastSyncTime(new Date(mostRecent).toLocaleString());
                    }
                }

                // Load user interests
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('interests, hierarchical_interests')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    setInterests((profileData.interests as string[]) || []);
                    setHierarchicalInterests((profileData.hierarchical_interests as any[]) || []);
                }
            } catch (error) {
                console.error('Error loading YouTube data:', error);
            } finally {
                setLoadingData(false);
                setLoadingInterests(false);
            }
        };

        loadYouTubeData();
    }, [user, reviewEnabled]);

    // Generate sample raw API responses
    const getRawSubscriptionSample = () => {
        if (subscriptions.length === 0) return null;
        const sample = subscriptions[0];
        return {
            snippet: {
                title: sample.title,
                resourceId: {
                    channelId: sample.channel_id
                },
                thumbnails: {
                    default: {
                        url: sample.thumbnail_url || ''
                    }
                }
            }
        };
    };

    const getRawVideoSample = () => {
        if (likedVideos.length === 0) return null;
        const sample = likedVideos[0];
        return {
            snippet: {
                title: sample.title,
                channelTitle: sample.channel_title,
                resourceId: {
                    videoId: sample.video_id
                },
                thumbnails: {
                    default: {
                        url: sample.thumbnail_url || ''
                    }
                },
                publishedAt: sample.published_at
            }
        };
    };

    if (!reviewEnabled || loading || loadingData) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={styles.container}>
            {/* Disclaimer Banner */}
            <div className={styles.disclaimerBanner}>
                <div className={styles.disclaimerIcon}>⚠️</div>
                <div className={styles.disclaimerContent}>
                    <strong>For YouTube API Reviewers Only</strong>
                    <p>
                        This page is specifically created for YouTube API review purposes to demonstrate how we use the YouTube Read Only API data. 
                        This is not a standard user-facing feature and will be removed after API approval.
                    </p>
                </div>
            </div>

            <div className={styles.header}>
                <h1 className={styles.title}>YouTube Data Review</h1>
                <p className={styles.subtitle}>
                    This page shows the data we fetch from YouTube Read Only API and how we use it to derive interests and match users.
                </p>
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <h2 className={styles.summaryTitle}>Subscriptions</h2>
                    <p className={styles.summaryCount}>{subscriptions.length}</p>
                    <p className={styles.summaryLabel}>channels</p>
                </div>
                <div className={styles.summaryCard}>
                    <h2 className={styles.summaryTitle}>Liked Videos</h2>
                    <p className={styles.summaryCount}>{likedVideos.length}</p>
                    <p className={styles.summaryLabel}>videos (up to 800 fetched, displaying first 100)</p>
                </div>
                {lastSyncTime && (
                    <div className={styles.summaryCard}>
                        <h2 className={styles.summaryTitle}>Last Sync</h2>
                        <p className={styles.summaryCount}>{lastSyncTime}</p>
                    </div>
                )}
            </div>

            {/* Interest Derivation Section */}
            <div className={styles.interestSection}>
                <h2 className={styles.sectionTitle}>Interest Derivation Process</h2>
                <p className={styles.sectionDescription}>
                    We use AI to analyze your YouTube subscriptions and liked videos to discover your interests and create your Digital DNA profile.
                </p>

                <div className={styles.derivationCard}>
                    <h3 className={styles.derivationTitle}>Step 1: Data Preparation</h3>
                    <p className={styles.derivationText}>
                        We collect your channel subscriptions and liked videos, then format them as text inputs:
                    </p>
                    <div className={styles.codeExample}>
                        <pre className={styles.codeBlock}>
{`// Example input format:
[
  "channel: Veritasium",
  "channel: 3Blue1Brown",
  "liked: The Most Misunderstood Concept in Physics by Veritasium",
  "liked: But what is a Fourier series? by 3Blue1Brown",
  ...
]`}
                        </pre>
                    </div>
                </div>

                <div className={styles.derivationCard}>
                    <h3 className={styles.derivationTitle}>Step 2: AI Analysis</h3>
                    <p className={styles.derivationText}>
                        We send this data to an LLM with a structured prompt to analyze subscriptions and liked video titles:
                    </p>
                    <div className={styles.codeExample}>
                        <pre className={styles.codeBlock}>
{`Analyze subscriptions and liked video titles to discover the user's high-fidelity "Digital DNA".
You must surface exactly 20 generic interest categories, and for EACH category, 
include at least 3 very specific, niche tags.

Rules:
1. EXACTLY 20 categories in "hierarchical_interests"
2. Generic categories should be broad but descriptive 
   (e.g., "Software Engineering", "Aviation", "Philosophy")
3. Specific tags must be high-fidelity 
   (e.g., instead of "Coding", use "Rust Systems Programming" or "LLM Orchestration")
4. EXACTLY 4 archetypes that sum to roughly 100%
5. EXACTLY 3 doppelgängers (Famous figures who share these interests)

Inference Rules:
- Look for deep pattern matching from subscriptions and liked video titles
- Avoid generic filler tags
- Be specific and nuanced`}
                        </pre>
                    </div>
                </div>

                <div className={styles.derivationCard}>
                    <h3 className={styles.derivationTitle}>Step 3: Derived Interests</h3>
                    <p className={styles.derivationText}>
                        Based on your YouTube data, we've derived the following interests:
                    </p>
                    
                    {loadingInterests ? (
                        <div className={styles.loadingInterests}>Loading interests...</div>
                    ) : interests.length > 0 ? (
                        <div className={styles.interestsDisplay}>
                            <div className={styles.interestsList}>
                                {interests.map((interest, idx) => (
                                    <span key={idx} className={styles.interestTag}>
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className={styles.noInterests}>No interests derived yet. Interests are generated after YouTube data sync.</p>
                    )}

                    {hierarchicalInterests.length > 0 && (
                        <div className={styles.hierarchicalInterests}>
                            <h4 className={styles.hierarchicalTitle}>Hierarchical Interests (Categories with Specific Tags):</h4>
                            <div className={styles.hierarchicalList}>
                                {hierarchicalInterests.slice(0, 10).map((item: any, idx: number) => (
                                    <div key={idx} className={styles.hierarchicalItem}>
                                        <strong className={styles.categoryName}>{item.category || 'Unnamed Category'}:</strong>
                                        <div className={styles.tagsList}>
                                            {(item.tags || []).map((tag: string, tagIdx: number) => (
                                                <span key={tagIdx} className={styles.tag}>{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {hierarchicalInterests.length > 10 && (
                                <p className={styles.moreInterests}>
                                    ... and {hierarchicalInterests.length - 10} more categories
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Matching Explanation Section */}
            <div className={styles.matchingSection}>
                <h2 className={styles.sectionTitle}>How We Match You to People Using YouTube Data</h2>
                <p className={styles.sectionDescription}>
                    Your YouTube subscriptions and liked videos are used to create vector embeddings that enable intelligent matching with other users.
                </p>

                <div className={styles.matchingSteps}>
                    <div className={styles.matchingStep}>
                        <div className={styles.stepNumber}>1</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Create Vector Embeddings</h3>
                            <p className={styles.stepDescription}>
                                We convert your YouTube data (subscriptions + liked videos) into a 3072-dimensional vector using OpenAI's text-embedding-3-large model.
                            </p>
                            <div className={styles.exampleBox}>
                                <strong>Example:</strong>
                                <p>
                                    If you subscribe to "Veritasium" and "3Blue1Brown" and like science videos, 
                                    your vector will be positioned near other users who also engage with educational science content.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.matchingStep}>
                        <div className={styles.stepNumber}>2</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Calculate Similarity</h3>
                            <p className={styles.stepDescription}>
                                We use cosine similarity to compare your vector with other users' vectors. Higher similarity = better match.
                            </p>
                            <div className={styles.exampleBox}>
                                <strong>Example Calculation:</strong>
                                <div className={styles.calculationExample}>
                                    <code>
                                        similarity = cosine_similarity(your_vector, other_user_vector)
                                    </code>
                                    <p>Result: A score between 0 and 1, where:</p>
                                    <ul>
                                        <li>0.8-1.0 = Very high compatibility (shared deep interests)</li>
                                        <li>0.6-0.8 = High compatibility (many shared interests)</li>
                                        <li>0.4-0.6 = Moderate compatibility (some shared interests)</li>
                                        <li>0.0-0.4 = Low compatibility (few shared interests)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.matchingStep}>
                        <div className={styles.stepNumber}>3</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Match Based on Shared Interests</h3>
                            <p className={styles.stepDescription}>
                                We also match users based on shared interest tags derived from YouTube data.
                            </p>
                            <div className={styles.exampleBox}>
                                <strong>Example Matching Scenario:</strong>
                                <div className={styles.matchingExample}>
                                    <div className={styles.userExample}>
                                        <strong>You:</strong>
                                        <ul>
                                            <li>Subscribed to: Veritasium, 3Blue1Brown, Numberphile</li>
                                            <li>Likes: Physics videos, Math explanations</li>
                                            <li>Derived Interests: Physics, Mathematics, Science Education</li>
                                        </ul>
                                    </div>
                                    <div className={styles.matchArrow}>→ Matches with →</div>
                                    <div className={styles.userExample}>
                                        <strong>Another User:</strong>
                                        <ul>
                                            <li>Subscribed to: Physics Girl, MinutePhysics, Stand-up Maths</li>
                                            <li>Likes: Educational science content</li>
                                            <li>Derived Interests: Physics, Mathematics, Science Communication</li>
                                        </ul>
                                    </div>
                                    <div className={styles.matchResult}>
                                        <strong>Result:</strong> High compatibility (0.85 similarity) - Both users share deep interest in physics and mathematics education.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.matchingStep}>
                        <div className={styles.stepNumber}>4</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Rank and Recommend</h3>
                            <p className={styles.stepDescription}>
                                Users are ranked by similarity score, and the top matches are recommended to you in the app.
                            </p>
                            <div className={styles.exampleBox}>
                                <strong>What This Means:</strong>
                                <p>
                                    The more similar your YouTube viewing patterns are to another user's, 
                                    the higher they'll appear in your match recommendations. This helps you find people 
                                    who share your genuine interests and intellectual curiosity.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transformation Pipeline */}
            <div className={styles.pipelineSection}>
                <h2 className={styles.sectionTitle}>Complete Data Flow</h2>
                <div className={styles.pipeline}>
                    <div className={styles.pipelineStep}>
                        <div className={styles.stepNumber}>1</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Fetch Data</h3>
                            <p className={styles.stepDescription}>
                                We fetch your YouTube subscriptions and liked videos using the YouTube Read Only API.
                            </p>
                            <div className={styles.stepIO}>
                                <div className={styles.ioItem}>
                                    <strong>Input:</strong> YouTube API (youtube.readonly scope)
                                </div>
                                <div className={styles.ioItem}>
                                    <strong>Output:</strong> Subscriptions list, Liked videos list
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.pipelineArrow}>→</div>

                    <div className={styles.pipelineStep}>
                        <div className={styles.stepNumber}>2</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Extract Topics</h3>
                            <p className={styles.stepDescription}>
                                We analyze channel names and video titles to identify your interests and topics.
                            </p>
                            <div className={styles.stepIO}>
                                <div className={styles.ioItem}>
                                    <strong>Input:</strong> Channel titles + video titles
                                </div>
                                <div className={styles.ioItem}>
                                    <strong>Output:</strong> Interest keywords, Topic categories
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.pipelineArrow}>→</div>

                    <div className={styles.pipelineStep}>
                        <div className={styles.stepNumber}>3</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Build Interest Map</h3>
                            <p className={styles.stepDescription}>
                                We organize your interests into a hierarchical structure and create your interest profile.
                            </p>
                            <div className={styles.stepIO}>
                                <div className={styles.ioItem}>
                                    <strong>Input:</strong> Interest keywords, Topic categories
                                </div>
                                <div className={styles.ioItem}>
                                    <strong>Output:</strong> Hierarchical interests, Interest profile
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.pipelineArrow}>→</div>

                    <div className={styles.pipelineStep}>
                        <div className={styles.stepNumber}>4</div>
                        <div className={styles.stepContent}>
                            <h3 className={styles.stepTitle}>Compute Digital DNA</h3>
                            <p className={styles.stepDescription}>
                                We use your interests to compute your Digital DNA, which powers matching and recommendations.
                            </p>
                            <div className={styles.stepIO}>
                                <div className={styles.ioItem}>
                                    <strong>Input:</strong> Interest profile, Hierarchical interests
                                </div>
                                <div className={styles.ioItem}>
                                    <strong>Output:</strong> Digital DNA, Personality archetypes, Matching scores
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscriptions List */}
            <div className={styles.dataSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Your Subscriptions</h2>
                    <button
                        onClick={() => setShowRawSamples(prev => ({ ...prev, subscriptions: !prev.subscriptions }))}
                        className={styles.toggleButton}
                    >
                        {showRawSamples.subscriptions ? 'Hide' : 'Show'} Sample JSON
                    </button>
                </div>

                {showRawSamples.subscriptions && getRawSubscriptionSample() && (
                    <div className={styles.rawSample}>
                        <pre className={styles.jsonCode}>
                            {JSON.stringify(getRawSubscriptionSample(), null, 2)}
                        </pre>
                        <p className={styles.rawNote}>
                            Sample JSON is limited to the first 1-2 items and redacts fields we do not store. 
                            From the API response, we only store: channel_id, title, thumbnail_url (plus user_id and inserted_at for data association).
                        </p>
                    </div>
                )}

                <div className={styles.dataGrid}>
                    {subscriptions.map((sub) => (
                        <div key={`${sub.user_id}-${sub.channel_id}`} className={styles.dataItem}>
                            {sub.thumbnail_url && (
                                <div className={styles.thumbnail}>
                                    <Image
                                        src={sub.thumbnail_url}
                                        alt={sub.title}
                                        width={120}
                                        height={120}
                                        className={styles.thumbnailImage}
                                    />
                                </div>
                            )}
                            <div className={styles.dataContent}>
                                <h3 className={styles.dataTitle}>{sub.title}</h3>
                                <p className={styles.dataId}>Channel ID: {sub.channel_id}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Liked Videos List */}
            <div className={styles.dataSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Your Liked Videos</h2>
                    <button
                        onClick={() => setShowRawSamples(prev => ({ ...prev, videos: !prev.videos }))}
                        className={styles.toggleButton}
                    >
                        {showRawSamples.videos ? 'Hide' : 'Show'} Sample JSON
                    </button>
                </div>

                {showRawSamples.videos && getRawVideoSample() && (
                    <div className={styles.rawSample}>
                        <pre className={styles.jsonCode}>
                            {JSON.stringify(getRawVideoSample(), null, 2)}
                        </pre>
                        <p className={styles.rawNote}>
                            Sample JSON is limited to the first 1-2 items and redacts fields we do not store. 
                            From the API response, we only store: video_id, title, channel_title, thumbnail_url, published_at (plus user_id and inserted_at for data association).
                        </p>
                    </div>
                )}

                <div className={styles.dataGrid}>
                    {likedVideos.map((video) => (
                        <div key={`${video.user_id}-${video.video_id}`} className={styles.dataItem}>
                            {video.thumbnail_url && (
                                <div className={styles.thumbnail}>
                                    <Image
                                        src={video.thumbnail_url}
                                        alt={video.title}
                                        width={120}
                                        height={120}
                                        className={styles.thumbnailImage}
                                    />
                                </div>
                            )}
                            <div className={styles.dataContent}>
                                <h3 className={styles.dataTitle}>{video.title}</h3>
                                <p className={styles.dataChannel}>{video.channel_title}</p>
                                <p className={styles.dataId}>Video ID: {video.video_id}</p>
                                {video.published_at && (
                                    <p className={styles.dataDate}>
                                        {new Date(video.published_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Actions */}
            <div className={styles.footer}>
                <Link href="/network" className={styles.backButton}>
                    ← Back to Home
                </Link>
                <p className={styles.footerNote}>
                    This page is for YouTube API review purposes. You can access it anytime from Settings.
                </p>
            </div>
        </div>
    );
}

